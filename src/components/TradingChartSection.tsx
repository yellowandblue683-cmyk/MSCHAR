import React, { useState, useMemo, useRef } from 'react';
import { AppState, Trade } from '../types';
import { fmtMoney, fmtShortMoney, dateKey, fmtDateHe, fmtTimeFromTs } from '../utils/tradingCalculations';
import {
  CandlestickChart as CandleIcon,
  LineChart as LineIcon,
  Calendar,
  Zap,
  TrendingUp,
  TrendingDown,
  Info,
  Maximize2,
  ChevronDown
} from 'lucide-react';

interface TradingChartSectionProps {
  state: AppState;
  onUpdateState?: (patch: Partial<AppState>) => void;
}

interface ChartItem {
  id: string;
  label: string;
  subLabel: string;
  ts: number;
  open: number;
  close: number;
  high: number;
  low: number;
  pnl: number;
  cumulative: number;
  isWin: boolean;
  tradeCount: number;
  direction?: 'LONG' | 'SHORT';
  account?: string;
}

export const TradingChartSection: React.FC<TradingChartSectionProps> = ({ state, onUpdateState }) => {
  // Mode: 'candle' or 'line'
  const chartType = state.chartType || 'candle';
  const setChartType = (t: 'candle' | 'line') => {
    if (onUpdateState) onUpdateState({ chartType: t });
  };

  // Grouping: 'day' or 'trade'
  const chartGroup = state.chartGroup || 'day';
  const setChartGroup = (g: 'day' | 'trade') => {
    if (onUpdateState) onUpdateState({ chartGroup: g });
  };

  // Time range: 'all', '30d', 'month', 'week'
  const [timeRange, setTimeRange] = useState<'all' | '30d' | 'month' | 'week'>('all');
  const [showMA, setShowMA] = useState(state.chartShowMA ?? true);
  const [hoveredItem, setHoveredItem] = useState<ChartItem | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Filter trades based on selected account and time range
  const filteredTrades = useMemo(() => {
    let list = state.trades.filter(t => state.selectedAccount === 'ALL' || t.account === state.selectedAccount);
    list = list.sort((a, b) => a.ts - b.ts);

    if (timeRange === 'all') return list;

    const now = Date.now();
    if (timeRange === '30d') {
      const cut = now - 30 * 24 * 60 * 60 * 1000;
      return list.filter(t => t.ts >= cut);
    }
    if (timeRange === 'month') {
      const d = new Date();
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      return list.filter(t => t.ts >= startOfMonth);
    }
    if (timeRange === 'week') {
      const d = new Date();
      const day = d.getDay(); // 0 is Sun
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - day);
      startOfWeek.setHours(0, 0, 0, 0);
      return list.filter(t => t.ts >= startOfWeek.getTime());
    }
    return list;
  }, [state.trades, state.selectedAccount, timeRange]);

  // Build chart items depending on grouping ('day' or 'trade')
  const chartItems: ChartItem[] = useMemo(() => {
    if (filteredTrades.length === 0) return [];

    if (chartGroup === 'trade') {
      // Trade-by-trade progression
      let runningEquity = 0;
      return filteredTrades.map((t, idx) => {
        const prevEquity = runningEquity;
        runningEquity += t.netPnl;
        const open = prevEquity;
        const close = runningEquity;
        // Wicks reflect intra-trade extremes or buffer
        const high = Math.max(open, close) + (t.outcome === 'WIN' ? Math.abs(t.grossPnl - t.netPnl) : 0);
        const low = Math.min(open, close) - (t.outcome === 'LOSE' ? Math.abs(t.commission) : 0);

        return {
          id: t.id,
          label: `#${idx + 1} ${t.direction}`,
          subLabel: `${fmtDateHe(dateKey(t.ts))} ${fmtTimeFromTs(t.ts)}`,
          ts: t.ts,
          open,
          close,
          high,
          low,
          pnl: t.netPnl,
          cumulative: runningEquity,
          isWin: t.netPnl >= 0,
          tradeCount: 1,
          direction: t.direction,
          account: t.account
        };
      });
    } else {
      // Group by Day
      const byDay: Record<string, Trade[]> = {};
      filteredTrades.forEach(t => {
        const dk = dateKey(t.ts);
        if (!byDay[dk]) byDay[dk] = [];
        byDay[dk].push(t);
      });

      const dayKeys = Object.keys(byDay).sort();
      let cumulativeEquity = 0;

      return dayKeys.map(dk => {
        const dayTrades = byDay[dk].sort((a, b) => a.ts - b.ts);
        const dayStartEquity = cumulativeEquity;
        let dayRunning = dayStartEquity;
        let dayHigh = dayStartEquity;
        let dayLow = dayStartEquity;

        dayTrades.forEach(t => {
          dayRunning += t.netPnl;
          if (dayRunning > dayHigh) dayHigh = dayRunning;
          if (dayRunning < dayLow) dayLow = dayRunning;
        });

        const dayEndEquity = dayRunning;
        cumulativeEquity = dayEndEquity;
        const dayNet = dayEndEquity - dayStartEquity;

        return {
          id: dk,
          label: fmtDateHe(dk),
          subLabel: `${dayTrades.length} עסקאות`,
          ts: dayTrades[0]?.ts || 0,
          open: dayStartEquity,
          close: dayEndEquity,
          high: Math.max(dayHigh, dayStartEquity, dayEndEquity),
          low: Math.min(dayLow, dayStartEquity, dayEndEquity),
          pnl: dayNet,
          cumulative: dayEndEquity,
          isWin: dayNet >= 0,
          tradeCount: dayTrades.length
        };
      });
    }
  }, [filteredTrades, chartGroup]);

  // Overall statistics for the selected data
  const stats = useMemo(() => {
    if (chartItems.length === 0) {
      return { totalNet: 0, peak: 0, maxDrawdown: 0, winRate: 0, count: 0 };
    }
    const totalNet = chartItems[chartItems.length - 1].cumulative;
    let peak = 0;
    let maxDrawdown = 0;
    let wins = 0;

    chartItems.forEach(item => {
      if (item.cumulative > peak) peak = item.cumulative;
      const dd = peak - item.cumulative;
      if (dd > maxDrawdown) maxDrawdown = dd;
      if (item.pnl > 0) wins++;
    });

    const winRate = chartItems.length ? (wins / chartItems.length) * 100 : 0;
    return {
      totalNet,
      peak,
      maxDrawdown,
      winRate,
      count: chartItems.length
    };
  }, [chartItems]);

  // Calculate Chart Boundaries with STRICT $100 intervals:
  // User explicitly asked: "תסמן כל מאה דולר פלוס או מיוס עם קויוים"
  const chartBounds = useMemo(() => {
    if (chartItems.length === 0) {
      return { minVal: -200, maxVal: 200, levels: [-200, -100, 0, 100, 200] };
    }

    let min = 0;
    let max = 0;
    chartItems.forEach(it => {
      min = Math.min(min, it.low, it.open, it.close, it.cumulative);
      max = Math.max(max, it.high, it.open, it.close, it.cumulative);
    });

    // Expand to nearest $100 steps
    let minLevel = Math.floor(min / 100) * 100;
    let maxLevel = Math.ceil(max / 100) * 100;

    // Ensure we have padding and at least $100 above and below zero
    if (minLevel >= 0) minLevel = -100;
    if (maxLevel <= 0) maxLevel = 100;
    if (maxLevel - minLevel < 300) {
      minLevel -= 100;
      maxLevel += 100;
    }

    // Generate EVERY $100 step line: ... -200, -100, 0, 100, 200, 300 ...
    const levels: number[] = [];
    for (let l = minLevel; l <= maxLevel; l += 100) {
      levels.push(l);
    }

    return { minVal: minLevel, maxVal: maxLevel, levels };
  }, [chartItems]);

  // Moving Average 5 periods
  const maPoints = useMemo(() => {
    if (!showMA || chartItems.length < 2) return [];
    const period = Math.min(5, chartItems.length);
    const result: { index: number; val: number }[] = [];

    for (let i = 0; i < chartItems.length; i++) {
      const start = Math.max(0, i - period + 1);
      const slice = chartItems.slice(start, i + 1);
      const avg = slice.reduce((s, it) => s + it.cumulative, 0) / slice.length;
      result.push({ index: i, val: avg });
    }
    return result;
  }, [chartItems, showMA]);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 320;
  const paddingLeft = 10;
  const paddingRight = 65; // Room for $100 labels
  const paddingTop = 20;
  const paddingBottom = 30;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const getY = (val: number) => {
    const range = chartBounds.maxVal - chartBounds.minVal;
    if (range <= 0) return paddingTop + plotHeight / 2;
    const ratio = (val - chartBounds.minVal) / range;
    return paddingTop + (1 - ratio) * plotHeight;
  };

  const getX = (index: number) => {
    const count = chartItems.length;
    if (count <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (count - 1)) * plotWidth;
  };

  const barWidth = useMemo(() => {
    const count = chartItems.length;
    if (count <= 1) return 30;
    const step = plotWidth / count;
    return Math.max(6, Math.min(26, step * 0.7));
  }, [chartItems.length, plotWidth]);

  return (
    <div className="bg-[var(--panel)] border border-[var(--border-soft)] rounded-2xl p-4 space-y-3.5 shadow-xl">
      {/* Top Header & Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-soft)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[var(--long-dim)] text-[var(--long)] border border-[var(--long)]/30 flex items-center justify-center">
            {chartType === 'candle' ? <CandleIcon size={18} /> : <LineIcon size={18} />}
          </div>
          <div>
            <div className="text-xs font-black text-[var(--text)] flex items-center gap-1.5">
              <span>גרף ביצועים ורווח/הפסד (P&L)</span>
              <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-[var(--panel3)] font-mono text-cyan-400 font-bold border border-[var(--border-soft)]">
                קווים כל 100$
              </span>
            </div>
            <div className="text-[10px] text-[var(--text-faint)]">
              {chartGroup === 'day' ? 'מפגשי מסחר יומיים (Daily Sessions)' : 'עסקה אחר עסקה (Trade-by-Trade)'}
            </div>
          </div>
        </div>

        {/* Chart Type Toggle: Candlesticks vs Lines */}
        <div className="flex items-center gap-1 bg-[var(--panel2)] p-1 rounded-xl border border-[var(--border-soft)]">
          <button
            type="button"
            onClick={() => setChartType('candle')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              chartType === 'candle'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            <CandleIcon size={13} />
            <span>נרות</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
              chartType === 'line'
                ? 'bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black shadow-sm'
                : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            <LineIcon size={13} />
            <span>קווים</span>
          </button>
        </div>
      </div>

      {/* Filter Strip: Grouping & Time Range */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Grouping: Daily or Per-Trade */}
        <div className="flex items-center gap-1 bg-[var(--panel3)] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setChartGroup('day')}
            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
              chartGroup === 'day' ? 'bg-[var(--long)] text-black' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            📅 לפי יום
          </button>
          <button
            type="button"
            onClick={() => setChartGroup('trade')}
            className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
              chartGroup === 'trade' ? 'bg-[var(--long)] text-black' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
            }`}
          >
            ⚡ לפי עסקה
          </button>
        </div>

        {/* Timeframe Range */}
        <div className="flex items-center gap-1 bg-[var(--panel3)] p-1 rounded-xl">
          {[
            { id: 'all', label: 'הכל' },
            { id: '30d', label: '30 יום' },
            { id: 'month', label: 'חודש' },
            { id: 'week', label: 'שבוע' }
          ].map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => setTimeRange(r.id as any)}
              className={`px-2 py-0.5 rounded-lg text-[10.5px] font-bold transition ${
                timeRange === r.id ? 'bg-[var(--text)] text-black' : 'text-[var(--text-dim)] hover:text-[var(--text)]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* MA Toggle */}
        <button
          type="button"
          onClick={() => setShowMA(!showMA)}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
            showMA
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-[var(--panel3)] text-[var(--text-faint)] border-transparent'
          }`}
        >
          <span className="w-2 h-0.5 bg-amber-400 rounded-full" />
          <span>ממוצע נע (SMA 5)</span>
        </button>
      </div>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
          <div className="text-[9px] text-[var(--text-faint)] font-bold">רווח מצטבר</div>
          <div className={`font-mono text-xs sm:text-sm font-black mt-0.5 ${stats.totalNet >= 0 ? 'pos' : 'neg'}`}>
            {fmtMoney(stats.totalNet)}
          </div>
        </div>
        <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
          <div className="text-[9px] text-emerald-400 font-bold">שיא רווח</div>
          <div className="font-mono text-xs sm:text-sm font-black text-emerald-300 mt-0.5">
            {fmtMoney(stats.peak)}
          </div>
        </div>
        <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
          <div className="text-[9px] text-rose-400 font-bold">Drawdown מקס׳</div>
          <div className="font-mono text-xs sm:text-sm font-black text-rose-300 mt-0.5">
            -{fmtMoney(stats.maxDrawdown).replace('-', '')}
          </div>
        </div>
        <div className="bg-[var(--panel2)] border border-[var(--border-soft)] rounded-xl p-2">
          <div className="text-[9px] text-cyan-400 font-bold">אחוז הצלחה</div>
          <div className="font-mono text-xs sm:text-sm font-black text-cyan-300 mt-0.5">
            {stats.winRate.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Main Graph SVG Container */}
      <div className="relative w-full bg-[#080d15] border border-[var(--border-soft)] rounded-2xl overflow-hidden select-none p-1 shadow-inner">
        {chartItems.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-[var(--text-faint)] space-y-2">
            <Info size={28} className="text-cyan-400/60" />
            <div className="text-xs font-bold text-[var(--text)]">אין נתונים להצגה בטווח זה</div>
            <div className="text-[10px]">בחר טווח זמן רחב יותר או הזן עסקאות חדשות בטאב עסקאות.</div>
          </div>
        ) : (
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible font-mono"
            >
              <defs>
                <linearGradient id="equityGradientPos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="equityGradientNeg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid lines at EVERY $100 level (as user requested!) */}
              {chartBounds.levels.map(lvl => {
                const y = getY(lvl);
                const isZero = lvl === 0;
                const isPos = lvl > 0;
                const isNeg = lvl < 0;

                return (
                  <g key={`grid_${lvl}`}>
                    {/* Line across width */}
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      stroke={
                        isZero
                          ? 'rgba(255, 255, 255, 0.45)'
                          : isPos
                          ? 'rgba(16, 185, 129, 0.28)'
                          : 'rgba(244, 63, 94, 0.28)'
                      }
                      strokeWidth={isZero ? 1.5 : 1}
                      strokeDasharray={isZero ? '0' : '4 4'}
                    />

                    {/* Y-Axis Label Pill at every $100 on the right */}
                    <g transform={`translate(${svgWidth - paddingRight + 6}, ${y})`}>
                      <rect
                        x="-3"
                        y="-8"
                        width="54"
                        height="16"
                        rx="4"
                        fill={isZero ? '#1e293b' : isPos ? 'rgba(6, 78, 59, 0.9)' : 'rgba(76, 5, 25, 0.9)'}
                        stroke={isZero ? 'rgba(255,255,255,0.2)' : isPos ? 'rgba(16,185,129,0.5)' : 'rgba(244,63,94,0.5)'}
                        strokeWidth="1"
                      />
                      <text
                        x="24"
                        y="3.5"
                        textAnchor="middle"
                        fontSize="9.5"
                        fontWeight="800"
                        fill={isZero ? '#e2e8f0' : isPos ? '#34d399' : '#fb7185'}
                      >
                        {lvl === 0 ? '$0' : fmtShortMoney(lvl)}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* If Line Mode: draw equity curve & area */}
              {chartType === 'line' && (
                <>
                  {/* Shaded Area under curve to 0 */}
                  <path
                    d={(() => {
                      const zeroY = getY(0);
                      const points = chartItems.map((it, idx) => `${getX(idx)},${getY(it.cumulative)}`);
                      return `M ${getX(0)},${zeroY} L ${points.join(' L ')} L ${getX(chartItems.length - 1)},${zeroY} Z`;
                    })()}
                    fill={stats.totalNet >= 0 ? 'url(#equityGradientPos)' : 'url(#equityGradientNeg)'}
                  />

                  {/* Main Equity Polyline */}
                  <polyline
                    fill="none"
                    stroke={stats.totalNet >= 0 ? '#34d399' : '#fb7185'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={chartItems.map((it, idx) => `${getX(idx)},${getY(it.cumulative)}`).join(' ')}
                  />

                  {/* Dots on line */}
                  {chartItems.map((it, idx) => {
                    const cx = getX(idx);
                    const cy = getY(it.cumulative);
                    const isHovered = hoveredItem?.id === it.id;
                    return (
                      <circle
                        key={`pt_${it.id}`}
                        cx={cx}
                        cy={cy}
                        r={isHovered ? 6 : 3.5}
                        fill={it.pnl >= 0 ? '#10b981' : '#f43f5e'}
                        stroke="#ffffff"
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all cursor-pointer"
                        onMouseEnter={() => {
                          setHoveredItem(it);
                          setHoverPos({ x: cx, y: cy });
                        }}
                        onTouchStart={() => {
                          setHoveredItem(it);
                          setHoverPos({ x: cx, y: cy });
                        }}
                      />
                    );
                  })}
                </>
              )}

              {/* If Candlestick Mode: draw real candlesticks */}
              {chartType === 'candle' && (
                <>
                  {chartItems.map((it, idx) => {
                    const cx = getX(idx);
                    const yOpen = getY(it.open);
                    const yClose = getY(it.close);
                    const yHigh = getY(it.high);
                    const yLow = getY(it.low);

                    const isBullish = it.close >= it.open;
                    const bodyTop = Math.min(yOpen, yClose);
                    const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
                    const isHovered = hoveredItem?.id === it.id;

                    const candleColor = isBullish ? '#10b981' : '#f43f5e';
                    const candleBorder = isBullish ? '#34d399' : '#fb7185';

                    return (
                      <g
                        key={`candle_${it.id}`}
                        className="cursor-pointer transition-opacity"
                        opacity={hoveredItem && !isHovered ? 0.6 : 1}
                        onMouseEnter={() => {
                          setHoveredItem(it);
                          setHoverPos({ x: cx, y: bodyTop });
                        }}
                        onTouchStart={() => {
                          setHoveredItem(it);
                          setHoverPos({ x: cx, y: bodyTop });
                        }}
                      >
                        {/* High to Low Wick */}
                        <line
                          x1={cx}
                          y1={yHigh}
                          x2={cx}
                          y2={yLow}
                          stroke={candleBorder}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />

                        {/* Candle Body */}
                        <rect
                          x={cx - barWidth / 2}
                          y={bodyTop}
                          width={barWidth}
                          height={bodyHeight}
                          rx="2"
                          fill={candleColor}
                          stroke={candleBorder}
                          strokeWidth={isHovered ? 2 : 1}
                          filter={isHovered ? 'drop-shadow(0 0 6px rgba(52,211,153,0.8))' : undefined}
                        />

                        {/* Optional trade count label under candle */}
                        {barWidth >= 14 && (
                          <text
                            x={cx}
                            y={svgHeight - paddingBottom + 12}
                            textAnchor="middle"
                            fontSize="8"
                            fill="#64748b"
                          >
                            {idx + 1}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              )}

              {/* Moving Average Line (SMA 5) */}
              {showMA && maPoints.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeDasharray="3 3"
                  strokeLinecap="round"
                  points={maPoints.map(p => `${getX(p.index)},${getY(p.val)}`).join(' ')}
                />
              )}

              {/* Crosshair indicator when hovering */}
              {hoveredItem && hoverPos && (
                <g>
                  {/* Vertical line */}
                  <line
                    x1={hoverPos.x}
                    y1={paddingTop}
                    x2={hoverPos.x}
                    y2={svgHeight - paddingBottom}
                    stroke="rgba(255, 255, 255, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                </g>
              )}
            </svg>

            {/* Floating Details Tooltip */}
            {hoveredItem && (
              <div className="mt-2 p-2.5 rounded-xl bg-[var(--panel2)] border border-[var(--border)] shadow-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      hoveredItem.pnl >= 0 ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <div>
                    <span className="font-bold text-[var(--text)] block text-[11px]">
                      {hoveredItem.label} · {hoveredItem.subLabel}
                    </span>
                    {hoveredItem.account && (
                      <span className="text-[9.5px] text-[var(--text-faint)]">
                        חשבון: {hoveredItem.account} · כיוון: {hoveredItem.direction}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <div className="text-right">
                    <span className="text-[9px] text-[var(--text-faint)] block">רווח/הפסד פריט:</span>
                    <span className={`font-black text-xs ${hoveredItem.pnl >= 0 ? 'pos' : 'neg'}`}>
                      {fmtMoney(hoveredItem.pnl)}
                    </span>
                  </div>
                  <div className="text-right border-r border-[var(--border-soft)] pr-3">
                    <span className="text-[9px] text-[var(--text-faint)] block">P&L מצטבר:</span>
                    <span className={`font-black text-xs ${hoveredItem.cumulative >= 0 ? 'pos' : 'neg'}`}>
                      {fmtMoney(hoveredItem.cumulative)}
                    </span>
                  </div>
                  {chartType === 'candle' && (
                    <div className="hidden sm:flex items-center gap-2 text-[9.5px] text-[var(--text-dim)] border-r border-[var(--border-soft)] pr-3">
                      <span>O: {fmtShortMoney(hoveredItem.open)}</span>
                      <span>H: {fmtShortMoney(hoveredItem.high)}</span>
                      <span>L: {fmtShortMoney(hoveredItem.low)}</span>
                      <span>C: {fmtShortMoney(hoveredItem.close)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Helpful Instructions & Legend */}
      <div className="flex items-center justify-between text-[10px] text-[var(--text-faint)] px-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>נר ירוק (רווח)</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span>נר אדום (הפסד)</span>
          </span>
          {showMA && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-amber-400" />
              <span>ממוצע נע SMA 5</span>
            </span>
          )}
        </div>
        <span>לחץ או רחף על נר לפרטים מלאים</span>
      </div>
    </div>
  );
};
