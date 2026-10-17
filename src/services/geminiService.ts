import { AppState, AIMessage, CustomStatMetric } from '../types';
import { statsTradesFor, getEntryStatusV2, dateKey, todayKey, fmtMoney } from '../utils/tradingCalculations';
import { API_KEY_STORAGE } from '../data/constants';

export function getStoredUserApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setStoredUserApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem(API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  } catch {}
}

export async function verifyGeminiApiKey(apiKey?: string): Promise<{ valid: boolean; message: string; isCustom?: boolean }> {
  const key = (apiKey !== undefined ? apiKey : getStoredUserApiKey()).trim();
  const endpoints = ['/api/gemini/verify-key', '/api/verify-key', '/api/gemini/verify'];
  let lastMessage = '';

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(key ? { 'x-gemini-api-key': key } : {})
        },
        body: JSON.stringify({ apiKey: key })
      });

      if (res.ok) {
        return await res.json();
      }
      const data = await res.json().catch(() => null);
      lastMessage = data?.message || data?.error || `HTTP ${res.status}`;
      if (res.status !== 404) {
        break; // Stop retrying if not 404
      }
    } catch (err: any) {
      lastMessage = err?.message || 'שגיאת תקשורת';
    }
  }

  return {
    valid: false,
    message: lastMessage || 'שגיאה באימות מפתח ה-API מול השרת'
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

  throw new Error(lastError || 'לא ניתן היה לקבל תשובה מהשרת');
}
