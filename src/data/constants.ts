import { ATRTier, AppState } from '../types';

export const TICK_VALUE = 0.5;
export const COMMISSION_PER_CONTRACT = 1.65; // NinjaTrader micro, full round-trip
export const STORAGE_KEY = 'ttj_state_v2';
export const API_KEY_STORAGE = 'ttj_gemini_api_key';

export const DEFAULT_ACCOUNTS = ['APEX-25K-01', 'APEX-25K-02', 'TOPSTEP-50K', 'PERSONAL-NQ'];
export const DEFAULT_MAX_DAILY_LOSS = 300;
export const DEFAULT_THEME: 'navy' = 'navy';
export const DEFAULT_FONT: 'rubik' = 'rubik';

export const THEMES = [
  { key: 'navy', label: 'Navy Dark' },
  { key: 'gray', label: 'Dark Gray' },
  { key: 'maroon', label: 'Maroon' },
  { key: 'darkgreen', label: 'Dark Green' },
  { key: 'darkblue', label: 'Midnight Blue' },
  { key: 'white', label: 'Light Clean' }
] as const;

export const FONTS = [
  { key: 'rubik', label: 'Rubik (ברירת מחדל)' },
  { key: 'heebo', label: 'Heebo' },
  { key: 'assistant', label: 'Assistant' },
  { key: 'varela', label: 'Varela Round' }
] as const;

export const ATR_TIERS: Record<string, ATRTier> = {
  t1: { key: 't1', label: '0–10', range: '0-10', contracts: 4, sl: 27, tp: 81 },
  t2: { key: 't2', label: '10–20', range: '10-20', contracts: 2, sl: 45, tp: 133 },
  t3: { key: 't3', label: '20–30', range: '20-30', contracts: 1, sl: 70, tp: 180 },
  t4: { key: 't4', label: '30–50', range: '30-50', contracts: 1, sl: 96, tp: 285 }
};

export const TIER_ORDER = ['t1', 't2', 't3', 't4'];
export const ACCT_COLORS = ['#3fb6ff', '#b98bff', '#20dc93', '#f4d03f', '#ff8a5c', '#ff4d6a'];
export const WEEKDAYS_HE = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
export const DOW_HE = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
export const MONTH_HE = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

export const CH2_MAX_TRADES = 4;
export const CH2_WIN_LOCK = 2;
export const CH2_LOSS_STREAK_LOCK = 2;

export function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

export function nowTimeStr(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function defaultState(): AppState {
  return {
    accounts: DEFAULT_ACCOUNTS.slice(),
    trades: [],
    maxDailyLoss: DEFAULT_MAX_DAILY_LOSS,
    selectedAccount: 'ALL',
    activeTab: 'entry',
    entryDateOffset: 0,
    formAccount: DEFAULT_ACCOUNTS[0],
    formDirection: 'LONG',
    formTier: 't2',
    formContracts: 1,
    formOutcome: 'WIN',
    formCustomGross: null,
    formRR: '2',
    formTime: nowTimeStr(),
    dayNotes: {},
    theme: 'navy',
    font: 'rubik',
    atrRanges: {},
    formVwap: true,
    dashboardEditMode: false,
    widgetLabels: {}
  };
}
