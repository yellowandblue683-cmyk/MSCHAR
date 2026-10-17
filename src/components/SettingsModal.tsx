import React, { useState } from 'react';
import { AppState } from '../types';
import { getStoredUserApiKey, setStoredUserApiKey, verifyGeminiApiKey } from '../services/geminiService';
import { THEMES, FONTS, ATR_TIERS, TIER_ORDER } from '../data/constants';
import { X, Key, CheckCircle2, AlertCircle, Plus, Trash2, Download, Upload, RefreshCw } from 'lucide-react';

interface SettingsModalProps {
  state: AppState;
  onClose: () => void;
  onUpdateState: (patch: Partial<AppState>) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  state,
  onClose,
  onUpdateState,
  onResetData
}) => {
  const [apiKey, setApiKey] = useState(() => getStoredUserApiKey());
  const [testResult, setTestResult] = useState<{ testing: boolean; message: string; valid: boolean | null }>({
    testing: false,
    message: '',
    valid: null
  });

  const [newAccountName, setNewAccountName] = useState('');

  const handleSaveApiKey = () => {
    setStoredUserApiKey(apiKey.trim());
    handleTestApiKey();
  };

  const handleTestApiKey = async () => {
    setTestResult({ testing: true, message: 'בודק חיבור למודל...', valid: null });
    const res = await verifyGeminiApiKey(apiKey.trim() || undefined);
    setTestResult({ testing: false, message: res.message, valid: res.valid });
  };

  const handleAddAccount = () => {
    if (!newAccountName.trim()) return;
    const name = newAccountName.trim();
    if (state.accounts.includes(name)) return;
    onUpdateState({ accounts: [...state.accounts, name] });
    setNewAccountName('');
  };

  const handleDeleteAccount = (acc: string) => {
    if (state.accounts.length <= 1) {
      alert('חייב להישאר לפחות חשבון אחד.');
      return;
    }
    if (!confirm(`האם אתה בטוח שברצונך למחוק את החשבון "${acc}"?`)) return;
    const filtered = state.accounts.filter(a => a !== acc);
    onUpdateState({
      accounts: filtered,
      selectedAccount: state.selectedAccount === acc ? filtered[0] : state.selectedAccount
    });
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trading_journal_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (imported.trades && Array.isArray(imported.trades)) {
          onUpdateState(imported);
          alert('הנתונים שוחזרו בהצלחה!');
        } else {
          alert('קובץ גיבוי לא תקין.');
        }
      } catch (err) {
        alert('שגיאה בקריאת קובץ הגיבוי.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl w-full max-w-[500px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-soft)]">
          <div className="font-extrabold text-sm text-[var(--text)]">הגדרות האפליקציה</div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--panel3)] flex items-center justify-center text-[var(--text-dim)] hover:text-[var(--text)] transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Gemini API Key Section */}
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
              <Key size={15} className="text-amber-400" />
              <span>מפתח API אישי עבור Google Gemini</span>
            </div>
            <p className="text-[11px] text-[var(--text-dim)] leading-relaxed">
              האפליקציה מותאמת למודל <b>gemini-3.8-flash</b> עם מעבר אוטומטי ל-<b>gemini-3.1-flash-lite</b> בעת עומס.
              הזן מפתח API אישי או השאר ריק לשימוש במפתח המערכת.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1 bg-[var(--panel3)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text)] outline-none"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-2 rounded-lg bg-[var(--long)] text-black font-bold text-xs hover:opacity-90 transition"
              >
                שמור
              </button>
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={testResult.testing}
                className="px-2.5 py-2 rounded-lg bg-[var(--panel3)] border border-[var(--border)] text-[var(--text-dim)] text-xs font-semibold hover:text-[var(--text)]"
              >
                {testResult.testing ? <RefreshCw size={13} className="animate-spin" /> : 'בדיקה'}
              </button>
            </div>
            {testResult.message && (
              <div className={`text-[11px] flex items-center gap-1.5 ${testResult.valid ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
                {testResult.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Account Manager */}
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-[var(--text)]">ניהול חשבונות</div>
            <div className="space-y-1.5">
              {state.accounts.map(acc => (
                <div key={acc} className="flex items-center justify-between p-2 rounded-lg bg-[var(--panel3)] text-xs">
                  <span className="font-semibold text-[var(--text)]">{acc}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc)}
                    className="text-[var(--loss)] p-1 hover:opacity-75 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="שם חשבון חדש..."
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="flex-1 bg-[var(--panel3)] border border-[var(--border-soft)] rounded-lg px-3 py-1.5 text-xs text-[var(--text)] outline-none"
              />
              <button
                type="button"
                onClick={handleAddAccount}
                className="px-3 py-1.5 rounded-lg bg-[var(--panel3)] border border-[var(--border)] text-xs font-bold text-[var(--text)] hover:border-[var(--long)] flex items-center gap-1"
              >
                <Plus size={13} />
                <span>הוסף</span>
              </button>
            </div>
          </div>

          {/* Max Daily Loss Limit */}
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-[var(--text)]">מגבלת הפסד יומית ($)</div>
            <input
              type="number"
              min="50"
              step="50"
              value={Math.abs(state.maxDailyLoss)}
              onChange={(e) => onUpdateState({ maxDailyLoss: Math.abs(parseFloat(e.target.value) || 300) })}
              className="w-full bg-[var(--panel3)] border border-[var(--border-soft)] rounded-lg px-3 py-2 text-xs font-mono font-bold text-[var(--text)] outline-none"
            />
            <div className="text-[10px] text-[var(--text-faint)]">
              כאשר ההפסד היומי המצטבר בתיק מגיע לסכום זה, המסחר ננעל אוטומטית.
            </div>
          </div>

          {/* Theme Selector */}
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-[var(--text)]">ערכת נושא וצבעים</div>
            <div className="grid grid-cols-3 gap-1.5">
              {THEMES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onUpdateState({ theme: t.key })}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition ${
                    state.theme === t.key
                      ? 'border-[var(--long)] bg-[var(--long-dim)] text-[var(--long)]'
                      : 'border-[var(--border-soft)] bg-[var(--panel3)] text-[var(--text-dim)]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Selector */}
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-[var(--text)]">גופן (Font)</div>
            <div className="grid grid-cols-2 gap-1.5">
              {FONTS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => onUpdateState({ font: f.key })}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition ${
                    state.font === f.key
                      ? 'border-[var(--long)] bg-[var(--long-dim)] text-[var(--long)]'
                      : 'border-[var(--border-soft)] bg-[var(--panel3)] text-[var(--text-dim)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Backup and Restore */}
          <div className="bg-[var(--panel2)] border border-[var(--border)] rounded-xl p-3.5 space-y-2">
            <div className="text-xs font-bold text-[var(--text)]">גיבוי ושחזור נתונים</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="flex-1 py-2 rounded-lg bg-[var(--panel3)] border border-[var(--border-soft)] hover:border-[var(--long)] text-xs font-semibold text-[var(--text)] flex items-center justify-center gap-1.5"
              >
                <Download size={14} />
                <span>ייצוא גיבוי JSON</span>
              </button>
              <label className="flex-1 py-2 rounded-lg bg-[var(--panel3)] border border-[var(--border-soft)] hover:border-[var(--long)] text-xs font-semibold text-[var(--text)] flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload size={14} />
                <span>ייבוא גיבוי</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Reset Factory */}
          <button
            type="button"
            onClick={onResetData}
            className="w-full py-2.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 text-xs font-bold hover:bg-red-950/40 transition"
          >
            איפוס נתונים מלא לברירת המחדל
          </button>
        </div>
      </div>
    </div>
  );
};
