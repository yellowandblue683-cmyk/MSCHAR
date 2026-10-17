import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { STORAGE_KEY } from '../data/constants';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = {
    hasError: false,
    error: null
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('ttj_ai_chat_history');
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch {}
    window.location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080b10] text-[#e7edf6] flex items-center justify-center p-4" dir="rtl">
          <div className="w-full max-w-md bg-[#0f141c] border border-rose-500/40 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-white">התרחשה שגיאה מקומית באפליקציה</h2>
              <p className="text-xs text-[#8593a8]">
                האפליקציה נתקלה בשגיאה זמנית. ניתן לטעון מחדש או לאפס את הזיכרון המקומי:
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-black/40 border border-[#1e2733] text-[11px] font-mono text-rose-300 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black font-extrabold text-xs flex items-center justify-center gap-2 hover:opacity-95 transition shadow-md"
              >
                <RefreshCw size={15} />
                <span>טען מחדש את האפליקציה</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-[#131a24] border border-[#1e2733] text-[#8593a8] hover:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 size={13} />
                <span>איפוס מטמון מקומי ותיקון שגיאות</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
