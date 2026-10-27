import React, { useCallback, useEffect, useState } from 'react';
import { Delete, Lock, Moon, Sun } from 'lucide-react';
import { Language, ThemeMode } from '../types/kpi';

interface PinLockScreenProps {
  expectedPin: string;
  employeeName: string;
  lang: Language;
  theme: ThemeMode;
  onUnlock: () => void;
  onToggleTheme: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  expectedPin,
  employeeName,
  lang,
  theme,
  onUnlock,
  onToggleTheme,
}) => {
  const [digits, setDigits] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  const handleDigit = useCallback(
    (d: string) => {
      setErrorMsg(false);
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4) {
          if (next === expectedPin) {
            setTimeout(() => onUnlock(), 80);
          } else {
            setTimeout(() => {
              setErrorMsg(true);
              setDigits('');
            }, 140);
          }
        }
        return next;
      });
    },
    [expectedPin, onUnlock]
  );

  const handleBackspace = useCallback(() => {
    setErrorMsg(false);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDigit, handleBackspace]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B1120] px-4 py-8 text-slate-900 dark:text-slate-100">
      <div className="fixed top-4 right-4">
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-7 shadow-sm text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 dark:bg-blue-600 text-white">
          <Lock className="h-5 w-5" />
        </div>

        <h1 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
          {lang === 'am' ? 'ብቃት KPI ተቆልፏል' : 'Biqat KPI Locked'}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {employeeName} ·{' '}
          {lang === 'am'
            ? 'ለመክፈት ባለ 4 አሃዝ የሚስጥር ቁጥር (PIN) ያስገቡ'
            : 'Enter your 4-digit offline PIN to unlock'}
        </p>

        {/* 4 PIN Indicators */}
        <div className="mt-6 flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < digits.length;
            return (
              <div
                key={idx}
                className={`h-4 w-4 rounded-full border-2 transition-colors ${
                  errorMsg
                    ? 'border-red-500 bg-red-500/20'
                    : filled
                      ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500'
                      : 'border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        <div className="mt-2 h-5 text-xs font-medium text-red-600 dark:text-red-400">
          {errorMsg
            ? lang === 'am'
              ? 'የተሳሳተ የሚስጥር ቁጥር ነው። እንደገና ይሞክሩ።'
              : 'Incorrect PIN code. Please try again.'
            : ''}
        </div>

        {/* Tactile 3x4 Keypad */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="min-h-[52px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-mono text-lg font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[52px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 font-mono text-lg font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Backspace"
            className="min-h-[52px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
