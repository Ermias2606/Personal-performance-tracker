import React, { useState } from 'react';
import { CheckCircle2, Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types/kpi';

interface PWAInstallButtonProps {
  lang: Language;
  onOpenInstallPage?: () => void;
  variant?: 'toolbar' | 'hero';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang,
  onOpenInstallPage,
  variant = 'toolbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'hero') {
      return (
        <span className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/70 dark:bg-emerald-950/40 px-4 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300 whitespace-nowrap shrink-0">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{lang === 'am' ? 'አፑ ተጭኗል (Offline Ready)' : 'App Installed (Offline Ready)'}</span>
        </span>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={
          variant === 'hero'
            ? 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{lang === 'am' ? 'አፑን አሁን ጫን (Install)' : 'Install App Now'}</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (onOpenInstallPage) {
            onOpenInstallPage();
          } else {
            setShowGuide(true);
          }
        }}
        className={
          variant === 'hero'
            ? 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer'
            : 'inline-flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Smartphone className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <span>
          {isIOS
            ? lang === 'am'
              ? 'በiPhone ጫን'
              : 'Install on iOS'
            : lang === 'am'
              ? 'አፑን ጫን (Offline)'
              : 'Install App'}
        </span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'አፑን በስልክዎ ወይም በኮምፒውተርዎ ላይ ይጫኑ'
                  : 'Install Biqat KPI for Offline Use'}
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {isIOS ? (
                <>
                  <p>
                    {lang === 'am'
                      ? 'በiPhone ወይም iPad Safari ላይ ያለ ኢንተርኔት ለመጠቀም፦'
                      : 'To install on iPhone or iPad Safari for full offline access:'}
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-slate-700 dark:text-slate-200">
                    <li>
                      {lang === 'am'
                        ? 'በSafari ታችኛው ክፍል ያለውን Share ምልክት ይጫኑ።'
                        : 'Tap the Share button in the Safari toolbar.'}
                    </li>
                    <li>
                      {lang === 'am'
                        ? 'ወደ ታች ወርደው "Add to Home Screen" የሚለውን ይምረጡ።'
                        : 'Scroll down and tap "Add to Home Screen".'}
                    </li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    {lang === 'am'
                      ? 'ይህ ፕሮግሬሲቭ ዌብ አፕ (PWA) ሙሉ በሙሉ ያለ ኢንተርኔት (Offline) ይሰራል። በቀጥታ ለመጫን፦'
                      : 'This Progressive Web App (PWA) works 100% offline using local device storage. To install:'}
                  </p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-slate-700 dark:text-slate-200">
                    <li>
                      {lang === 'am'
                        ? 'አፑን በአዲስ ትር (New Tab) ይክፈቱ (በቅድመ-እይታ ፍሬም ውስጥ ከሆኑ)።'
                        : 'Open the app in a standalone browser tab if currently viewing inside a preview frame.'}
                    </li>
                    <li>
                      {lang === 'am'
                        ? 'በብራውዘር አድራሻ መጻፊያው (Address Bar) ላይ ያለውን Install ምልክት ወይም ከሜኑ "Install App / Add to Home Screen" ይጫኑ።'
                        : 'Click the Install icon in your browser address bar or choose "Install App / Add to Home Screen" from the browser menu.'}
                    </li>
                  </ol>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[44px] rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer"
            >
              {lang === 'am' ? 'ተረድቻለሁ (ዝጋ)' : 'Got It'}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ lang: Language }> = ({ lang }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="no-print fixed bottom-20 md:bottom-5 left-4 z-50 flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/95 px-3.5 py-2 text-xs font-semibold text-amber-900 dark:text-amber-200 shadow-md">
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
      <span>
        {lang === 'am'
          ? 'ኦፍላይን ሁነታ — ሁሉም መረጃ በስልክዎ/ኮምፒውተርዎ ላይ በትክክል ይቀመጣል።'
          : 'Offline Mode — All changes are saved locally on your device.'}
      </span>
    </div>
  );
};
