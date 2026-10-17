import React from 'react';
import { AppState, Trade } from '../types';
import {
  entryDateLabel,
  offsetDateKey,
  dateKey,
  getEntryStatusV2,
  fmtMoney,
  fmtTimeFromTs,
  chapterOf
} from '../utils/tradingCalculations';
import { COMMISSION_PER_CONTRACT, CH2_MAX_TRADES, pad2 } from '../data/constants';
import { Plus, Minus, Check, X, AlertTriangle, Scale, Trash2, Edit3, ChevronRight, ChevronLeft } from 'lucide-react';

interface TradeEntryViewProps {
  state: AppState;
  onUpdateState: (patch: Partial<AppState>) => void;
  onSubmitTrade: () => void;
  onOpenBreakeven: () => void;
  onEditTrade: (id: string) => void;
  onDeleteTrade: (id: string) => void;
}

export const TradeEntryView: React.FC<TradeEntryViewProps> = ({
  state,
  onUpdateState,
  onSubmitTrade,
  onOpenBreakeven,
  onEditTrade,
  onDeleteTrade
}) => {
  const accounts = Array.isArray(state.accounts) && state.accounts.length > 0 ? state.accounts : ['APEX-25K-01'];
  const formAcct = state.formAccount && accounts.includes(state.formAccount) ? state.formAccount : accounts[0] || 'APEX-25K-01';
  const entryDateKey = offsetDateKey(state.entryDateOffset || 0);
  const status = getEntryStatusV2(state, formAcct, entryDateKey);
  const contracts = state.formContracts != null ? state.formContracts : 1;
  const effectiveGross = state.formCustomGross != null ? state.formCustomGross : 0;
  const effectiveCommission = contracts * COMMISSION_PER_CONTRACT;
  const effectiveNet = effectiveGross - effectiveCommission;
  const atrRange = state.atrRanges ? state.atrRanges[formAcct] : undefined;

  const dayTrades = (state.trades || [])
    .filter(t => (state.selectedAccount === 'ALL' || t.account === state.selectedAccount) && dateKey(t.ts) === entryDateKey)
    .sort((a, b) => b.ts - a.ts);

  // Time picker values
  const timeParts = (state.formTime || '00:00').split(':');
  const currentHour = timeParts[0] || '12';
  const currentMin = timeParts[1] || '00';

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateState({ formTime: `${e.target.value}:${currentMin}` });
  };
  const handleMinChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateState({ formTime: `${currentHour}:${e.target.value}` });
  };

  const handleRRStep = (step: number) => {
    const curRR = parseFloat(state.formRR || '2');
    const newRR = Math.max(0.5, Math.min(5.5, Math.round((curRR + (step > 0 ? 0.5 : -0.5)) * 10) / 10));
    onUpdateState({ formRR: String(newRR) });
  };

  return (
    <div className="space-y-3.5 pb-4">
      {/* Date Navigation Bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onUpdateState({ entryDateOffset: state.entryDateOffset + 1 })}
          className="w-9 h-9 rounded-xl bg-[var(--panel2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition"
        >
          <ChevronRight size={18} />
        </button>
        <div className="flex-1 text-center bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl py-2 px-3 text-xs font-bold text-[var(--text)]">
          {entryDateLabel(state.entryDateOffset, true)}
        </div>
        <button
          type="button"
          disabled={state.entryDateOffset <= 0}
          onClick={() => onUpdateState({ entryDateOffset: Math.max(0, state.entryDateOffset - 1) })}
          className="w-9 h-9 rounded-xl bg-[var(--panel2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] disabled:opacity-30 disabled:pointer-events-none hover:text-[var(--text)] transition"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="text-[11px] font-bold text-[var(--text-faint)] tracking-wider uppercase flex items-center gap-2">
        <span>סיכום · פרק 2 · {entryDateLabel(state.entryDateOffset)} · {formAcct}</span>
        {atrRange && <span className="text-[var(--long)]">· ATR {atrRange}</span>}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl p-2.5 text-center">
          <div className="text-[9.5px] text-[var(--text-faint)] font-bold mb-1">P&L נטו</div>
          <div className={`font-mono text-base font-bold ${status.dayNet > 0 ? 'pos' : status.dayNet < 0 ? 'neg' : 'neu'}`}>
            {fmtMoney(status.dayNet)}
          </div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl p-2.5 text-center">
          <div className="text-[9.5px] text-[var(--text-faint)] font-bold mb-1">בלוק נוכחי</div>
          <div className="font-mono text-base font-bold text-[var(--text)]">
            עסקה {status.block.slotsUsed} / {CH2_MAX_TRADES}
          </div>
        </div>
        <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl p-2.5 text-center">
          <div className="text-[9.5px] text-[var(--text-faint)] font-bold mb-1">נצחונות/הפסדים</div>
          <div className="font-mono text-base font-bold text-[var(--text)]">
            {status.dayWins} / {status.dayLosses}
          </div>
        </div>
      </div>

      {/* Block Meter (Chapter 2) */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-3.5">
        <div className="flex justify-between items-baseline mb-2.5">
          <span className="text-xs font-bold text-[var(--text-dim)]">בלוק פרק 2 · מקסימום {CH2_MAX_TRADES} עסקאות ליום</span>
          <span className="font-mono text-xs font-bold text-[var(--text)]">{status.block.slotsUsed}/{CH2_MAX_TRADES}</span>
        </div>
        <div className="flex gap-1.5 direction-ltr">
          {[0, 1, 2, 3].map(idx => {
            const tr = status.block.trades[idx];
            let bgClass = 'bg-[var(--panel3)] border-[var(--border)]';
            if (tr) {
              bgClass = tr.outcome === 'WIN'
                ? 'bg-[var(--profit)] border-[var(--profit)] shadow-[0_0_8px_rgba(32,220,147,0.55)]'
                : 'bg-[var(--loss)] border-[var(--loss)] shadow-[0_0_8px_rgba(255,77,106,0.55)]';
            }
            return <div key={idx} className={`flex-1 h-5 rounded border ${bgClass}`} />;
          })}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[var(--text-faint)] font-semibold">
          <span>נצחונות: <b className="text-[var(--text)] font-mono">{status.block.wins}</b></span>
          <span>נעילה ב-2 הפסדים רצופים או 2 ניצחונות</span>
          <span>הפסדים: <b className="text-[var(--text)] font-mono">{status.block.losses}</b></span>
        </div>
      </div>

      {/* Lock Banners */}
      {status.block.locked && (
        <div className="bg-[var(--loss-dim)] border border-red-500/40 text-red-300 rounded-xl p-3 flex items-center gap-2.5 text-xs font-semibold">
          <AlertTriangle size={18} className="flex-none text-[var(--loss)]" />
          <span>
            {status.block.lockReason === 'losses' && 'שני הפסדים רצופים בבלוק הנוכחי. המסחר נחסם לתיק זה להיום.'}
            {status.block.lockReason === 'wins' && 'הגעת ל-2 ניצחונות בבלוק הנוכחי. המסחר נחסם לתיק זה להיום בהצלחה!'}
            {status.block.lockReason === 'cap' && `הגעת למקסימום ${CH2_MAX_TRADES} עסקאות בבלוק הנוכחי. המסחר נחסם לתיק זה להיום.`}
          </span>
        </div>
      )}

      {status.dailyLossLocked && (
        <div className="bg-[var(--loss-dim)] border border-red-500/40 text-red-300 rounded-xl p-3 flex items-center gap-2.5 text-xs font-semibold">
          <AlertTriangle size={18} className="flex-none text-[var(--loss)]" />
          <span>הגעת למגבלת ההפסד היומית ({fmtMoney(-Math.abs(state.maxDailyLoss))} נטו). המסחר נחסם לתיק זה להיום.</span>
        </div>
      )}

      {/* Trade Entry Form */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3.5">
        <div className="text-xs font-bold text-[var(--text)] pb-1 border-b border-[var(--border-soft)]">
          הוספת עסקה · פרק 2
        </div>

        {/* Account selection */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">חשבון</label>
          <select
            value={formAcct}
            onChange={(e) => onUpdateState({ formAccount: e.target.value })}
            className="w-full bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-xs font-semibold text-[var(--text)] outline-none"
          >
            {accounts.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">כיוון</label>
          <div className="flex gap-2 bg-[var(--panel3)] p-1 rounded-xl border border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => onUpdateState({ formDirection: 'LONG' })}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                state.formDirection === 'LONG'
                  ? 'bg-[var(--long-dim)] text-[var(--long)] ring-1 ring-[var(--long)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              לונג ▲ (קנייה)
            </button>
            <button
              type="button"
              onClick={() => onUpdateState({ formDirection: 'SHORT' })}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                state.formDirection === 'SHORT'
                  ? 'bg-[var(--short-dim)] text-[var(--short)] ring-1 ring-[var(--short)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              שורט ▼ (מכירה)
            </button>
          </div>
        </div>

        {/* VWAP Compatibility */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">תאימות VWAP</label>
          <div className="flex gap-2 bg-[var(--panel3)] p-1 rounded-xl border border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => onUpdateState({ formVwap: true })}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                state.formVwap
                  ? 'bg-[var(--profit-dim)] text-[var(--profit)] ring-1 ring-[var(--profit)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              כן ✓
            </button>
            <button
              type="button"
              onClick={() => onUpdateState({ formVwap: false })}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
                !state.formVwap
                  ? 'bg-[var(--loss-dim)] text-[var(--loss)] ring-1 ring-[var(--loss)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              לא ✕
            </button>
          </div>
        </div>

        {/* Contracts Stepper */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">כמות חוזים</label>
          <div className="flex items-center bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => onUpdateState({ formContracts: Math.min(50, contracts + 1) })}
              className="w-11 h-10 flex items-center justify-center text-base font-bold text-[var(--text-dim)] hover:text-[var(--text)] transition"
            >
              <Plus size={16} />
            </button>
            <input
              type="number"
              min="1"
              max="50"
              value={contracts}
              onChange={(e) => onUpdateState({ formContracts: Math.max(1, Math.min(50, parseInt(e.target.value, 10) || 1)) })}
              className="flex-1 text-center bg-transparent border-none font-mono font-bold text-sm text-[var(--text)] outline-none"
            />
            <button
              type="button"
              onClick={() => onUpdateState({ formContracts: Math.max(1, contracts - 1) })}
              className="w-11 h-10 flex items-center justify-center text-base font-bold text-[var(--text-dim)] hover:text-[var(--text)] transition"
            >
              <Minus size={16} />
            </button>
          </div>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">תוצאה</label>
          <div className="flex gap-2 bg-[var(--panel3)] p-1 rounded-xl border border-[var(--border-soft)]">
            <button
              type="button"
              onClick={() => {
                const absG = state.formCustomGross != null ? Math.abs(state.formCustomGross) : null;
                onUpdateState({ formOutcome: 'WIN', formCustomGross: absG });
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                state.formOutcome === 'WIN'
                  ? 'bg-[var(--profit-dim)] text-[var(--profit)] ring-1 ring-[var(--profit)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              רווח ✓
            </button>
            <button
              type="button"
              onClick={() => {
                const absG = state.formCustomGross != null ? -Math.abs(state.formCustomGross) : null;
                onUpdateState({ formOutcome: 'LOSE', formCustomGross: absG });
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                state.formOutcome === 'LOSE'
                  ? 'bg-[var(--loss-dim)] text-[var(--loss)] ring-1 ring-[var(--loss)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              הפסד ✕
            </button>
          </div>
        </div>

        {/* Time Picker */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">שעה (24 שעות)</label>
          <div className="flex items-center gap-2">
            <select
              value={currentHour}
              onChange={handleHourChange}
              className="flex-1 bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl py-2 px-3 text-xs font-mono font-bold text-center text-[var(--text)] outline-none"
            >
              {Array.from({ length: 24 }).map((_, h) => {
                const hv = pad2(h);
                return <option key={hv} value={hv}>{hv}</option>;
              })}
            </select>
            <span className="font-bold text-[var(--text-faint)]">:</span>
            <select
              value={currentMin}
              onChange={handleMinChange}
              className="flex-1 bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl py-2 px-3 text-xs font-mono font-bold text-center text-[var(--text)] outline-none"
            >
              {Array.from({ length: 60 }).map((_, m) => {
                const mv = pad2(m);
                return <option key={mv} value={mv}>{mv}</option>;
              })}
            </select>
          </div>
        </div>

        {/* R:R Stepper */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">יחס סיכוי:סיכון</label>
          <div className="flex items-center justify-between bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl px-4 py-2">
            <span className="font-mono text-sm font-bold text-[var(--text)]">1 : {state.formRR || '2'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleRRStep(-1)}
                className="w-7 h-7 rounded-lg bg-[var(--panel)] border border-[var(--border-soft)] flex items-center justify-center text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => handleRRStep(1)}
                className="w-7 h-7 rounded-lg bg-[var(--panel)] border border-[var(--border-soft)] flex items-center justify-center text-xs text-[var(--text-dim)] hover:text-[var(--text)]"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Gross P&L Input */}
        <div>
          <label className="block text-[11px] font-bold text-[var(--text-dim)] mb-1.5">
            {state.formOutcome === 'LOSE' ? 'סכום ההפסד ($)' : 'רווח ברוטו ($)'}
          </label>
          <div className={`flex items-center border rounded-xl overflow-hidden bg-[var(--panel3)] ${
            state.formOutcome === 'LOSE' ? 'border-red-500/30' : 'border-emerald-500/30'
          }`}>
            <span className={`w-10 h-10 flex items-center justify-center font-extrabold text-base ${
              state.formOutcome === 'LOSE' ? 'text-[var(--loss)] bg-[var(--loss-dim)]' : 'text-[var(--profit)] bg-[var(--profit-dim)]'
            }`}>
              {state.formOutcome === 'LOSE' ? '−' : '+'}
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={state.formCustomGross != null ? Math.abs(state.formCustomGross) : ''}
              onChange={(e) => {
                if (e.target.value === '') {
                  onUpdateState({ formCustomGross: null });
                } else {
                  const val = Math.abs(parseFloat(e.target.value) || 0);
                  onUpdateState({ formCustomGross: state.formOutcome === 'LOSE' ? -val : val });
                }
              }}
              className="flex-1 bg-transparent px-3 py-2 text-xs font-mono font-bold text-[var(--text)] outline-none"
            />
          </div>
        </div>

        {/* Financials Preview */}
        <div className="bg-[var(--panel3)] border border-dashed border-[var(--border)] rounded-xl p-3 space-y-1 text-xs">
          <div className="flex justify-between text-[var(--text-dim)]">
            <span>ברוטו</span>
            <span className="font-mono">{fmtMoney(effectiveGross)}</span>
          </div>
          <div className="flex justify-between text-[var(--text-dim)]">
            <span>עמלה ({contracts} × ${COMMISSION_PER_CONTRACT.toFixed(2)})</span>
            <span className="font-mono text-[var(--loss)]">-{fmtMoney(effectiveCommission).replace('-', '')}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-[var(--border-soft)] font-bold text-[var(--text)]">
            <span>נטו</span>
            <span className={`font-mono text-base ${effectiveNet >= 0 ? 'pos' : 'neg'}`}>
              {fmtMoney(effectiveNet)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="button"
          disabled={status.blocked}
          onClick={onSubmitTrade}
          className="w-full py-3.5 px-4 rounded-xl text-xs font-extrabold tracking-wide transition shadow-lg disabled:opacity-40 disabled:pointer-events-none bg-gradient-to-r from-[#2be3a0] to-[#1fb0d8] text-[#04140f] active:scale-[0.985]"
        >
          {status.blocked ? 'המסחר חסום להיום' : 'הוסף עסקה'}
        </button>
      </div>

      {/* Breakeven Button */}
      <button
        type="button"
        onClick={onOpenBreakeven}
        className="w-full py-3 px-3 rounded-xl bg-[var(--panel2)] border border-[var(--border)] hover:border-[var(--long)] text-xs font-bold text-[var(--text)] flex items-center justify-center gap-2 transition"
      >
        <Scale size={16} className="text-[var(--long)]" />
        <span>הוספת עסקה שנסגרה בברייק איוון (עמלה בלבד, ללא פגיעה ב-Win Rate)</span>
      </button>

      {/* Daily Trades List */}
      <div className="pt-2">
        <div className="text-xs font-bold text-[var(--text-faint)] tracking-wider uppercase mb-2">
          עסקאות רשומות · {entryDateLabel(state.entryDateOffset)}
        </div>

        {dayTrades.length === 0 ? (
          <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl p-6 text-center text-xs text-[var(--text-faint)]">
            אין עסקאות רשומות ליום זה.
          </div>
        ) : (
          <div className="space-y-2">
            {dayTrades.map(t => (
              <div
                key={t.id}
                className="flex items-center gap-2.5 p-3 bg-[var(--panel)] border border-[var(--border-soft)] rounded-xl hover:border-[var(--border)] transition"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-none ${
                  t.direction === 'LONG' ? 'bg-[var(--long-dim)] text-[var(--long)]' : 'bg-[var(--short-dim)] text-[var(--short)]'
                }`}>
                  {t.direction === 'LONG' ? '▲' : '▼'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold truncate text-[var(--text)]">
                    {t.account} · {t.breakeven ? '⚖️ ברייק איוון' : `פרק ${chapterOf(t)} · ${t.direction === 'LONG' ? 'לונג' : 'שורט'}`}
                    {t.vwap !== undefined && ` · VWAP ${t.vwap ? '✓' : '✕'}`}
                    {t.rr && ` · 1:${t.rr}`}
                  </div>
                  <div className="text-[10px] text-[var(--text-faint)] font-mono mt-0.5">
                    {fmtTimeFromTs(t.ts)} · {t.contracts} חוזים · {t.outcome === 'WIN' ? 'רווח' : t.breakeven ? 'BE' : 'הפסד'} · עמלה -{fmtMoney(t.commission).replace('-', '')}
                  </div>
                </div>
                <div className={`font-mono text-xs font-extrabold flex-none ${t.netPnl >= 0 ? 'pos' : 'neg'}`}>
                  {fmtMoney(t.netPnl)}
                </div>
                <div className="flex items-center gap-1 flex-none">
                  <button
                    type="button"
                    onClick={() => onEditTrade(t.id)}
                    className="w-7 h-7 rounded-lg bg-[var(--panel3)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition"
                  >
                    <Edit3 size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteTrade(t.id)}
                    className="w-7 h-7 rounded-lg bg-[var(--panel3)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--loss)] hover:bg-red-950/40 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
