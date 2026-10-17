import React, { useState } from 'react';
import { AppState, CustomStatMetric } from '../types';
import { statsTradesFor, fmtMoney, chapterOf, dateKey, fmtDateHe } from '../utils/tradingCalculations';
import { ATR_TIERS, TIER_ORDER, ACCT_COLORS } from '../data/constants';
import { TradingChartSection } from './TradingChartSection';
import {
  History,
  Edit2,
  Plus,
  Trash2,
  Target,
  ShieldAlert,
  BarChart3,
  Sparkles,
  X,
  Check,
  TrendingUp,
  Clock,
  CandlestickChart as CandleIcon,
  SlidersHorizontal
} from 'lucide-react';

interface AnalyticsViewProps {
  state: AppState;
  onOpenHistory: () => void;
  onUpdateState: (patch: Partial<AppState>) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ state, onOpenHistory, onUpdateState }) => {
  const trades = statsTradesFor(state, state.selectedAccount);

  // Sub-tab: 'chart' (גרפים ונרות) or 'metrics' (מדדים ויעדים)
  const [activeSubTab, setActiveSubTab] = useState<'chart' | 'metrics'>('chart');

  // Modal for adding / editing custom metrics
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<CustomStatMetric | null>(null);
  const [formLabel, setFormLabel] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formCategory, setFormCategory] = useState<'target' | 'rule' | 'metric' | 'note'>('target');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState<string>('pos');

  const customMetrics: CustomStatMetric[] = state.customMetrics || [];

  const handleOpenAddModal = () => {
    setEditingMetric(null);
    setFormLabel('');
    setFormValue('');
    setFormCategory('target');
    setFormDescription('');
    setFormColor('pos');
    setModalOpen(true);
  };

  const handleOpenEditModal = (m: CustomStatMetric) => {
    setEditingMetric(m);
    setFormLabel(m.label);
    setFormValue(m.value);
    setFormCategory(m.category || 'target');
    setFormDescription(m.description || '');
    setFormColor(m.color || 'pos');
    setModalOpen(true);
  };

  const handleSaveMetric = () => {
    if (!formLabel.trim() || !formValue.trim()) return;

    const list = [...customMetrics];
    if (editingMetric) {
      const idx = list.findIndex(x => x.id === editingMetric.id);
      if (idx >= 0) {
        list[idx] = {
          ...editingMetric,
          label: formLabel.trim(),
          value: formValue.trim(),
          category: formCategory,
          description: formDescription.trim(),
          color: formColor,
          updatedAt: Date.now()
        };
      }
    } else {
      list.push({
        id: `cm_${Date.now()}`,
        label: formLabel.trim(),
        value: formValue.trim(),
        category: formCategory,
        description: formDescription.trim(),
        color: formColor,
        updatedAt: Date.now()
      });
    }

    onUpdateState({ customMetrics: list });
    setModalOpen(false);
  };

  const handleDeleteMetric = (id: string) => {
    const list = customMetrics.filter(x => x.id !== id);
    onUpdateState({ customMetrics: list });
  };

  const handleAskAIForStats = () => {
    onUpdateState({ activeTab: 'ai' });
  };

  const netPnl = trades.reduce((s, t) => s + t.netPnl, 0);
  const totalCommission = trades.reduce((s, t) => s + t.commission, 0);
  const wins = trades.filter(t => t.outcome === 'WIN');
  const losses = trades.filter(t => t.outcome === 'LOSE');
  const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
  const grossProfit = wins.reduce((s, t) => s + t.netPnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.netPnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? -grossLoss / losses.length : 0;
  const riskReward = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : avgWin > 0 ? Infinity : 0;

  // Chronological streaks
  const sortedTrades = trades.slice().sort((a, b) => a.ts - b.ts);
  let maxWinStreak = 0, maxLossStreak = 0, curWin = 0, curLoss = 0;
  sortedTrades.forEach(t => {
    if (t.outcome === 'WIN') {
      curWin++;
      curLoss = 0;
      if (curWin > maxWinStreak) maxWinStreak = curWin;
    } else {
      curLoss++;
      curWin = 0;
      if (curLoss > maxLossStreak) maxLossStreak = curLoss;
    }
  });

  // Chapter 2 breakdown
  const ch2Trades = trades.filter(t => chapterOf(t) === 2);
  const ch2Wins = ch2Trades.filter(t => t.outcome === 'WIN');
  const ch2Losses = ch2Trades.filter(t => t.outcome === 'LOSE');
  const ch2Net = ch2Trades.reduce((s, t) => s + t.netPnl, 0);
  const ch2WinRate = ch2Trades.length ? (ch2Wins.length / ch2Trades.length) * 100 : 0;

  const byDayCh2: Record<string, number> = {};
  ch2Trades.forEach(t => {
    const dk = dateKey(t.ts);
    byDayCh2[dk] = (byDayCh2[dk] || 0) + t.netPnl;
  });
  const greenDays = Object.values(byDayCh2).filter(v => v > 0);
  const redDays = Object.values(byDayCh2).filter(v => v < 0);
  const avgGreenDay = greenDays.length ? greenDays.reduce((s, v) => s + v, 0) / greenDays.length : 0;
  const avgRedDay = redDays.length ? redDays.reduce((s, v) => s + v, 0) / redDays.length : 0;

  // Direction breakdown
  const longT = trades.filter(t => t.direction === 'LONG');
  const shortT = trades.filter(t => t.direction === 'SHORT');
  const longW = longT.filter(t => t.outcome === 'WIN').length;
  const shortW = shortT.filter(t => t.outcome === 'WIN').length;
  const longWr = longT.length ? (longW / longT.length) * 100 : 0;
  const shortWr = shortT.length ? (shortW / shortT.length) * 100 : 0;
  const longPnl = longT.reduce((s, t) => s + t.netPnl, 0);
  const shortPnl = shortT.reduce((s, t) => s + t.netPnl, 0);

  // Standard metric cards
  const standardMetrics = [
    { key: 'm_net', label: 'P&L נטו', val: fmtMoney(netPnl), cls: netPnl >= 0 ? 'pos' : 'neg' },
    { key: 'm_comm', label: 'סה״כ עמלות', val: `-${fmtMoney(totalCommission).replace('-', '')}`, cls: 'neg' },
    { key: 'm_wr', label: 'אחוז הצלחה', val: `${winRate.toFixed(1)}%`, cls: 'neu', sub: `${wins.length}W · ${losses.length}L` },
    { key: 'm_pf', label: 'פקטור רווח', val: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2), cls: profitFactor >= 1 ? 'pos' : 'neg' },
    { key: 'm_avg', label: 'רווח/הפסד ממוצע', val: `${fmtMoney(avgWin)} / ${fmtMoney(avgLoss)}`, cls: 'neu' },
    { key: 'm_rr', label: 'יחס סיכון:סיכוי', val: `1 : ${riskReward === Infinity ? '∞' : riskReward.toFixed(2)}`, cls: riskReward >= 1 ? 'pos' : 'neg' },
    { key: 'm_total', label: 'סה״כ עסקאות', val: String(trades.length), cls: 'neu' },
    { key: 'm_win_streak', label: 'רצף ניצחונות מקסימלי', val: String(maxWinStreak), cls: 'pos' },
    { key: 'm_loss_streak', label: 'רצף הפסדים מקסימלי', val: String(maxLossStreak), cls: 'neg' }
  ];

  return (
    <div className="space-y-4 pb-4">
      {/* Sub-tab Switcher: Charts & Candlesticks VS Metrics & Stats */}
      <div className="grid grid-cols-2 gap-2 bg-[var(--panel)] border border-[var(--border-soft)] p-1.5 rounded-2xl shadow-sm">
        <button
          type="button"
          onClick={() => setActiveSubTab('chart')}
          className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all ${
            activeSubTab === 'chart'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-md'
              : 'text-[var(--text-dim)] hover:text-[var(--text)]'
          }`}
        >
          <CandleIcon size={15} />
          <span>גרפים ונרות (P&L)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('metrics')}
          className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all ${
            activeSubTab === 'metrics'
              ? 'bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black shadow-md'
              : 'text-[var(--text-dim)] hover:text-[var(--text)]'
          }`}
        >
          <BarChart3 size={15} />
          <span>מדדים ויעדים אישיים</span>
        </button>
      </div>

      {/* When activeSubTab === 'chart', show the dedicated TradingChartSection */}
      {activeSubTab === 'chart' && (
        <TradingChartSection state={state} onUpdateState={onUpdateState} />
      )}

      {/* Custom User Metrics & Targets Section */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-1.5">
            <Target size={16} className="text-emerald-400" />
            <span className="text-xs font-extrabold text-[var(--text)]">יעדים ומדדים מותאמים אישית</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAskAIForStats}
              className="px-2 py-1 rounded-lg bg-[var(--long-dim)] text-[var(--long)] border border-[var(--long)]/30 text-[10.5px] font-bold flex items-center gap-1 hover:opacity-90 transition"
              title="בקש מה-AI למלא ולהגדיר נתונים"
            >
              <Sparkles size={11} className="text-amber-400" />
              <span>מילוי בעזרת AI</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-2 py-1 rounded-lg bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black text-[10.5px] font-bold flex items-center gap-1 hover:opacity-95 transition shadow-sm"
            >
              <Plus size={12} />
              <span>הוסף ערך</span>
            </button>
          </div>
        </div>

        {customMetrics.length === 0 ? (
          <div className="text-center py-4 text-xs text-[var(--text-faint)] space-y-2">
            <div>עדיין לא הוגדרו מדדים אישיים.</div>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="text-[11px] font-bold text-[var(--long)] hover:underline"
            >
              + לחץ כאן להוספת יעד רווח, מגבלת Drawdown או יתרת תיק
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {customMetrics.map(m => {
              const colorCls = m.color === 'neg' ? 'neg' : m.color === 'pos' ? 'pos' : m.color === 'cyan' ? 'text-cyan-400' : m.color === 'gold' ? 'text-amber-400' : 'text-[var(--text)]';
              return (
                <div
                  key={m.id}
                  className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2.5 relative group hover:border-[var(--border)] transition"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[10px] text-[var(--text-faint)] font-bold truncate">
                      {m.label}
                    </span>
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(m)}
                        className="text-[var(--text-faint)] hover:text-[var(--text)] p-0.5 rounded"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMetric(m.id)}
                        className="text-[var(--text-faint)] hover:text-[var(--loss)] p-0.5 rounded"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <div className={`font-mono text-base font-extrabold ${colorCls} truncate`}>
                    {m.value}
                  </div>

                  {m.description && (
                    <div className="text-[9.5px] text-[var(--text-dim)] truncate mt-0.5">
                      {m.description}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--border-soft)] text-[8.5px] text-[var(--text-faint)] font-mono">
                    <span>
                      {m.category === 'target' ? 'יעד' : m.category === 'rule' ? 'חוק' : m.category === 'metric' ? 'מדד' : 'הערה'}
                    </span>
                    <span>{new Date(m.updatedAt).toLocaleDateString('he-IL', { month: 'numeric', day: 'numeric' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* General Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-[var(--text-faint)] tracking-wider uppercase">
            סטטיסטיקת עסקאות כללית
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {standardMetrics.map(m => (
            <div
              key={m.key}
              className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl p-3 relative"
            >
              <div className="text-[10px] text-[var(--text-faint)] font-bold mb-1">{m.label}</div>
              <div className={`font-mono text-lg font-extrabold ${m.cls}`}>{m.val}</div>
              {m.sub && <div className="font-mono text-[9.5px] text-[var(--text-faint)] mt-1">{m.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* History Button */}
      <button
        type="button"
        onClick={onOpenHistory}
        className="w-full py-3 px-3 rounded-xl bg-[var(--panel2)] border border-[var(--border)] hover:border-[var(--long)] text-xs font-bold text-[var(--text)] flex items-center justify-center gap-2 transition"
      >
        <History size={16} className="text-[var(--long)]" />
        <span>היסטוריית עסקאות מלאה — לפי תאריך</span>
      </button>

      {/* Chapter 2 Dedicated Stats */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3">
        <div className="text-xs font-bold text-[var(--text)] pb-1 border-b border-[var(--border-soft)]">
          סטטיסטיקה · פרק 2 (השיטה החדשה - מקס 4 עסקאות ליום)
        </div>
        {ch2Trades.length === 0 ? (
          <div className="text-xs text-[var(--text-faint)] text-center py-2">אין עדיין עסקאות בפרק 2.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[var(--panel3)] rounded-xl p-2.5">
              <div className="text-[9.5px] text-[var(--text-faint)] font-bold">P&L נטו פרק 2</div>
              <div className={`font-mono text-base font-bold ${ch2Net >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(ch2Net)}</div>
            </div>
            <div className="bg-[var(--panel3)] rounded-xl p-2.5">
              <div className="text-[9.5px] text-[var(--text-faint)] font-bold">אחוז הצלחה</div>
              <div className="font-mono text-base font-bold text-[var(--text)]">{ch2WinRate.toFixed(1)}%</div>
              <div className="text-[9px] text-[var(--text-faint)] mt-0.5">{ch2Wins.length}W · {ch2Losses.length}L</div>
            </div>
            <div className="bg-[var(--panel3)] rounded-xl p-2.5">
              <div className="text-[9.5px] text-[var(--text-faint)] font-bold">ממוצע יום ירוק</div>
              <div className="font-mono text-base font-bold pos">{fmtMoney(avgGreenDay)}</div>
              <div className="text-[9px] text-[var(--text-faint)] mt-0.5">{greenDays.length} ימים ירוקים</div>
            </div>
            <div className="bg-[var(--panel3)] rounded-xl p-2.5">
              <div className="text-[9.5px] text-[var(--text-faint)] font-bold">ממוצע יום אדום</div>
              <div className="font-mono text-base font-bold neg">{fmtMoney(avgRedDay)}</div>
              <div className="text-[9px] text-[var(--text-faint)] mt-0.5">{redDays.length} ימים אדומים</div>
            </div>
          </div>
        )}
      </div>

      {/* Long vs Short Breakdown */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3">
        <div className="text-xs font-bold text-[var(--text)] pb-1 border-b border-[var(--border-soft)]">
          כיוון: לונג מול שורט
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-[var(--long)]">לונג ▲</span>
            <span className="text-[var(--text-faint)] font-mono text-[10px]">
              {longT.length} עסקאות · {longWr.toFixed(0)}% הצלחה · {fmtMoney(longPnl)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--panel3)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--long)] rounded-full transition-all" style={{ width: `${longWr}%` }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs font-bold mb-1">
            <span className="text-[var(--short)]">שורט ▼</span>
            <span className="text-[var(--text-faint)] font-mono text-[10px]">
              {shortT.length} עסקאות · {shortWr.toFixed(0)}% הצלחה · {fmtMoney(shortPnl)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[var(--panel3)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--short)] rounded-full transition-all" style={{ width: `${shortWr}%` }} />
          </div>
        </div>
      </div>

      {/* ATR Tiers Table */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-2">
        <div className="text-xs font-bold text-[var(--text)] pb-1 border-b border-[var(--border-soft)]">
          ביצועים לפי טווח ATR
        </div>
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-[var(--border-soft)] text-[9.5px] text-[var(--text-faint)] font-bold">
              <th className="py-2">טווח</th>
              <th className="py-2">עסקאות</th>
              <th className="py-2">הצלחה</th>
              <th className="py-2">P&L נטו</th>
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.map(tk => {
              const tier = ATR_TIERS[tk];
              const tt = trades.filter(x => x.tier === tk);
              const tw = tt.filter(x => x.outcome === 'WIN').length;
              const tp = tt.reduce((s, x) => s + x.netPnl, 0);
              const tr = tt.length ? (tw / tt.length) * 100 : 0;
              return (
                <tr key={tk} className="border-b border-[var(--border-soft)] last:border-b-0 font-semibold">
                  <td className="py-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--panel3)]">{tier.label}</span>
                  </td>
                  <td className="py-2 font-mono text-[var(--text-dim)]">{tt.length}</td>
                  <td className="py-2 font-mono text-[var(--text-dim)]">{tt.length ? `${tr.toFixed(0)}%` : '—'}</td>
                  <td className={`py-2 font-mono font-bold ${tp > 0 ? 'pos' : tp < 0 ? 'neg' : ''}`}>
                    {tt.length ? fmtMoney(tp) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Multi-Account Comparison (if ALL selected) */}
      {state.selectedAccount === 'ALL' && state.accounts.length > 0 && (
        <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold text-[var(--text)] pb-1 border-b border-[var(--border-soft)]">
            השוואת חשבונות
          </div>
          <div className="space-y-3">
            {state.accounts.map((acc, idx) => {
              const accTrades = statsTradesFor(state, acc);
              const apnl = accTrades.reduce((s, t) => s + t.netPnl, 0);
              const awins = accTrades.filter(t => t.outcome === 'WIN').length;
              const awr = accTrades.length ? (awins / accTrades.length) * 100 : 0;
              const color = ACCT_COLORS[idx % ACCT_COLORS.length];
              return (
                <div key={acc} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span>{acc}</span>
                    <span className="font-mono text-[10px] text-[var(--text-faint)]">
                      {accTrades.length} עסקאות · {awr.toFixed(0)}% · {fmtMoney(apnl)}
                    </span>
                  </div>
                  <div className="w-full h-4 bg-[var(--panel3)] rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg flex items-center px-2 font-mono text-[10px] font-bold text-[#04140f]"
                      style={{ width: `${Math.min(100, Math.max(12, Math.abs(apnl) > 0 ? 50 : 10))}%`, backgroundColor: color }}
                    >
                      {fmtMoney(apnl)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal for Adding / Editing Custom Metric */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl relative text-right space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)]">
              <h3 className="text-sm font-extrabold text-[var(--text)]">
                {editingMetric ? 'עריכת ערך בסטטיסטיקה' : 'הוספת ערך / יעד חדש בסטטיסטיקה'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 rounded-full bg-[var(--panel2)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[11px] font-bold text-[var(--text-faint)] block mb-1">
                  שם המדד / היעד:
                </label>
                <input
                  type="text"
                  placeholder="למשל: יעד רווח שבועי, יתרת תיק, מקס הפסד..."
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-xs text-[var(--text)] outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-faint)] block mb-1">
                  ערך (טקסט / מספר / סכום):
                </label>
                <input
                  type="text"
                  placeholder="למשל: $2,500 או 65% או 2 עסקאות ליום"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  className="w-full bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-xs text-[var(--text)] outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-faint)] block mb-1">
                  קטגוריה:
                </label>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {[
                    { id: 'target', label: 'יעד' },
                    { id: 'rule', label: 'חוק' },
                    { id: 'metric', label: 'מדד' },
                    { id: 'note', label: 'הערה' }
                  ].map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setFormCategory(c.id as any)}
                      className={`py-1.5 rounded-lg text-center font-bold transition ${
                        formCategory === c.id
                          ? 'bg-[var(--long)] text-black'
                          : 'bg-[var(--panel2)] border border-[var(--border-soft)] text-[var(--text-dim)]'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-faint)] block mb-1">
                  צבע הדגשה:
                </label>
                <div className="flex gap-2">
                  {[
                    { id: 'pos', bg: 'bg-emerald-500', name: 'ירוק' },
                    { id: 'neg', bg: 'bg-red-500', name: 'אדום' },
                    { id: 'cyan', bg: 'bg-cyan-500', name: 'טורקיז' },
                    { id: 'gold', bg: 'bg-amber-500', name: 'זהב' },
                    { id: 'neu', bg: 'bg-gray-400', name: 'ניטרלי' }
                  ].map(col => (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => setFormColor(col.id)}
                      className={`w-7 h-7 rounded-full ${col.bg} flex items-center justify-center transition ${
                        formColor === col.id ? 'ring-2 ring-white scale-110' : 'opacity-70'
                      }`}
                      title={col.name}
                    >
                      {formColor === col.id && <Check size={12} className="text-black" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[var(--text-faint)] block mb-1">
                  תיאור קצר (אופציונלי):
                </label>
                <input
                  type="text"
                  placeholder="הסבר על היעד או החוק..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-xs text-[var(--text)] outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveMetric}
                disabled={!formLabel.trim() || !formValue.trim()}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black font-extrabold text-xs hover:opacity-95 disabled:opacity-40 transition shadow-md"
              >
                שמור מדד
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="py-2.5 px-3 rounded-xl bg-[var(--panel2)] border border-[var(--border-soft)] text-xs font-bold text-[var(--text-dim)]"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
