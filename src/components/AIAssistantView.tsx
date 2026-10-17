import React, { useState, useEffect, useRef } from 'react';
import { AppState, AIMessage, CustomStatMetric } from '../types';
import {
  sendAIMessage,
  getStoredUserApiKey,
  setStoredUserApiKey,
  verifyGeminiApiKey,
  extractStatAction,
  StatActionPayload
} from '../services/geminiService';
import {
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BrainCircuit,
  RefreshCw,
  Trash2,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  PlusCircle,
  ExternalLink,
  Check,
  Key
} from 'lucide-react';
import { fmtMoney, todayKey } from '../utils/tradingCalculations';

interface AIAssistantViewProps {
  state: AppState;
  onOpenSettings: () => void;
  onUpdateState: (patch: Partial<AppState>) => void;
}

const AVAILABLE_MODELS = [
  { id: 'auto', name: 'אוטומטי חכם (מענה מהיר ועמיד בעומסים)', badge: 'מומלץ', desc: 'משתמש ב-Gemini 3.1 Flash Lite ועובר לגיבוי בעומס' },
  { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', badge: 'בזק', desc: 'מהיר ביותר (שנייה אחת), אמין ויציב מאוד' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', badge: 'הכי חדש', desc: 'מודל הדגל החדש ביותר של Google' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite Latest', badge: 'יציב', desc: 'גרסה עדכנית של מודל פלאש לייט' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', badge: 'מתקדם', desc: 'מודל מתקדם לניתוח מסחר ועסקאות' }
];

