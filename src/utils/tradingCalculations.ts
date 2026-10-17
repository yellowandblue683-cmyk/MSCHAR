import { Trade, AppState, ATRTier } from '../types';
import {
  ATR_TIERS,
  TICK_VALUE,
  COMMISSION_PER_CONTRACT,
  CH2_MAX_TRADES,
  CH2_WIN_LOCK,
  CH2_LOSS_STREAK_LOCK,
  WEEKDAYS_HE
} from '../data/constants';

export function pad2(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayKey(): string {
  return dateKey(Date.now());
}

export function offsetDateKey(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return dateKey(d.getTime());
}

export function fmtMoney(v: number): string {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  return `${sign}$${abs.toFixed(2)}`;
}

export function fmtShortMoney(v: number): string {
  const sign = v < 0 ? '-' : v > 0 ? '+' : '';
  const abs = Math.abs(v);
  const formatted = abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2);
  return `${sign}$${formatted}`;
}

export function fmtTimeFromTs(ts: number): string {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function fmtDateHe(dk: string): string {
  const parts = dk.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export interface WeekSummaryData {
  startDate: string;
  endDate: string;
  trades: Trade[];
  count: number;
  net: number;
  gross: number;
  commission: number;
  wins: number;
  losses: number;
  winRate: number;
  greenDays: number;
  redDays: number;
}

export function getWeekSummaryForDate(state: AppState, year: number, month: number, day: number, account = 'ALL'): WeekSummaryData {
  const targetDate = new Date(year, month, day);
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 6 = Sat
  
  // Start of week: Sunday
  const sunday = new Date(targetDate);
  sunday.setDate(targetDate.getDate() - dayOfWeek);
  sunday.setHours(0, 0, 0, 0);

  // End of week: Saturday
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  saturday.setHours(23, 59, 59, 999);

  const startTs = sunday.getTime();
  const endTs = saturday.getTime();

  const weekTrades = state.trades.filter(t => {
    if (account !== 'ALL' && t.account !== account) return false;
    return t.ts >= startTs && t.ts <= endTs;
  });

  const net = weekTrades.reduce((s, t) => s + t.netPnl, 0);
  const gross = weekTrades.reduce((s, t) => s + t.grossPnl, 0);
  const commission = weekTrades.reduce((s, t) => s + t.commission, 0);
  const wins = weekTrades.filter(t => t.outcome === 'WIN').length;
  const losses = weekTrades.filter(t => t.outcome === 'LOSE').length;
  const count = weekTrades.length;
  const winRate = count ? (wins / count) * 100 : 0;

  const daysNet: Record<string, number> = {};
  weekTrades.forEach(t => {
    const dk = dateKey(t.ts);
    daysNet[dk] = (daysNet[dk] || 0) + t.netPnl;
  });
  const greenDays = Object.values(daysNet).filter(v => v > 0).length;
  const redDays = Object.values(daysNet).filter(v => v < 0).length;

  return {
    startDate: dateKey(startTs),
    endDate: dateKey(endTs),
    trades: weekTrades,
    count,
    net,
    gross,
    commission,
    wins,
    losses,
    winRate,
    greenDays,
    redDays
  };
}

export function entryDateLabel(offset: number, withTag = false): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const weekday = WEEKDAYS_HE[d.getDay()];
  const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  let tag = '';
  if (withTag) {
    if (offset === 0) tag = ' (היום)';
    else if (offset === 1) tag = ' (אתמול)';
  }
  return `${weekday} · ${dateStr}${tag}`;
}

export function chapterOf(t: Trade): number {
  return t.chapter === 2 ? 2 : 1;
}

export function tradesFor(state: AppState, account: string): Trade[] {
  if (account === 'ALL') return state.trades.slice();
  return state.trades.filter(t => t.account === account);
}

export function statsTradesFor(state: AppState, account: string): Trade[] {
  return tradesFor(state, account).filter(t => !t.breakeven);
}

export function getAccountDayTrades(state: AppState, account: string, dkey: string): Trade[] {
  return state.trades
    .filter(t => t.account === account && dateKey(t.ts) === dkey)
    .sort((a, b) => a.ts - b.ts);
}

export function getAccountDayTradesCh2(state: AppState, account: string, dkey: string): Trade[] {
  return getAccountDayTrades(state, account, dkey).filter(t => !t.breakeven && chapterOf(t) === 2);
}

export function getBlockStatusV2(state: AppState, account: string, dkey: string) {
  const trades = getAccountDayTradesCh2(state, account, dkey);
  const n = trades.length;
  const wins = trades.filter(t => t.outcome === 'WIN').length;
  const losses = n - wins;
  const consecLossLock = n >= CH2_LOSS_STREAK_LOCK && trades[n - 1].outcome === 'LOSE' && trades[n - 2].outcome === 'LOSE';
  const winLock = wins >= CH2_WIN_LOCK;
  const capLock = n >= CH2_MAX_TRADES;
  const locked = consecLossLock || winLock || capLock;
  const lockReason = consecLossLock ? 'losses' : winLock ? 'wins' : capLock ? 'cap' : null;
  return { trades, wins, losses, locked, lockReason, slotsUsed: n };
}

export function getDailyLossLocked(state: AppState, account: string, dkey: string): boolean {
  const trades = getAccountDayTrades(state, account, dkey);
  const sum = trades.reduce((s, t) => s + t.netPnl, 0);
  return sum <= -Math.abs(state.maxDailyLoss);
}

export function getEntryStatusV2(state: AppState, account: string, dkey: string) {
  const block = getBlockStatusV2(state, account, dkey);
  const dailyLossLocked = getDailyLossLocked(state, account, dkey);
  const dayNet = block.trades.reduce((s, t) => s + t.netPnl, 0);
  const dayGross = block.trades.reduce((s, t) => s + t.grossPnl, 0);
  const dayCommission = block.trades.reduce((s, t) => s + t.commission, 0);
  return {
    block,
    dailyLossLocked,
    blocked: block.locked || dailyLossLocked,
    dayNet,
    dayGross,
    dayCommission,
    dayWins: block.wins,
    dayLosses: block.losses,
    dayTotal: block.slotsUsed
  };
}

export function computeTradeFinancials(tierKey: string, outcome: 'WIN' | 'LOSE', contracts: number) {
  const tier = ATR_TIERS[tierKey] || ATR_TIERS.t2;
  const ticks = outcome === 'WIN' ? tier.tp : -tier.sl;
  const gross = ticks * contracts * TICK_VALUE;
  const commission = contracts * COMMISSION_PER_CONTRACT;
  const net = gross - commission;
  return { gross, commission, net };
}
