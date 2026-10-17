import React, { useState } from 'react';
import { Settings, ChevronDown, Bot, Sparkles } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallModal';

interface TopbarProps {
  accounts: string[];
  selectedAccount: string;
  onSelectAccount: (acc: string) => void;
  onOpenSettings: () => void;
  onOpenAI: () => void;
  isAITab: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  accounts,
  selectedAccount,
  onSelectAccount,
  onOpenSettings,
  onOpenAI,
  isAITab
}) => {
  const [openMenu, setOpenMenu] = useState(false);
  const safeAccounts = Array.isArray(accounts) ? accounts : [];
  const displayLabel = selectedAccount === 'ALL' ? 'כל החשבונות' : selectedAccount;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 px-3 py-2.5 bg-[#080b10]/95 backdrop-blur-md border-b border-[var(--border-soft)]">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[var(--profit)] shadow-[0_0_10px_var(--profit)] flex-none" />
        <div>
          <span className="font-extrabold text-[14px] tracking-tight block leading-tight text-[var(--text)]">יומן מסחר</span>
          <span className="font-mono text-[8.5px] text-[var(--text-faint)] tracking-wider block">NQ/MNQ</span>
        </div>
      </div>

      {/* Account Switcher */}
      <div className="relative flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setOpenMenu(!openMenu)}
          className="w-full flex items-center justify-between gap-1 bg-[var(--panel2)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs font-semibold hover:border-[var(--long)] transition"
        >
          <span className="truncate text-[var(--text)]">{displayLabel}</span>
          <ChevronDown size={13} className={`text-[var(--text-faint)] transition-transform duration-150 ${openMenu ? 'rotate-180' : ''}`} />
        </button>

        {openMenu && (
          <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-50 bg-[var(--panel3)] border border-[var(--border)] rounded-xl overflow-hidden shadow-2xl animate-in fade-in">
            <button
              type="button"
              onClick={() => { onSelectAccount('ALL'); setOpenMenu(false); }}
              className={`w-full text-right px-3.5 py-2.5 text-xs font-medium flex items-center justify-between border-b border-[var(--border-soft)] transition ${
                selectedAccount === 'ALL' ? 'text-[var(--long)] bg-[var(--long-dim)] font-bold' : 'text-[var(--text)] hover:bg-[var(--panel2)]'
              }`}
            >
              <span>כל החשבונות</span>
              {selectedAccount === 'ALL' && <span>✓</span>}
            </button>
            {safeAccounts.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => { onSelectAccount(a); setOpenMenu(false); }}
                className={`w-full text-right px-3.5 py-2.5 text-xs font-medium flex items-center justify-between border-b border-[var(--border-soft)] last:border-b-0 transition ${
                  selectedAccount === a ? 'text-[var(--long)] bg-[var(--long-dim)] font-bold' : 'text-[var(--text)] hover:bg-[var(--panel2)]'
                }`}
              >
                <span className="truncate">{a}</span>
                {selectedAccount === a && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PWA Install Action */}
      <PWAInstallButton />

      {/* AI Assistant Quick Launcher */}
      <button
        type="button"
        onClick={onOpenAI}
        title="עוזר בינה מלאכותית"
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition flex-none ${
          isAITab
            ? 'bg-[var(--long-dim)] border-[var(--long)] text-[var(--long)]'
            : 'bg-[var(--panel2)] border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--long)]'
        }`}
      >
        <Sparkles size={14} className="text-amber-400" />
        <span className="hidden sm:inline">AI</span>
      </button>

      {/* Settings gear */}
      <button
        type="button"
        onClick={onOpenSettings}
        title="הגדרות"
        className="w-8 h-8 flex-none rounded-xl bg-[var(--panel2)] border border-[var(--border)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition"
      >
        <Settings size={15} />
      </button>
    </header>
  );
};
