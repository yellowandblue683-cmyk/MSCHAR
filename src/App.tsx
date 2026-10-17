import React, { useState, useEffect } from 'react';
import { AppState, Trade } from './types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_MAX_DAILY_LOSS,
  DEFAULT_THEME,
  DEFAULT_FONT,
  STORAGE_KEY,
  COMMISSION_PER_CONTRACT,
  TICK_VALUE,
  ATR_TIERS,
  pad2
} from './data/constants';
import { ANCIENT_TRADES } from './data/ancientTrades';
import { Topbar } from './components/Topbar';
import { BottomNav } from './components/BottomNav';
import { TradeEntryView } from './components/TradeEntryView';
import { AnalyticsView } from './components/AnalyticsView';
import { CalendarJournalView } from './components/CalendarJournalView';
import { AIAssistantView } from './components/AIAssistantView';
import { AncientView } from './components/AncientView';
import { SettingsModal } from './components/SettingsModal';
import { BreakevenModal } from './components/BreakevenModal';
import { HistoryModal } from './components/HistoryModal';
import { offsetDateKey, getEntryStatusV2 } from './utils/tradingCalculations';
import { CustomStatMetric } from './types';

const DEFAULT_CUSTOM_METRICS: CustomStatMetric[] = [
  {
    id: 'cm_1',
    label: 'יעד רווח חודשי',
    value: '$3,000',
    category: 'target',
    color: 'pos',
    updatedAt: Date.now(),
    description: 'יעד חודשי לכלל החשבונות הממומנים'
  },
  {
    id: 'cm_2',
    label: 'Drawdown מקסימלי מותר',
    value: '$1,500',
    category: 'rule',
    color: 'neg',
    updatedAt: Date.now(),
    description: 'רף עצירה קשיח לכל חשבון'
  },
  {
    id: 'cm_3',
    label: 'יתרת חשבונות משולבת',
    value: '$52,800',
    category: 'metric',
    color: 'gold',
    updatedAt: Date.now(),
    description: 'סך יתרה פעילה כוללת'
  },
  {
    id: 'cm_4',
    label: 'יעד עסקאות מנצחות ברצף',
    value: '3 עסקאות',
    category: 'target',
    color: 'cyan',
    updatedAt: Date.now(),
    description: 'משמעת כניסה לפי VWAP בלבד'
  }
];

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const accounts = Array.isArray(parsed.accounts) && parsed.accounts.length > 0
            ? parsed.accounts
            : DEFAULT_ACCOUNTS.slice();
          const trades = Array.isArray(parsed.trades)
            ? parsed.trades
            : ANCIENT_TRADES.slice();

          return {
            ...parsed,
            accounts,
            trades,
            selectedAccount: parsed.selectedAccount || 'ALL',
            maxDailyLoss: typeof parsed.maxDailyLoss === 'number' ? parsed.maxDailyLoss : DEFAULT_MAX_DAILY_LOSS,
            dayNotes: parsed.dayNotes && typeof parsed.dayNotes === 'object' ? parsed.dayNotes : {},
            atrRanges: parsed.atrRanges && typeof parsed.atrRanges === 'object' ? parsed.atrRanges : {
              'APEX-25K-01': 't2',
              'APEX-25K-02': 't2',
              'TOPSTEP-50K': 't3',
              'PERSONAL-NQ': 't2'
            },
            theme: parsed.theme || DEFAULT_THEME,
            font: parsed.font || DEFAULT_FONT,
            activeTab: parsed.activeTab || 'entry',
            entryDateOffset: typeof parsed.entryDateOffset === 'number' ? parsed.entryDateOffset : 0,
            formAccount: parsed.formAccount && accounts.includes(parsed.formAccount) ? parsed.formAccount : accounts[0],
            formDirection: parsed.formDirection || 'LONG',
            formVwap: parsed.formVwap !== undefined ? parsed.formVwap : true,
            formContracts: typeof parsed.formContracts === 'number' ? parsed.formContracts : 1,
            formOutcome: parsed.formOutcome || 'WIN',
            formRR: parsed.formRR || '2',
            formCustomGross: parsed.formCustomGross !== undefined ? parsed.formCustomGross : null,
            formTime: parsed.formTime || (() => {
              const d = new Date();
              return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
            })(),
            dashboardEditMode: !!parsed.dashboardEditMode,
            widgetLabels: parsed.widgetLabels && typeof parsed.widgetLabels === 'object' ? parsed.widgetLabels : {},
            customMetrics: Array.isArray(parsed.customMetrics) && parsed.customMetrics.length > 0 ? parsed.customMetrics : DEFAULT_CUSTOM_METRICS,
            selectedAIModel: parsed.selectedAIModel || 'auto',
            enableWebSearch: parsed.enableWebSearch !== undefined ? parsed.enableWebSearch : true
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse local storage state, using defaults:', e);
    }

    const now = new Date();
    const defaultTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    return {
      trades: ANCIENT_TRADES.slice(),
      accounts: DEFAULT_ACCOUNTS.slice(),
      selectedAccount: 'ALL',
      maxDailyLoss: DEFAULT_MAX_DAILY_LOSS,
      atrRanges: {
        'APEX-25K-01': 't2',
        'APEX-25K-02': 't2',
        'TOPSTEP-50K': 't3',
        'PERSONAL-NQ': 't2'
      },
      dayNotes: {},
      theme: DEFAULT_THEME,
      font: DEFAULT_FONT,
      activeTab: 'entry',
      entryDateOffset: 0,
      formAccount: DEFAULT_ACCOUNTS[0],
      formDirection: 'LONG',
      formVwap: true,
      formContracts: 1,
      formOutcome: 'WIN',
      formTime: defaultTime,
      formRR: '2',
      formCustomGross: null,
      dashboardEditMode: false,
      widgetLabels: {},
      customMetrics: DEFAULT_CUSTOM_METRICS,
      selectedAIModel: 'auto',
      enableWebSearch: true
    };
  });

  // Modal visibility states
  const [showSettings, setShowSettings] = useState(false);
  const [showBreakeven, setShowBreakeven] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  // Apply theme and font to document body
  useEffect(() => {
    document.body.className = '';
    if (state.theme && state.theme !== 'navy') {
      document.body.classList.add(`theme-${state.theme}`);
    }
    if (state.font && state.font !== 'rubik') {
      document.body.classList.add(`font-${state.font}`);
    }
  }, [state.theme, state.font]);

  const updateState = (patch: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...patch }));
  };

  const handleSelectAccount = (acc: string) => {
    updateState({
      selectedAccount: acc,
      formAccount: acc === 'ALL' ? (state.accounts[0] || '') : acc
    });
  };

  // Submit standard trade
  const handleSubmitTrade = () => {
    const acct = state.formAccount && state.accounts.includes(state.formAccount) ? state.formAccount : state.accounts[0];
    const contracts = state.formContracts || 1;
    const outcome = state.formOutcome || 'WIN';
    const direction = state.formDirection || 'LONG';
    const vwap = state.formVwap !== undefined ? state.formVwap : true;
    const rr = state.formRR || '2';

    // Calculate timestamp from entryDateOffset and formTime
    const d = new Date();
    d.setDate(d.getDate() - state.entryDateOffset);
    const [h, m] = (state.formTime || '12:00').split(':').map(Number);
    d.setHours(h || 12, m || 0, 0, 0);

    const commission = contracts * COMMISSION_PER_CONTRACT;
    let gross = 0;

    if (state.formCustomGross != null && state.formCustomGross !== 0) {
      gross = state.formCustomGross;
    } else {
      const tierKey = state.atrRanges?.[acct] || 't2';
      const tier = ATR_TIERS[tierKey] || ATR_TIERS.t2;
      const ticks = outcome === 'WIN' ? tier.tp : -tier.sl;
      gross = ticks * contracts * TICK_VALUE;
    }

    const net = gross - commission;

    const newTrade: Trade = {
      id: `t_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ts: d.getTime(),
      account: acct,
      chapter: 2,
      tier: state.atrRanges?.[acct] || 't2',
      direction,
      outcome,
      contracts,
      grossPnl: gross,
      commission,
      netPnl: net,
      vwap,
      rr
    };

    updateState({
      trades: [newTrade, ...state.trades],
      formCustomGross: null
    });
  };

  const handleAddTradeDirect = (t: Trade) => {
    updateState({
      trades: [t, ...state.trades]
    });
  };

  const handleDeleteTrade = (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק עסקה זו?')) return;
    updateState({
      trades: state.trades.filter(t => t.id !== id)
    });
  };

  const handleEditTrade = (id: string) => {
    const tr = state.trades.find(t => t.id === id);
    if (!tr) return;
    const newNetStr = prompt('ערוך רווח/הפסד נטו ($):', tr.netPnl.toFixed(2));
    if (newNetStr === null) return;
    const newNet = parseFloat(newNetStr);
    if (isNaN(newNet)) return;

    const updated = state.trades.map(t => {
      if (t.id === id) {
        return {
          ...t,
          netPnl: newNet,
          grossPnl: newNet + t.commission,
          outcome: newNet >= 0 ? ('WIN' as const) : ('LOSE' as const)
        };
      }
      return t;
    });

    updateState({ trades: updated });
  };

  const handleResetData = () => {
    if (!confirm('האם אתה בטוח שברצונך לאפס את כל הנתונים לברירת המחדל המקורית? פעולה זו תמחק עסקאות חדשות.')) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('ttj_ai_chat_history');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] flex justify-center selection:bg-[var(--long-dim)] selection:text-[var(--long)]">
      {/* Mobile container - strictly responsive for mobile while looking clean on desktop */}
      <div className="w-full max-w-[560px] min-h-screen flex flex-col relative pb-20">
        {/* Topbar */}
        <Topbar
          accounts={state.accounts}
          selectedAccount={state.selectedAccount}
          onSelectAccount={handleSelectAccount}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAI={() => updateState({ activeTab: 'ai' })}
          isAITab={state.activeTab === 'ai'}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-3">
          {state.activeTab === 'entry' && (
            <TradeEntryView
              state={state}
              onUpdateState={updateState}
              onSubmitTrade={handleSubmitTrade}
              onOpenBreakeven={() => setShowBreakeven(true)}
              onEditTrade={handleEditTrade}
              onDeleteTrade={handleDeleteTrade}
            />
          )}

          {state.activeTab === 'analytics' && (
            <AnalyticsView
              state={state}
              onOpenHistory={() => setShowHistory(true)}
              onUpdateState={updateState}
            />
          )}

          {state.activeTab === 'calendar' && (
            <CalendarJournalView
              state={state}
              onUpdateState={updateState}
            />
          )}

          {state.activeTab === 'ai' && (
            <AIAssistantView
              state={state}
              onOpenSettings={() => setShowSettings(true)}
              onUpdateState={updateState}
            />
          )}

          {state.activeTab === 'ancient' && (
            <AncientView />
          )}
        </main>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={state.activeTab}
          onChangeTab={(tab) => updateState({ activeTab: tab })}
        />

        {/* Modals */}
        {showSettings && (
          <SettingsModal
            state={state}
            onClose={() => setShowSettings(false)}
            onUpdateState={updateState}
            onResetData={handleResetData}
          />
        )}

        {showBreakeven && (
          <BreakevenModal
            state={state}
            onClose={() => setShowBreakeven(false)}
            onAddTrade={handleAddTradeDirect}
          />
        )}

        {showHistory && (
          <HistoryModal
            state={state}
            onClose={() => setShowHistory(false)}
            onDeleteTrade={handleDeleteTrade}
            onEditTrade={handleEditTrade}
          />
        )}
      </div>
    </div>
  );
}