export const AIAssistantView: React.FC<AIAssistantViewProps> = ({ state, onOpenSettings, onUpdateState }) => {
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      const saved = localStorage.getItem('ttj_ai_chat_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'welcome',
        role: 'model',
        text: 'שלום! אני עוזר ה-AI ומנהל הסיכונים האישי שלך למסחר ב-NQ ו-MNQ.\nאני מחובר בזמן אמת לכל העסקאות, החשבונות, הבלוקים והסטטיסטיקות שלך, ומחובר לרשת למידע חי.\nתוכל לבחור ידנית איזה מודל גמיני יפעל, לשאול על השוק, ולבקש ממני להגדיר ולמלא עבורך ערכים ויעדים בסטטיסטיקה!',
        timestamp: Date.now(),
        modelUsed: 'gemini-3.1-flash-lite'
      }
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Model & Network controls
  const [selectedModel, setSelectedModel] = useState<string>(() => state.selectedAIModel || 'auto');
  const [enableWebSearch, setEnableWebSearch] = useState<boolean>(() => state.enableWebSearch !== false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  // API Key management
  const [showKeyCard, setShowKeyCard] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getStoredUserApiKey());
  const [keyStatus, setKeyStatus] = useState<{ testing: boolean; message: string; valid: boolean | null }>({
    testing: false,
    message: '',
    valid: null
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem('ttj_ai_chat_history', JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelPicker(false);
    onUpdateState({ selectedAIModel: modelId });
  };

  const handleToggleWebSearch = () => {
    const nextVal = !enableWebSearch;
    setEnableWebSearch(nextVal);
    onUpdateState({ enableWebSearch: nextVal });
  };

  const handleTestKey = async (keyToTest?: string) => {
    const val = keyToTest !== undefined ? keyToTest : apiKeyInput.trim();
    setKeyStatus({ testing: true, message: 'בודק חיבור מול שרתי Google...', valid: null });
    const res = await verifyGeminiApiKey(val || undefined);
    setKeyStatus({ testing: false, message: res.message, valid: res.valid });
  };

  const handleSaveKey = () => {
    const trimmed = apiKeyInput.trim();
    setStoredUserApiKey(trimmed);
    handleTestKey(trimmed);
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    setError(null);
    const userMsg: AIMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now()
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await sendAIMessage(textToSend, newHistory.slice(-8), state, {
        model: selectedModel,
        enableWebSearch
      });

      const modelMsg: AIMessage = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: response.text,
        timestamp: Date.now(),
        modelUsed: response.modelUsed,
        isFallback: response.isFallback
      };
      setMessages([...newHistory, modelMsg]);
    } catch (err: any) {
      setError(err?.message || 'שגיאה בקבלת תשובה מעוזר ה-AI');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyStatAction = (action: StatActionPayload, msgId: string) => {
    const currentMetrics: CustomStatMetric[] = state.customMetrics ? [...state.customMetrics] : [];
    const existingIndex = currentMetrics.findIndex(m => m.label.trim() === action.label.trim());

    const newMetric: CustomStatMetric = {
      id: existingIndex >= 0 ? currentMetrics[existingIndex].id : `cm_${Date.now()}`,
      label: action.label,
      value: action.value,
      category: action.category || 'target',
      description: action.description || 'הוגדר בעזרת עוזר המסחר',
      color: action.category === 'rule' ? 'neg' : action.category === 'target' ? 'pos' : 'cyan',
      updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
      currentMetrics[existingIndex] = newMetric;
    } else {
      currentMetrics.push(newMetric);
    }

    onUpdateState({ customMetrics: currentMetrics });
    setAppliedActions(prev => ({ ...prev, [msgId]: true }));
  };

  const clearChat = () => {
    const initialMsg: AIMessage = {
      id: `w_${Date.now()}`,
      role: 'model',
      text: 'השיחה אופסה. כל נתוני היומן, העסקאות והסטטיסטיקות שלך עדיין טעונים בזיכרון המלא שלי. במה תרצה שנתמקד?',
      timestamp: Date.now(),
      modelUsed: selectedModel === 'auto' ? 'gemini-3.1-flash-lite' : selectedModel
    };
    setMessages([initialMsg]);
    setAppliedActions({});
    try {
      localStorage.removeItem('ttj_ai_chat_history');
    } catch {}
  };

  const quickPrompts = [
    '📊 עזור לי להגדיר יעדים ומדדים לסטטיסטיקה',
    '🌐 מה מצב השוק והחדשות הכלכליות להיום?',
    'סכם לי את ביצועי היום ואיפה טעיתי',
    'מה הפגם הכי בולט בפסיכולוגיית המסחר שלי?',
    'האם אני סוחר טוב יותר בלונג או בשורט?',
    'נתח את השפעת ה-VWAP על אחוז ההצלחה שלי'
  ];

  const totalTradesCount = state.trades.length;
  const currentModelObj = AVAILABLE_MODELS.find(m => m.id === selectedModel) || {
    id: selectedModel,
    name: selectedModel,
    badge: 'מותאם',
    desc: 'מודל מותאם אישית'
  };

  const customKeyStored = getStoredUserApiKey();

  return (
    <div className="flex flex-col h-[calc(100vh-145px)] pb-1">
      {/* Top Controls & Status Bar */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-3 mb-2 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1f7dd1]/20 to-[#2be3a0]/20 border border-[var(--border)] flex items-center justify-center text-[var(--long)]">
              <BrainCircuit size={18} />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-1.5">
                <span>עוזר בינה מלאכותית ומנהל סיכונים</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--profit-dim)] text-[var(--profit)] font-mono font-bold">
                  זיכרון ({totalTradesCount} עסקאות)
                </span>
              </div>
              <div className="text-[10.5px] text-[var(--text-faint)] flex items-center gap-1.5 mt-0.5">
                <span>מודל: <b className="text-[var(--text)]">{currentModelObj.name}</b></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* API Key Drawer Launcher */}
            <button
              type="button"
              onClick={() => setShowKeyCard(!showKeyCard)}
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition ${
                customKeyStored
                  ? 'border-[var(--profit)] text-[var(--profit)] bg-[var(--profit-dim)]'
                  : 'border-[var(--border)] text-[var(--text-dim)] bg-[var(--panel2)] hover:text-[var(--text)]'
              }`}
              title="חיבור מפתח API אישי או מערכת"
            >
              <Key size={13} className="text-amber-400" />
              <span>{customKeyStored ? 'מפתח אישי מחובר' : 'חיבור מפתח'}</span>
            </button>

            <button
              type="button"
              onClick={clearChat}
              title="נקה שיחה"
              className="w-7 h-7 rounded-lg bg-[var(--panel2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--loss)] transition"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* API Key Modal / Card if opened */}
        {showKeyCard && (
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-2xl p-3.5 space-y-2.5 shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-soft)]">
              <div className="text-xs font-extrabold text-[var(--text)] flex items-center gap-1.5">
                <Key size={14} className="text-amber-400" />
                <span>חיבור מפתח API לצ׳אט ולמודלי Gemini</span>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyCard(false)}
                className="text-xs text-[var(--text-faint)] hover:text-[var(--text)] px-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
              הצ׳אט פועל ישירות עם שרתי Google. תוכל להשתמש במפתח המערכת המובנה (השאר ריק), או להזין כאן את מפתח ה-API האישי שלך מ-Google AI Studio:
            </p>

            <div className="flex gap-2">
              <input
                type="password"
                placeholder="הדבק כאן מפתח (AIzaSy...)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex-1 bg-[var(--panel3)] border border-[var(--border-soft)] focus:border-[var(--long)] rounded-xl px-3 py-2 text-xs text-[var(--text)] font-mono outline-none"
              />
              <button
                type="button"
                onClick={handleSaveKey}
                disabled={keyStatus.testing}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black font-extrabold text-xs hover:opacity-95 shadow-md flex items-center gap-1"
              >
                {keyStatus.testing ? <RefreshCw size={13} className="animate-spin" /> : 'שמור וחבר'}
              </button>
            </div>

            {apiKeyInput && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setApiKeyInput('');
                    setStoredUserApiKey('');
                    setKeyStatus({ testing: false, message: 'חזרת לשימוש במפתח המערכת המובנה', valid: true });
                  }}
                  className="text-[10px] text-amber-400 hover:underline font-bold"
                >
                  נקה מפתח אישי וחזור למפתח מערכת מובנה
                </button>
              </div>
            )}

            {keyStatus.message && (
              <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                keyStatus.valid
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                  : 'bg-red-950/40 text-red-300 border border-red-800/40'
              }`}>
                {keyStatus.valid ? (
                  <CheckCircle2 size={15} className="text-[var(--profit)] flex-none" />
                ) : (
                  <AlertCircle size={15} className="text-[var(--loss)] flex-none" />
                )}
                <span className="leading-snug">{keyStatus.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Model Selection & Web Connection Row */}
        <div className="flex items-center gap-2 pt-1 border-t border-[var(--border-soft)]">
          {/* Model Picker Dropdown Button */}
          <div className="relative flex-1">
            <button
              type="button"
              onClick={() => setShowModelPicker(!showModelPicker)}
              className="w-full flex items-center justify-between gap-1.5 bg-[var(--panel2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-right hover:border-[var(--long)] transition"
            >
              <div className="flex items-center gap-1.5 truncate">
                <SlidersHorizontal size={13} className="text-[var(--long)] flex-none" />
                <span className="truncate text-[var(--text)] font-semibold">{currentModelObj.name}</span>
                <span className="text-[9.5px] px-1 rounded bg-[var(--panel3)] text-[var(--text-faint)] flex-none">
                  {currentModelObj.badge}
                </span>
              </div>
              <ChevronDown size={13} className={`text-[var(--text-faint)] flex-none transition-transform ${showModelPicker ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showModelPicker && (
              <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 bg-[var(--panel3)] border border-[var(--border)] rounded-2xl p-1.5 shadow-2xl animate-in fade-in space-y-1">
                <div className="text-[10px] text-[var(--text-faint)] px-2.5 py-1 font-bold">בחר מודל שפה לעבודה:</div>
                {AVAILABLE_MODELS.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleSelectModel(m.id)}
                    className={`w-full text-right p-2 rounded-xl text-xs transition flex items-center justify-between ${
                      selectedModel === m.id
                        ? 'bg-[var(--long-dim)] text-[var(--long)] font-bold border border-[var(--long)]/30'
                        : 'text-[var(--text)] hover:bg-[var(--panel2)]'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-[10px] text-[var(--text-faint)] font-normal">{m.desc}</div>
                    </div>
                    {selectedModel === m.id && <Check size={14} className="text-[var(--long)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Web Connection Toggle Button */}
          <button
            type="button"
            onClick={handleToggleWebSearch}
            className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition flex-none ${
              enableWebSearch
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                : 'bg-[var(--panel2)] border-[var(--border)] text-[var(--text-faint)]'
            }`}
            title={enableWebSearch ? 'חיבור לרשת פעיל (Google Search חי)' : 'חיבור לרשת כבוי'}
          >
            <Globe size={13} className={enableWebSearch ? 'text-blue-400 animate-pulse' : ''} />
            <span>{enableWebSearch ? 'רשת: מחובר' : 'רשת: כבוי'}</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Carousel */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-2 no-scrollbar">
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(p)}
            disabled={loading}
            className="flex-none bg-[var(--panel)] border border-[var(--border-soft)] hover:border-[var(--long)] text-[var(--text-dim)] hover:text-[var(--text)] text-[11px] font-semibold px-2.5 py-1.5 rounded-xl transition whitespace-nowrap active:scale-95"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 space-y-3">
        {messages.map(m => {
          const isUser = m.role === 'user';
          const { cleanedText, action } = !isUser ? extractStatAction(m.text) : { cleanedText: m.text, action: null };
          const isApplied = !!appliedActions[m.id];

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-start' : 'items-end'}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed break-words ${
                  isUser
                    ? 'bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-[#04140f] font-semibold rounded-br-sm text-right'
                    : 'bg-[var(--panel)] border border-[var(--border-soft)] text-[var(--text)] rounded-bl-sm text-right shadow-sm'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-soft)] pb-1 mb-1.5 text-[10px] text-[var(--text-faint)]">
                    <span className="flex items-center gap-1 font-bold text-[var(--long)]">
                      <Bot size={12} /> מנטור המסחר
                    </span>
                    <div className="flex items-center gap-1 font-mono text-[9px]">
                      {m.modelUsed && (
                        <span className={`px-1 py-0.5 rounded ${m.isFallback ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--panel3)]'}`}>
                          {m.modelUsed} {m.isFallback ? '⚡ חלופי' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{cleanedText}</div>

                {/* Interactive Stat Action Box if present */}
                {action && (
                  <div className="mt-3 p-3 rounded-xl bg-[var(--panel2)] border border-emerald-500/40 text-right space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <Sparkles size={13} />
                        העוזר מציע נתון לעדכון בסטטיסטיקה
                      </span>
                      <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--panel3)] text-[var(--text-faint)]">
                        {action.category === 'target' ? 'יעד' : action.category === 'rule' ? 'חוק' : 'מדד'}
                      </span>
                    </div>

                    <div className="bg-[var(--panel3)] rounded-lg p-2.5 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-[var(--text)]">{action.label}</div>
                        {action.description && (
                          <div className="text-[9.5px] text-[var(--text-faint)]">{action.description}</div>
                        )}
                      </div>
                      <div className="font-mono text-base font-extrabold text-[var(--profit)]">
                        {action.value}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApplyStatAction(action, m.id)}
                        disabled={isApplied}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition ${
                          isApplied
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black hover:opacity-95 shadow-md'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>עודכן בסטטיסטיקה בהצלחה!</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={14} />
                            <span>החל בסטטיסטיקה עכשיו</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onUpdateState({ activeTab: 'analytics' })}
                        className="py-2 px-2.5 rounded-xl bg-[var(--panel3)] border border-[var(--border-soft)] text-[var(--text-dim)] hover:text-[var(--text)] text-[11px] font-bold flex items-center gap-1 transition"
                        title="צפה בסטטיסטיקה"
                      >
                        <span>צפה</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-[var(--text-faint)] mt-1 px-1 font-mono">
                {new Date(m.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex flex-col items-end">
            <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl rounded-bl-sm px-4 py-3 text-xs text-[var(--text-dim)] flex items-center gap-2 shadow-sm">
              <RefreshCw size={14} className="animate-spin text-[var(--long)]" />
              <span>העוזר מעבד את נתוני המסחר, היומן {enableWebSearch ? 'והמידע מהרשת' : ''}...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle size={16} className="flex-none text-[var(--loss)]" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="mt-2 flex items-center gap-2 bg-[var(--panel)] border border-[var(--border-soft)] focus-within:border-[var(--long)] rounded-2xl p-1.5 transition shadow-lg"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="שאל כל דבר או בקש למלא נתונים בסטטיסטיקה..."
          disabled={loading}
          className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:opacity-90 transition flex-none shadow-sm"
        >
          <Send size={14} className="rotate-180" />
        </button>
      </form>
    </div>
  );
};
