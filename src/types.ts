export interface Trade {
  id: string;
  account: string;
  direction: 'LONG' | 'SHORT';
  chapter?: number; // 1 = legacy ATR tier blocks, 2 = new 4-trade blocks
  tier?: string | null; // e.g. 't1', 't2', 't3', 't4'
  vwap?: boolean;
  contracts: number;
  outcome: 'WIN' | 'LOSE' | 'BE';
  breakeven?: boolean;
  grossPnl: number;
  commission: number;
  netPnl: number;
  rr?: string | null;
  ts: number;
}

export interface JournalEntry {
  id: string;
  ts: number;
  text: string;
}

export interface DayNote {
  rule1?: boolean | 'yes' | 'no' | null;
  rule2?: boolean | 'yes' | 'no' | null;
  rule3?: boolean | 'yes' | 'no' | null;
  mental?: number | null; // 1-5 rating
  perf?: number | null;   // 1-5 rating
  entries: JournalEntry[];
}

export interface CustomStatMetric {
  id: string;
  label: string;
  value: string;
  category?: 'target' | 'rule' | 'metric' | 'note';
  color?: string; // 'pos' | 'neg' | 'neu' | 'amber' | 'cyan';
  updatedAt: number;
  description?: string;
}

export interface AppState {
  accounts: string[];
  trades: Trade[];
  maxDailyLoss: number;
  selectedAccount: string; // 'ALL' or specific account
  activeTab: 'entry' | 'analytics' | 'calendar' | 'ai' | 'ancient';
  entryDateOffset: number;
  formAccount: string | null;
  formDirection: 'LONG' | 'SHORT';
  formTier?: string;
  formContracts: number | null;
  formOutcome: 'WIN' | 'LOSE';
  formCustomGross: number | null;
  formRR: string;
  formTime: string;
  calYear?: number;
  calMonth?: number;
  dayNotes: Record<string, DayNote>;
  theme: 'black' | 'white' | 'gray' | 'maroon' | 'darkgreen' | 'darkblue' | 'navy';
  font: 'rubik' | 'heebo' | 'assistant' | 'varela';
  chartType?: 'candle' | 'line';
  chartGroup?: 'trade' | 'day';
  chartShowMA?: boolean;
  beDirection?: 'LONG' | 'SHORT';
  beContracts?: number | null;
  beTime?: string;
  beAccount?: string | null;
  atrRanges: Record<string, string>;
  formVwap: boolean;
  dashboardEditMode: boolean;
  widgetOrder?: Record<string, string[]>;
  widgetLabels: Record<string, string>;
  widgetHidden?: Record<string, boolean>;
  userApiKey?: string;
  customMetrics?: CustomStatMetric[];
  selectedAIModel?: string;
  enableWebSearch?: boolean;
}

export interface ATRTier {
  key: string;
  label: string;
  range: string;
  contracts: number;
  sl: number;
  tp: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  modelUsed?: string;
  isFallback?: boolean;
}
