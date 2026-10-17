import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, Smartphone, Share2, PlusSquare, Check, X, Info } from 'lucide-react';

export const PWAInstallModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { isInstallable, install, isIOS } = usePWAInstall();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-[var(--panel)] border border-[var(--border)] rounded-3xl p-5 shadow-2xl relative text-right">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 w-8 h-8 rounded-full bg-[var(--panel2)] border border-[var(--border-soft)] flex items-center justify-center text-[var(--text-faint)] hover:text-[var(--text)] transition"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1f7dd1] to-[#2be3a0] p-0.5 flex-none shadow-md">
            <img src="/icon-192.png" alt="App Icon" className="w-full h-full rounded-2xl object-cover" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-[var(--text)]">התקנת יומן מסחר לטלפון</h3>
            <p className="text-[11px] text-[var(--text-dim)]">שימוש מלא במסך מלא כאפליקציה אמיתית</p>
          </div>
        </div>

        {isInstallable ? (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-dim)] leading-relaxed">
              הדפדפן שלך תומך בהתקנה מהירה בלחיצה אחת ישירות למסך הבית של הטלפון.
            </p>
            <button
              type="button"
              onClick={async () => {
                await install();
                onClose();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#1f7dd1] to-[#2be3a0] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#2be3a0]/20 hover:opacity-95 transition"
            >
              <Download size={18} />
              <span>התקן עכשיו למסך הבית</span>
            </button>
          </div>
        ) : isIOS ? (
          <div className="space-y-3.5">
            <div className="text-xs font-bold text-[var(--text)]">הוראות התקנה ל-iPhone ו-iPad (Safari):</div>
            <div className="space-y-2.5 text-xs text-[var(--text-dim)]">
              <div className="flex items-start gap-3 bg-[var(--panel2)] p-2.5 rounded-xl border border-[var(--border-soft)]">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-none font-bold text-xs">
                  1
                </div>
                <div className="flex-1">
                  לחץ על כפתור <b>השיתוף</b> (<span className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-400"><Share2 size={12} /> Share</span>) בסרגל התחתון של Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[var(--panel2)] p-2.5 rounded-xl border border-[var(--border-soft)]">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-none font-bold text-xs">
                  2
                </div>
                <div className="flex-1">
                  גלול מעט מטה ובחר באפשרות <b>״הוסף למסך הבית״</b> (<span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400"><PlusSquare size={12} /> Add to Home Screen</span>).
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[var(--panel2)] p-2.5 rounded-xl border border-[var(--border-soft)]">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center flex-none font-bold text-xs">
                  3
                </div>
                <div className="flex-1">
                  לחץ על <b>״הוסף״</b> (Add) בפינה השמאלית/ימנית העליונה — והאפליקציה מוכנה על מסך הבית שלך!
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="text-xs font-bold text-[var(--text)]">הוראות התקנה ב-Chrome / Android:</div>
            <div className="space-y-2.5 text-xs text-[var(--text-dim)]">
              <div className="flex items-start gap-3 bg-[var(--panel2)] p-2.5 rounded-xl border border-[var(--border-soft)]">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-none font-bold text-xs">
                  1
                </div>
                <div className="flex-1">
                  לחץ על תפריט <b>3 הנקודות (⋮)</b> בפינת הדפדפן.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[var(--panel2)] p-2.5 rounded-xl border border-[var(--border-soft)]">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-none font-bold text-xs">
                  2
                </div>
                <div className="flex-1">
                  בחר באפשרות <b>״התקן אפליקציה״</b> או <b>״הוסף למסך הבית״</b>.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[var(--panel2)] p-2.5 rounded-xl border border-[var(--border-soft)]">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-none font-bold text-xs">
                  3
                </div>
                <div className="flex-1">
                  אשר את ההתקנה והאפליקציה תפעל במצב מסך מלא ונוח!
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[var(--border-soft)] flex items-center justify-between text-[11px] text-[var(--text-faint)]">
          <span className="flex items-center gap-1">
            <Info size={12} /> פועל במצב לא מקוון ומותאם במיוחד לנייד
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-[var(--text)] hover:underline"
          >
            סגור
          </button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [modalOpen, setModalOpen] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setModalOpen(true);
          }
        }}
        className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-bold text-[11px] flex items-center gap-1.5 shadow-sm transition active:scale-95"
        title="התקן אפליקציה לטלפון"
      >
        <Smartphone size={13} className="text-emerald-400 animate-pulse" />
        <span>התקן בטלפון</span>
      </button>

      <PWAInstallModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
};
