import React, { useState } from 'react';
import { AppState, Trade } from '../types';
import { dateKey, fmtDateHe, fmtMoney, fmtTimeFromTs, chapterOf } from '../utils/tradingCalculations';
import { X, Trash2, Edit3, Search, Filter } from 'lucide-react';

interface HistoryModalProps {
  state: AppState;
  onClose: () => void;
  onDeleteTrade: (id: string) => void;
  onEditTrade: (id: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  state,
  onClose,
  onDeleteTrade,
  onEditTrade
}) => {
  const [filterAccount, setFilterAccount] = useState<string>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filtered = state.trades.filter(t => {
    if (filterAccount !== 'ALL' && t.account !== filterAccount) return false;
    if (filterOutcome === 'WIN' && t.outcome !== 'WIN') return false;
    if (filterOutcome === 'LOSE' && (t.outcome !== 'LOSE' || t.breakeven)) return false;
    if (filterOutcome === 'BE' && !t.breakeven) return false;

    if (search) {
      const dk = dateKey(t.ts);
      const txt = `${dk} ${t.account} ${t.direction}`.toLowerCase();
      if (!txt.includes(search.toLowerCase())) return false;
    }
    return true;
  }).sort((a, b) => b.ts - a.ts);

  const totalNet = filtered.reduce((s, t) => s + t.netPnl, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl w-full max-w-[540px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-soft)]">
          <div>
            <div className="font-extrabold text-sm text-[var(--text)]">היסטוריית עסקאות מלאה</div>
            <div className="text-[10px] text-[var(--text-faint)] mt-0.5">
              נמצאו {filtered.length} עסקאות · סה״כ נטו: <b className={`font-mono ${totalNet >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(totalNet)}</b>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--panel3)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filters bar */}
        <div className="p-3 bg-[var(--panel2)] border-b border-[var(--border-soft)] flex flex-wrap gap-2 text-xs">
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="bg-[var(--panel3)] border border-[var(--border-soft)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] outline-none"
          >
            <option value="ALL">כל החשבונות</option>
            {state.accounts.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={filterOutcome}
            onChange={(e) => setFilterOutcome(e.target.value)}
            className="bg-[var(--panel3)] border border-[var(--border-soft)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] outline-none"
          >
            <option value="ALL">כל התוצאות</option>
            <option value="WIN">רווח בלבד</option>
            <option value="LOSE">הפסד בלבד</option>
            <option value="BE">ברייק איוון בלבד</option>
          </select>

          <input
            type="text"
            placeholder="חיפוש..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[120px] bg-[var(--panel3)] border border-[var(--border-soft)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] outline-none"
          />
        </div>

        {/* Scrollable List */}
        <div className="p-3 overflow-y-auto space-y-2 flex-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--text-faint)]">
              לא נמצאו עסקאות העונות לסינון.
            </div>
          ) : (
            filtered.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-2.5 p-3 bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-none ${
                  t.direction === 'LONG' ? 'bg-[var(--long-dim)] text-[var(--long)]' : 'bg-[var(--short-dim)] text-[var(--short)]'
                }`}>
                  {t.direction === 'LONG' ? '▲' : '▼'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-[var(--text)]">
                    {fmtDateHe(dateKey(t.ts))} · {fmtTimeFromTs(t.ts)} · {t.account}
                  </div>
                  <div className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                    פרק {chapterOf(t)} · {t.direction} · {t.contracts} חוזים · {t.breakeven ? 'BE' : t.outcome === 'WIN' ? 'רווח' : 'הפסד'}
                    {t.vwap !== undefined && ` · VWAP ${t.vwap ? '✓' : '✕'}`}
                    {t.rr && ` · 1:${t.rr}`}
                  </div>
                </div>
                <div className={`font-mono text-xs font-extrabold flex-none ${t.netPnl >= 0 ? 'pos' : 'neg'}`}>
                  {fmtMoney(t.netPnl)}
                </div>
                <div className="flex items-center gap-1 flex-none">
                  <button
                    type="button"
                    onClick={() => { onClose(); onEditTrade(t.id); }}
                    className="w-7 h-7 rounded-lg bg-[var(--panel3)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)]"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTrade(t.id)}
                    className="w-7 h-7 rounded-lg bg-[var(--panel3)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--loss)] hover:bg-red-950/40"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
