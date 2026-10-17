import React, { useState } from 'react';
import { ANCIENT_TRADES } from '../data/ancientTrades';
import { fmtMoney, fmtTimeFromTs, dateKey, fmtDateHe } from '../utils/tradingCalculations';
import { Landmark, Search } from 'lucide-react';

export const AncientView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const ancientNet = ANCIENT_TRADES.reduce((s, t) => s + t.netPnl, 0);
  const ancientComm = ANCIENT_TRADES.reduce((s, t) => s + t.commission, 0);
  const wins = ANCIENT_TRADES.filter(t => t.outcome === 'WIN').length;
  const losses = ANCIENT_TRADES.filter(t => t.outcome === 'LOSE').length;
  const wr = ANCIENT_TRADES.length ? (wins / ANCIENT_TRADES.length) * 100 : 0;

  const filteredTrades = ANCIENT_TRADES.filter(t => {
    const dk = dateKey(t.ts);
    const text = `${dk} ${t.account} ${t.direction} ${t.asset || ''}`.toLowerCase();
    return text.includes(searchTerm.toLowerCase());
  }).sort((a, b) => b.ts - a.ts);

  return (
    <div className="space-y-4 pb-4">
      {/* Banner / Info */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Landmark size={18} />
          </div>
          <div>
            <div className="text-xs font-bold text-[var(--text)]">ארכיון העת העתיקה</div>
            <div className="text-[10px] text-[var(--text-faint)]">היסטוריית מסחר ארכיונית (59 עסקאות ראשונות)</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="bg-[var(--panel3)] rounded-xl p-2.5">
            <div className="text-[9.5px] text-[var(--text-faint)] font-bold">P&L נטו</div>
            <div className={`font-mono text-base font-bold ${ancientNet >= 0 ? 'pos' : 'neg'}`}>
              {fmtMoney(ancientNet)}
            </div>
          </div>
          <div className="bg-[var(--panel3)] rounded-xl p-2.5">
            <div className="text-[9.5px] text-[var(--text-faint)] font-bold">אחוז הצלחה</div>
            <div className="font-mono text-base font-bold text-[var(--text)]">{wr.toFixed(1)}%</div>
          </div>
          <div className="bg-[var(--panel3)] rounded-xl p-2.5">
            <div className="text-[9.5px] text-[var(--text-faint)] font-bold">עסקאות</div>
            <div className="font-mono text-base font-bold text-[var(--text)]">{ANCIENT_TRADES.length}</div>
            <div className="text-[9px] text-[var(--text-faint)]">{wins}W · {losses}L</div>
          </div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="חיפוש לפי תאריך, חשבון או נכס..."
          className="w-full bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl py-2.5 pr-9 pl-3 text-xs text-[var(--text)] outline-none"
        />
        <Search size={15} className="absolute right-3 top-3 text-[var(--text-faint)]" />
      </div>

      {/* Ancient Trades List */}
      <div className="space-y-2">
        {filteredTrades.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-2.5 p-3 bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-none ${
              t.direction === 'LONG' ? 'bg-[var(--long-dim)] text-[var(--long)]' : 'bg-[var(--short-dim)] text-[var(--short)]'
            }`}>
              {t.direction === 'LONG' ? '▲' : '▼'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold truncate text-[var(--text)]">
                {fmtDateHe(dateKey(t.ts))} · {t.account} · {t.asset} · {t.direction}
              </div>
              <div className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                {fmtTimeFromTs(t.ts)} · {t.outcome === 'WIN' ? 'רווח' : 'הפסד'} · עמלה -{fmtMoney(t.commission).replace('-', '')}
              </div>
            </div>
            <div className={`font-mono text-xs font-extrabold flex-none ${t.netPnl >= 0 ? 'pos' : 'neg'}`}>
              {fmtMoney(t.netPnl)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
