import { AppState, AIMessage, CustomStatMetric } from '../types';
import { statsTradesFor, getEntryStatusV2, dateKey, todayKey, fmtMoney } from '../utils/tradingCalculations';
import { API_KEY_STORAGE } from '../data/constants';

// Helper to sanitize API keys from user input (strips spaces, quotes, Bearer prefix)
export function sanitizeApiKey(k: string | null | undefined): string {
  if (!k || typeof k !== 'string') return '';
  return k.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '').trim();
}

export function getStoredUserApiKey(): string {
  try {
    const raw = localStorage.getItem(API_KEY_STORAGE) || '';
    return sanitizeApiKey(raw);
  } catch {
    return '';
  }
}

export function setStoredUserApiKey(key: string): void {
  try {
    const clean = sanitizeApiKey(key);
    if (clean) {
      localStorage.setItem(API_KEY_STORAGE, clean);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  } catch {}
}

/**
 * Verifies a Gemini API key.
 * Tries server verification endpoint first; if server returns 404 or fails,
 * performs bulletproof client-side verification directly against Google's API.
 */
export async function verifyGeminiApiKey(apiKey?: string): Promise<{ valid: boolean; message: string; isCustom?: boolean }> {
  const rawKey = apiKey !== undefined ? apiKey : getStoredUserApiKey();
  const cleanKey = sanitizeApiKey(rawKey);

  // If testing empty key, we are verifying the server/system key
  const endpoints = ['/api/gemini/verify-key', '/api/verify-key', '/api/gemini/verify', '/api/verify'];
  let serverMessage = '';

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cleanKey ? { 'x-gemini-api-key': cleanKey } : {})
        },
        body: JSON.stringify({ apiKey: cleanKey })
      });

      if (res.ok) {
        const data = await res.json();
        return {
          valid: !!data.valid,
          message: data.message || (data.valid ? 'המפתח תקין ומחובר בהצלחה!' : 'מפתח ה-API אינו תקין.'),
          isCustom: !!cleanKey
        };
      }

      const data = await res.json().catch(() => null);
      serverMessage = data?.message || data?.error || '';
      if (res.status !== 404) {
        break;
      }
    } catch (err: any) {
      serverMessage = err?.message || '';
    }
  }

  // If server check failed with 404 or network issue AND a custom key was provided:
  // Fall back to direct client-side verification against Google's Generative Language API
  if (cleanKey) {
    try {
      const directUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}&pageSize=1`;
      const directRes = await fetch(directUrl);
      const directData = await directRes.json().catch(() => null);

      if (directRes.ok && directData?.models) {
        return {
          valid: true,
          isCustom: true,
          message: 'מפתח API אישי אומת ישירות מול Google וחובר בהצלחה לצ׳אט!'
        };
      }

      if (directData?.error?.message) {
        const gErr = directData.error.message;
        if (gErr.includes('API_KEY_INVALID') || gErr.includes('API key not valid')) {
          return {
            valid: false,
            message: 'מפתח ה-API אינו תקין. ודא שהעתקת מפתח מלא מ-Google AI Studio (המתחיל ב-AIzaSy).'
          };
        }
        if (gErr.includes('PERMISSION_DENIED')) {
          return {
            valid: false,
            message: 'הרשאה נדחתה. ודא שה-API של Gemini פתוח ופעיל בפרויקט שלך.'
          };
        }
        if (gErr.includes('429') || gErr.includes('RESOURCE_EXHAUSTED')) {
          return {
            valid: true,
            isCustom: true,
            message: 'המפתח תקין ומחובר! (נמצא כרגע במגבלת מכסה זמנית של גוגל)'
          };
        }
      }
    } catch (clientErr) {
      console.warn('Direct Google verify fallback failed:', clientErr);
    }
  }

  return {
    valid: false,
    message: serverMessage && !serverMessage.includes('404')
      ? serverMessage
      : 'לא ניתן היה לאמת את המפתח מול שרתי Google. ודא שהמפתח תקין ומתחיל ב-AIzaSy.'
  };
}

export function buildTradingContext(state: AppState) {
  const currentAcc = state.selectedAccount === 'ALL' ? (state.accounts[0] || 'תיק ברירת מחדל') : state.selectedAccount;
  const currentStatus = getEntryStatusV2(state, currentAcc, todayKey());
  const allStatsTrades = statsTradesFor(state, state.selectedAccount);

  const wins = allStatsTrades.filter(t => t.outcome === 'WIN');
  const losses = allStatsTrades.filter(t => t.outcome === 'LOSE');
  const netPnl = allStatsTrades.reduce((s, t) => s + t.netPnl, 0);
  const totalCommission = allStatsTrades.reduce((s, t) => s + t.commission, 0);
  const winRate = allStatsTrades.length ? (wins.length / allStatsTrades.length) * 100 : 0;

  // Chapter 2 breakdown
  const ch2Trades = allStatsTrades.filter(t => t.chapter === 2);
  const ch2Wins = ch2Trades.filter(t => t.outcome === 'WIN');
  const ch2Losses = ch2Trades.filter(t => t.outcome === 'LOSE');
  const ch2Net = ch2Trades.reduce((s, t) => s + t.netPnl, 0);
  const ch2VwapCompliant = ch2Trades.filter(t => t.vwap).length;

  // Long vs Short
  const longs = allStatsTrades.filter(t => t.direction === 'LONG');
  const shorts = allStatsTrades.filter(t => t.direction === 'SHORT');
  const longWins = longs.filter(t => t.outcome === 'WIN').length;
  const shortWins = shorts.filter(t => t.outcome === 'WIN').length;

  // Recent 20 trades
  const recentTrades = state.trades.slice(-20).reverse().map(t => ({
    id: t.id,
    date: dateKey(t.ts),
    time: new Date(t.ts).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
    account: t.account,
    direction: t.direction,
    chapter: t.chapter || 1,
    contracts: t.contracts,
    outcome: t.breakeven ? 'ברייק איוון (עמלה בלבד)' : t.outcome,
    netPnl: fmtMoney(t.netPnl),
    vwap: t.chapter === 2 ? (t.vwap ? 'תואם' : 'לא תואם') : undefined,
    rr: t.rr ? `1:${t.rr}` : undefined
  }));

  // Journal entries summary
  const journalSummary = Object.keys(state.dayNotes || {}).slice(-7).map(dk => {
    const j = state.dayNotes[dk];
    return {
      date: dk,
      rule1NoOverLosses: j.rule1,
      rule2MinRR: j.rule2,
      rule3NoSizeIncrease: j.rule3,
      mentalRating: j.mental,
      tradeQualityRating: j.perf,
      entriesCount: j.entries ? j.entries.length : 0,
      recentNotes: j.entries ? j.entries.map(e => e.text).slice(-3) : []
    };
  });

  return {
    accounts: state.accounts,
    selectedAccountScope: state.selectedAccount,
    maxDailyLossLimit: state.maxDailyLoss,
    customMetrics: state.customMetrics || [],
    generalStats: {
      totalTrades: allStatsTrades.length,
      netPnl: fmtMoney(netPnl),
      totalCommission: fmtMoney(totalCommission),
      winRatePct: winRate.toFixed(1) + '%',
      winsCount: wins.length,
      lossesCount: losses.length,
      longPerformance: `${longWins}/${longs.length} (${longs.length ? ((longWins/longs.length)*100).toFixed(0) : 0}%)`,
      shortPerformance: `${shortWins}/${shorts.length} (${shorts.length ? ((shortWins/shorts.length)*100).toFixed(0) : 0}%)`
    },
    chapter2MethodStats: {
      tradesCount: ch2Trades.length,
      netPnl: fmtMoney(ch2Net),
      wins: ch2Wins.length,
      losses: ch2Losses.length,
      winRatePct: ch2Trades.length ? ((ch2Wins.length/ch2Trades.length)*100).toFixed(1) + '%' : '0%',
      vwapComplianceRatio: `${ch2VwapCompliant}/${ch2Trades.length}`
    },
    todaySession: {
      account: currentAcc,
      dayNet: fmtMoney(currentStatus.dayNet),
      dayWins: currentStatus.dayWins,
      dayLosses: currentStatus.dayLosses,
      slotsUsed: currentStatus.block.slotsUsed,
      isBlockedToday: currentStatus.blocked,
      blockLockReason: currentStatus.block.lockReason || 'none'
    },
    recentTrades,
    recentJournals: journalSummary
  };
}

export interface StatActionPayload {
  label: string;
  value: string;
  category?: 'target' | 'rule' | 'metric' | 'note';
  description?: string;
}

export function extractStatAction(text: string): { cleanedText: string; action: StatActionPayload | null } {
  const match = text.match(/```stat_action\s*([\s\S]*?)\s*```/);
  if (!match) return { cleanedText: text, action: null };

  try {
    const parsed = JSON.parse(match[1]);
    if (parsed && parsed.label && parsed.value) {
      const cleaned = text.replace(/```stat_action\s*[\s\S]*?\s*```/, '').trim();
      return { cleanedText: cleaned, action: parsed };
    }
  } catch (e) {
    console.warn('Failed to parse stat_action JSON:', e);
  }
  return { cleanedText: text, action: null };
}

export async function sendAIMessage(
  message: string,
  history: AIMessage[],
  state: AppState,
  options?: { model?: string; enableWebSearch?: boolean }
): Promise<{ text: string; modelUsed: string; isFallback: boolean; fallbackReason?: string; webSearchUsed?: boolean }> {
  const customKey = getStoredUserApiKey();
  const tradingContext = buildTradingContext(state);

  const formattedHistory = history.map(h => ({
    role: h.role,
    text: h.text
  }));

  const payload = {
    message,
    history: formattedHistory,
    tradingContext,
    model: options?.model || state.selectedAIModel || 'auto',
    enableWebSearch: options?.enableWebSearch !== undefined ? options.enableWebSearch : (state.enableWebSearch !== false),
    apiKey: customKey || undefined
  };

  const endpoints = ['/api/gemini/chat', '/api/chat'];
  let lastError = '';

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customKey ? { 'x-gemini-api-key': customKey } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        return {
          text: data.text,
          modelUsed: data.modelUsed || 'gemini-3.1-flash-lite',
          isFallback: !!data.isFallback,
          fallbackReason: data.fallbackReason,
          webSearchUsed: data.webSearchUsed
        };
      }

      const data = await res.json().catch(() => null);
      lastError = data?.error || `Server Error ${res.status}`;
      if (res.status !== 404) {
        break;
      }
    } catch (e: any) {
      lastError = e?.message || 'שגיאת תקשורת';
    }
  }

  // Direct client-side Gemini fallback if server returned 404 and custom key is present
  if (customKey) {
    try {
      const modelToUse = options?.model && options.model !== 'auto' ? options.model : 'gemini-3.1-flash-lite';
      const directUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${customKey}`;

      const contents = [
        {
          role: 'user',
          parts: [{ text: `נתוני יומן המסחר:\n${JSON.stringify(tradingContext)}\n\nהודעת הסוחר:\n${message}` }]
        }
      ];

      const directRes = await fetch(directUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents })
      });

      if (directRes.ok) {
        const directData = await directRes.json();
        const replyText = directData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return {
            text: replyText,
            modelUsed: modelToUse,
            isFallback: true,
            fallbackReason: 'חיבור ישיר באמצעות מפתח ה-API האישי שלך',
            webSearchUsed: false
          };
        }
      }
    } catch (directErr) {
      console.warn('Direct client Gemini chat fallback failed:', directErr);
    }
  }

  throw new Error(lastError || 'לא ניתן היה לקבל תשובה משרת ה-AI. בדוק את המפתח שלך ונסה שנית.');
}
