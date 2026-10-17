import React from 'react';
import { PenLine, BarChart3, Calendar, Bot, Landmark, LucideIcon } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'entry' | 'analytics' | 'calendar' | 'ai' | 'ancient';
  onChangeTab: (tab: 'entry' | 'analytics' | 'calendar' | 'ai' | 'ancient') => void;
}

interface TabItem {
  key: 'entry' | 'analytics' | 'calendar' | 'ai' | 'ancient';
  label: string;
  icon: LucideIcon;
  highlight?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab }) => {
  const tabs: TabItem[] = [
    { key: 'entry', label: 'עסקאות', icon: PenLine },
    { key: 'analytics', label: 'גרפים ומדדים', icon: BarChart3 },
    { key: 'calendar', label: 'יומן ולוח', icon: Calendar },
    { key: 'ai', label: 'עוזר AI', icon: Bot, highlight: true },
    { key: 'ancient', label: 'העת העתיקה', icon: Landmark }
  ];

  return (
    <nav className="fixed bottom-0 right-0 left-0 z-40 max-w-[560px] mx-auto flex bg-[#0a0d13]/95 backdrop-blur-xl border-t border-[var(--border-soft)] px-1 py-1.5 pb-[calc(6px+var(--safe-bottom))]">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChangeTab(tab.key)}
            className={`flex-1 flex flex-col items-center justify-center py-1 rounded-xl transition relative ${
              isActive
                ? 'text-[var(--long)] font-bold'
                : 'text-[var(--text-faint)] hover:text-[var(--text-dim)] font-medium'
            }`}
          >
            <div className="relative">
              <Icon size={19} className={isActive ? 'drop-shadow-[0_0_8px_rgba(63,182,255,0.6)]' : ''} />
              {tab.highlight && !isActive && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--long)] ring-2 ring-[#0a0d13]" />
              )}
            </div>
            <span className="text-[10.5px] mt-1 leading-none">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
