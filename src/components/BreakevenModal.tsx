import React, { useState } from 'react';
import { AppState, Trade } from '../types';
import { COMMISSION_PER_CONTRACT, pad2 } from '../data/constants';
import { X, Scale } from 'lucide-react';
import { offsetDateKey, fmtMoney } from '../utils/tradingCalculations';

interface BreakevenModalProps {
  state: AppState;
  onClose: () => void;
  onAddTrade: (t: Trade) => void;
}

export const BreakevenModal: React.FC<BreakevenModalProps> = ({ state, onClose, onAddTrade }) => {
  const [account, setAccount] = useState(state.accounts[0] || '');
  const [contracts, setContracts] = useState(1);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  });

  const totalComm = contracts * COMMISSION_PER_CONTRACT;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Parse date based on offset
    const d = new Date();
    d.setDate(d.getDate() - state.entryDateOffset);
    const [h, m] = time.split(':').map(Number);
    d.setHours(h || 12, m || 0, 0, 0);

    const newTrade: Trade = {
      id: `t_be_${Date.now()}`,
      ts: d.getTime(),
      account,
      chapter: 2,
      tier: 't2',
      direction,
      outcome: 'LOSE', // doesn't count in winrate because breakeven: true
      contracts,
      grossPnl: 0,
      commission: totalComm,
      netPnl: -totalComm,
      breakeven: true
    };

    onAddTrade(newTrade);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl w-full max-w-[420px] p-4 shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[var(--text)]">
            <Scale size={16} className="text-[var(--long)]" />
            <span>הוספת עסקת ברייק איוון (עמלה בלבד)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--panel3)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)]"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1">חשבון</label>
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl p-2 text-xs text-[var(--text)] font-semibold outline-none"
            >
              {state.accounts.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1">כיוון</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('LONG')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                  direction === 'LONG' ? 'border-[var(--long)] bg-[var(--long-dim)] text-[var(--long)]' : 'border-[var(--border-soft)] bg-[var(--panel3)] text-[var(--text-dim)]'
                }`}
              >
                לונג ▲
              </button>
              <button
                type="button"
                onClick={() => setDirection('SHORT')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                  direction === 'SHORT' ? 'border-[var(--short)] bg-[var(--short-dim)] text-[var(--short)]' : 'border-[var(--border-soft)] bg-[var(--panel3)] text-[var(--text-dim)]'
                }`}
              >
                שורט ▼
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1">כמות חוזים</label>
            <input
              type="number"
              min="1"
              max="50"
              value={contracts}
              onChange={(e) => setContracts(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl p-2 text-xs font-mono font-bold text-[var(--text)] outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1">שעה</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl p-2 text-xs font-mono font-bold text-[var(--text)] outline-none"
            />
          </div>

          <div className="p-3 bg-[var(--panel3)] rounded-xl text-xs space-y-1">
            <div className="flex justify-between text-[var(--text-dim)]">
              <span>ברוטו:</span>
              <span className="font-mono">$0.00</span>
            </div>
            <div className="flex justify-between text-[var(--text-dim)]">
              <span>עמלות ({contracts} חוזים):</span>
              <span className="font-mono text-[var(--loss)]">-{fmtMoney(totalComm).replace('-', '')}</span>
            </div>
            <div className="flex justify-between font-bold text-[var(--loss)] border-t border-[var(--border-soft)] pt-1">
              <span>נטו:</span>
              <span className="font-mono">{fmtMoney(-totalComm)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-[var(--long)] text-black font-bold text-xs hover:opacity-90 transition"
          >
            אישור והוספת ברייק איוון
          </button>
        </form>
      </div>
    </div>
  );
};
