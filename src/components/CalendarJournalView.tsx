import React, { useState } from 'react';
import { AppState, DayNote, JournalEntry, Trade } from '../types';
import {
  dateKey,
  todayKey,
  fmtMoney,
  fmtShortMoney,
  fmtTimeFromTs,
  pad2,
  fmtDateHe,
  getWeekSummaryForDate,
  WeekSummaryData
} from '../utils/tradingCalculations';
import {
  ChevronRight,
  ChevronLeft,
  CheckSquare,
  Square,
  Star,
  Send,
  Trash2,
  BookOpen,
  Calendar as CalendarIcon,
  Award,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

interface CalendarJournalViewProps {
  state: AppState;
  onUpdateState: (patch: Partial<AppState>) => void;
}

export const CalendarJournalView: React.FC<CalendarJournalViewProps> = ({ state, onUpdateState }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey());
  const [newEntryText, setNewEntryText] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  // Build calendar matrix
  const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun, 6 = Sat
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Aggregate trades by date key
  const tradesByDate: Record<string, { count: number; net: number; wins: number; losses: number; trades: Trade[] }> = {};
  state.trades
    .filter(t => state.selectedAccount === 'ALL' || t.account === state.selectedAccount)
    .forEach(t => {
      const dk = dateKey(t.ts);
      if (!tradesByDate[dk]) {
        tradesByDate[dk] = { count: 0, net: 0, wins: 0, losses: 0, trades: [] };
      }
      tradesByDate[dk].count++;
      tradesByDate[dk].net += t.netPnl;
      tradesByDate[dk].trades.push(t);
      if (t.outcome === 'WIN') tradesByDate[dk].wins++;
      else if (t.outcome === 'LOSE') tradesByDate[dk].losses++;
    });

  // Current day note
  const dayNote: DayNote = state.dayNotes?.[selectedDateKey] || {
    rule1: false,
    rule2: false,
    rule3: false,
    mental: 3,
    perf: 3,
    entries: []
  };

  const updateDayNote = (patch: Partial<DayNote>) => {
    const updated = { ...dayNote, ...patch };
    onUpdateState({
      dayNotes: {
        ...(state.dayNotes || {}),
        [selectedDateKey]: updated
      }
    });
  };

  const handleAddJournalEntry = () => {
    if (!newEntryText.trim()) return;
    const newEntry: JournalEntry = {
      id: `j_${Date.now()}`,
      ts: Date.now(),
      text: newEntryText.trim()
    };
    const entries = [...(dayNote.entries || []), newEntry];
    updateDayNote({ entries });
    setNewEntryText('');
  };

  const handleDeleteJournalEntry = (id: string) => {
    const entries = (dayNote.entries || []).filter(e => e.id !== id);
    updateDayNote({ entries });
  };

  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];

  const daysOfWeek = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש (שבת)'];

  // Parse selected date
  const [selYear, selMonth, selDay] = selectedDateKey.split('-').map(Number);
  const selectedDateObj = new Date(selYear, (selMonth || 1) - 1, selDay || 1);
  const isSelectedSaturday = selectedDateObj.getDay() === 6;

  // Selected date week summary
  const selectedWeekSummary = getWeekSummaryForDate(state, selYear, (selMonth || 1) - 1, selDay || 1, state.selectedAccount);

  // Day's trades
  const selectedTrades = state.trades
    .filter(t => (state.selectedAccount === 'ALL' || t.account === state.selectedAccount) && dateKey(t.ts) === selectedDateKey)
    .sort((a, b) => a.ts - b.ts);

  const selectedNet = selectedTrades.reduce((s, t) => s + t.netPnl, 0);

  // Calculate monthly stats for quick summary
  const monthPrefix = `${year}-${pad2(month + 1)}`;
  const monthTrades = state.trades.filter(t => {
    if (state.selectedAccount !== 'ALL' && t.account !== state.selectedAccount) return false;
    return dateKey(t.ts).startsWith(monthPrefix);
  });
  const monthNet = monthTrades.reduce((s, t) => s + t.netPnl, 0);
  const monthWins = monthTrades.filter(t => t.outcome === 'WIN').length;
  const monthWr = monthTrades.length ? (monthWins / monthTrades.length) * 100 : 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Month Navigator & Monthly Total Banner */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 rounded-lg bg-[var(--panel2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition"
          >
            <ChevronRight size={18} />
          </button>
          <div className="text-center">
            <div className="font-extrabold text-sm text-[var(--text)]">
              {hebrewMonths[month]} {year}
            </div>
            <div className="text-[10px] text-[var(--text-faint)]">
              סה״כ חודשי: <span className={`font-mono font-bold ${monthNet >= 0 ? 'pos' : 'neg'}`}>{fmtMoney(monthNet)}</span> · {monthTrades.length} עסקאות ({monthWr.toFixed(0)}%)
            </div>
          </div>
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg bg-[var(--panel2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-3 shadow-lg">
        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-[var(--text-faint)] mb-1.5">
          {daysOfWeek.map((d, i) => (
            <div
              key={i}
              className={`py-1 rounded ${i === 6 ? 'text-amber-400 bg-amber-500/10 font-black' : ''}`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before month starts */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty_${i}`} className="min-h-[66px] rounded-xl bg-transparent" />
          ))}

          {/* Month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dk = `${year}-${pad2(month + 1)}-${pad2(dayNum)}`;
            const dData = tradesByDate[dk];
            const isSelected = selectedDateKey === dk;
            const isToday = dk === todayKey();
            const colIndex = (firstDay + i) % 7;
            const isSaturday = colIndex === 6;

            // Compute weekly summary for Saturday cell
            let satWeekSummary: WeekSummaryData | null = null;
            if (isSaturday) {
              satWeekSummary = getWeekSummaryForDate(state, year, month, dayNum, state.selectedAccount);
            }

            // Cell background & style based on profit / loss / saturday
            let cellStyle = 'bg-[var(--panel2)]/70 border-[var(--border-soft)] text-[var(--text-dim)] hover:border-[var(--border)]';
            let amountContent = <span className="text-[9px] text-[var(--text-faint)]">—</span>;

            if (isSaturday && satWeekSummary) {
              // Saturday displays the weekly summary
              const hasWeekTrades = satWeekSummary.count > 0;
              const wNet = satWeekSummary.net;

              if (hasWeekTrades) {
                if (wNet > 0) {
                  cellStyle = 'bg-gradient-to-b from-[#064e3b]/95 to-[#022c22]/95 border-emerald-500 text-emerald-300 shadow-[0_2px_8px_rgba(16,185,129,0.25)]';
                  amountContent = (
                    <div className="w-full flex flex-col items-center">
                      <span className="text-[8px] font-extrabold text-emerald-400 leading-none">שבועי</span>
                      <span className="text-[10.5px] sm:text-xs font-mono font-black text-emerald-300 tracking-tight leading-tight">
                        {fmtShortMoney(wNet)}
                      </span>
                    </div>
                  );
                } else if (wNet < 0) {
                  cellStyle = 'bg-gradient-to-b from-[#4c0519]/95 to-[#2c040e]/95 border-rose-500 text-rose-300 shadow-[0_2px_8px_rgba(244,63,94,0.25)]';
                  amountContent = (
                    <div className="w-full flex flex-col items-center">
                      <span className="text-[8px] font-extrabold text-rose-400 leading-none">שבועי</span>
                      <span className="text-[10.5px] sm:text-xs font-mono font-black text-rose-300 tracking-tight leading-tight">
                        {fmtShortMoney(wNet)}
                      </span>
                    </div>
                  );
                } else {
                  cellStyle = 'bg-slate-800/90 border-slate-600 text-slate-300';
                  amountContent = (
                    <div className="w-full flex flex-col items-center">
                      <span className="text-[8px] font-extrabold text-slate-400 leading-none">שבועי</span>
                      <span className="text-[10.5px] font-mono font-bold text-slate-300">$0</span>
                    </div>
                  );
                }
              } else {
                cellStyle = 'bg-amber-500/5 border-amber-500/20 text-amber-300/80 hover:border-amber-500/40';
                amountContent = (
                  <div className="w-full flex flex-col items-center">
                    <span className="text-[7.5px] font-bold text-amber-400/70">שבועי</span>
                    <span className="text-[9px] text-[var(--text-faint)]">—</span>
                  </div>
                );
              }
            } else if (dData && dData.count > 0) {
              // Regular weekday with trades: colored green or red with clearly visible amount
              if (dData.net > 0) {
                cellStyle = 'bg-gradient-to-b from-[#064e3b]/95 to-[#022c22]/95 border-emerald-500 text-emerald-200 shadow-[0_2px_8px_rgba(16,185,129,0.2)]';
                amountContent = (
                  <div className="w-full text-center">
                    <span className="text-[11px] sm:text-xs font-mono font-black text-emerald-300 tracking-tight block leading-tight">
                      {fmtShortMoney(dData.net)}
                    </span>
                    <span className="text-[8px] font-mono text-emerald-400/80 block leading-none mt-0.5">
                      {dData.count} עס׳
                    </span>
                  </div>
                );
              } else if (dData.net < 0) {
                cellStyle = 'bg-gradient-to-b from-[#4c0519]/95 to-[#2c040e]/95 border-rose-500 text-rose-200 shadow-[0_2px_8px_rgba(244,63,94,0.2)]';
                amountContent = (
                  <div className="w-full text-center">
                    <span className="text-[11px] sm:text-xs font-mono font-black text-rose-300 tracking-tight block leading-tight">
                      {fmtShortMoney(dData.net)}
                    </span>
                    <span className="text-[8px] font-mono text-rose-400/80 block leading-none mt-0.5">
                      {dData.count} עס׳
                    </span>
                  </div>
                );
              } else {
                cellStyle = 'bg-slate-800/90 border-slate-600 text-slate-200';
                amountContent = (
                  <div className="w-full text-center">
                    <span className="text-[10px] font-mono font-bold text-slate-300 block">$0</span>
                    <span className="text-[8px] font-mono text-slate-400 block">{dData.count} עס׳</span>
                  </div>
                );
              }
            }

            return (
              <button
                key={dk}
                type="button"
                onClick={() => setSelectedDateKey(dk)}
                className={`min-h-[66px] sm:min-h-[72px] p-1.5 rounded-xl flex flex-col justify-between items-center transition-all relative border ${cellStyle} ${
                  isSelected
                    ? 'ring-2 ring-cyan-400 border-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.45)] scale-[1.02] z-10'
                    : ''
                }`}
                title={isSaturday ? `שבת ${dayNum} - סיכום שבועי` : `יום ${dayNum}`}
              >
                {/* Header of day cell */}
                <div className="flex justify-between items-center w-full">
                  <span
                    className={`text-[10.5px] font-extrabold font-mono leading-none ${
                      isToday
                        ? 'text-cyan-400 ring-1 ring-cyan-400/50 px-1 py-0.5 rounded-md bg-cyan-950/60'
                        : isSaturday
                        ? 'text-amber-400'
                        : 'text-[var(--text)]'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {isSaturday ? (
                    <span className="text-[7.5px] font-black uppercase text-amber-400 px-1 py-0.2 rounded bg-amber-500/20">
                      שבת
                    </span>
                  ) : dData && (
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-none"
                      style={{ backgroundColor: dData.net >= 0 ? '#34d399' : '#f43f5e' }}
                    />
                  )}
                </div>

                {/* Amount / Content */}
                <div className="w-full py-0.5 flex items-center justify-center">
                  {amountContent}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Saturday Weekly Recap Drawer (when Saturday is selected) */}
      {isSelectedSaturday && (
        <div className="bg-gradient-to-br from-[#0c1626] to-[#0a101b] border-2 border-amber-500/40 rounded-2xl p-4 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Award size={18} className="text-amber-400" />
              <div>
                <span className="text-xs font-black text-amber-300 block">
                  סיכום שבועי של רווח והפסד
                </span>
                <span className="text-[10px] text-[var(--text-faint)]">
                  שבוע מ-{fmtDateHe(selectedWeekSummary.startDate)} עד {fmtDateHe(selectedWeekSummary.endDate)}
                </span>
              </div>
            </div>

            <div className="text-left font-mono">
              <span
                className={`text-sm sm:text-base font-black ${
                  selectedWeekSummary.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {fmtMoney(selectedWeekSummary.net)}
              </span>
              <span className="text-[9.5px] text-[var(--text-faint)] block">
                {selectedWeekSummary.count} עסקאות
              </span>
            </div>
          </div>

          {/* Quick Weekly Stats Grid */}
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
              <div className="text-[9px] text-[var(--text-faint)] font-bold">עסקאות שבוע</div>
              <div className="font-mono font-black text-[var(--text)] mt-0.5">{selectedWeekSummary.count}</div>
            </div>
            <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
              <div className="text-[9px] text-[var(--text-faint)] font-bold">אחוז הצלחה</div>
              <div className="font-mono font-black text-[var(--text)] mt-0.5">
                {selectedWeekSummary.winRate.toFixed(0)}%
              </div>
            </div>
            <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
              <div className="text-[9px] text-emerald-400 font-bold">ימים ירוקים</div>
              <div className="font-mono font-black text-emerald-400 mt-0.5">{selectedWeekSummary.greenDays}</div>
            </div>
            <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
              <div className="text-[9px] text-rose-400 font-bold">ימים אדומים</div>
              <div className="font-mono font-black text-rose-400 mt-0.5">{selectedWeekSummary.redDays}</div>
            </div>
          </div>

          {/* Weekly Trades Breakdown */}
          {selectedWeekSummary.trades.length > 0 ? (
            <div className="space-y-1.5 pt-1">
              <div className="text-[10.5px] font-bold text-[var(--text-dim)]">
                עסקאות השבוע ({selectedWeekSummary.trades.length}):
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {selectedWeekSummary.trades.map(t => (
                  <div
                    key={t.id}
                    className="flex justify-between items-center text-xs p-2 rounded-lg bg-[var(--panel2)] font-mono border border-[var(--border-soft)]"
                  >
                    <span className="text-[var(--text-dim)] text-[10.5px]">
                      {fmtDateHe(dateKey(t.ts))} · {fmtTimeFromTs(t.ts)} · {t.account} · {t.direction}
                    </span>
                    <span className={`font-black ${t.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtMoney(t.netPnl)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-faint)] text-center py-2 bg-[var(--panel2)] rounded-xl">
              לא בוצעו עסקאות בשבוע זה.
            </div>
          )}
        </div>
      )}

      {/* Selected Day Journal Drawer */}
      <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-cyan-400" />
            <span className="text-xs font-bold text-[var(--text)]">
              יומן מסחר ותובנות · {selectedDateKey} {isSelectedSaturday ? '(שבת)' : ''}
            </span>
          </div>
          {selectedTrades.length > 0 ? (
            <span className={`font-mono text-xs font-black ${selectedNet >= 0 ? 'pos' : 'neg'}`}>
              {fmtMoney(selectedNet)} ({selectedTrades.length} עסקאות)
            </span>
          ) : (
            <span className="text-[10px] text-[var(--text-faint)] font-mono">0 עסקאות ביום זה</span>
          )}
        </div>

        {/* 3 Golden Rules */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-dim)] mb-2">3 חוקי הברזל (משמעת):</div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => updateDayNote({ rule1: !dayNote.rule1 })}
              className="w-full flex items-center gap-2 text-right p-2 rounded-xl bg-[var(--panel3)] border border-[var(--border-soft)] text-xs font-semibold text-[var(--text)] transition"
            >
              {dayNote.rule1 ? <CheckSquare size={16} className="text-[var(--profit)] flex-none" /> : <Square size={16} className="text-[var(--text-faint)] flex-none" />}
              <span>לא נכנסתי לעסקה מתוך רצון לכסות הפסד (No Revenge Trading)</span>
            </button>
            <button
              type="button"
              onClick={() => updateDayNote({ rule2: !dayNote.rule2 })}
              className="w-full flex items-center gap-2 text-right p-2 rounded-xl bg-[var(--panel3)] border border-[var(--border-soft)] text-xs font-semibold text-[var(--text)] transition"
            >
              {dayNote.rule2 ? <CheckSquare size={16} className="text-[var(--profit)] flex-none" /> : <Square size={16} className="text-[var(--text-faint)] flex-none" />}
              <span>חיכיתי לטריגר מדויק ול-R:R מינימלי של 1:2</span>
            </button>
            <button
              type="button"
              onClick={() => updateDayNote({ rule3: !dayNote.rule3 })}
              className="w-full flex items-center gap-2 text-right p-2 rounded-xl bg-[var(--panel3)] border border-[var(--border-soft)] text-xs font-semibold text-[var(--text)] transition"
            >
              {dayNote.rule3 ? <CheckSquare size={16} className="text-[var(--profit)] flex-none" /> : <Square size={16} className="text-[var(--text-faint)] flex-none" />}
              <span>לא הגדלתי גודל פוזיציה אחרי הפסד</span>
            </button>
          </div>
        </div>

        {/* Mental and Performance Star Ratings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[var(--panel3)] rounded-xl p-3">
            <div className="text-[10px] font-bold text-[var(--text-faint)] mb-1.5">מצב מנטלי ורגשי (1-5)</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateDayNote({ mental: v })}
                  className="p-1 hover:scale-110 transition"
                >
                  <Star
                    size={16}
                    className={v <= (dayNote.mental || 3) ? 'fill-amber-400 text-amber-400' : 'text-[var(--text-faint)]'}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[var(--panel3)] rounded-xl p-3">
            <div className="text-[10px] font-bold text-[var(--text-faint)] mb-1.5">איכות ביצוע והיצמדות לתוכנית</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateDayNote({ perf: v })}
                  className="p-1 hover:scale-110 transition"
                >
                  <Star
                    size={16}
                    className={v <= (dayNote.perf || 3) ? 'fill-[var(--profit)] text-[var(--profit)]' : 'text-[var(--text-faint)]'}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thoughts & Notes List */}
        <div>
          <div className="text-[11px] font-bold text-[var(--text-dim)] mb-2">
            {isSelectedSaturday ? 'סיכום שבועי, תובנות ורפלקציה:' : 'תובנות, טעויות ורפלקציה:'}
          </div>
          {(!dayNote.entries || dayNote.entries.length === 0) ? (
            <div className="text-xs text-[var(--text-faint)] py-2 text-center bg-[var(--panel3)] rounded-xl">
              אין עדיין רשומות ליום זה. רשום תובנה מטה.
            </div>
          ) : (
            <div className="space-y-2">
              {dayNote.entries.map(e => (
                <div key={e.id} className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-[var(--panel3)] border border-[var(--border-soft)]">
                  <div className="text-xs text-[var(--text)] whitespace-pre-wrap leading-relaxed flex-1">
                    {e.text}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteJournalEntry(e.id)}
                    className="text-[var(--text-faint)] hover:text-[var(--loss)] p-1 flex-none transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Thought Input */}
          <div className="mt-2.5 flex gap-2">
            <textarea
              rows={2}
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              placeholder={
                isSelectedSaturday
                  ? 'כתוב סיכום שבועי: מה עבד השבוע, האם עמדת בחוקי המסחר ומה לשפר לשבוע הבא...'
                  : 'כתוב מה קרה היום במסחר, איך הרגשת, והאם ביצעת לפי החוקים...'
              }
              className="flex-1 bg-[var(--panel3)] border border-[var(--border-soft)] rounded-xl p-2.5 text-xs text-[var(--text)] outline-none resize-none placeholder:text-[var(--text-faint)]"
            />
            <button
              type="button"
              onClick={handleAddJournalEntry}
              disabled={!newEntryText.trim()}
              className="px-3 rounded-xl bg-[var(--long)] text-black flex items-center justify-center disabled:opacity-40 font-bold text-xs hover:opacity-90 transition flex-none"
            >
              <Send size={15} className="rotate-180" />
            </button>
          </div>
        </div>

        {/* Selected Day's Trades Breakdown */}
        {selectedTrades.length > 0 && (
          <div className="pt-2 border-t border-[var(--border-soft)]">
            <div className="text-[11px] font-bold text-[var(--text-dim)] mb-2">עסקאות היום ({selectedTrades.length}):</div>
            <div className="space-y-1.5">
              {selectedTrades.map(t => (
                <div key={t.id} className="flex justify-between items-center text-xs p-2 rounded-lg bg-[var(--panel3)] font-mono">
                  <span className="text-[var(--text-dim)]">
                    {fmtTimeFromTs(t.ts)} · {t.account} · {t.direction} {t.breakeven ? '(BE)' : ''}
                  </span>
                  <span className={`font-bold ${t.netPnl >= 0 ? 'pos' : 'neg'}`}>
                    {fmtMoney(t.netPnl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
