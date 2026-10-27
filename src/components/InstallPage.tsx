import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  HardDriveDownload,
  Laptop,
  Share,
  ShieldCheck,
  Smartphone,
  WifiOff,
} from 'lucide-react';
import { AppPageRoute, Language } from '../types/kpi';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';
import {
  BiqatBrandMark,
  InstallAppDeviceIcon,
  OfflineVaultShieldIcon,
} from './BrandIcons';

interface InstallPageProps {
  lang: Language;
  kpiCount: number;
  fiscalYearsCount: number;
  pinEnabled: boolean;
  onNavigate: (page: AppPageRoute) => void;
  onExportBackup: () => void;
}

type PlatformTab = 'desktop' | 'android' | 'ios';

export const InstallPage: React.FC<InstallPageProps> = ({
  lang,
  kpiCount,
  fiscalYearsCount,
  pinEnabled,
  onNavigate,
  onExportBackup,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { isInstallable, isInstalled, isIOS, isInIframe, swReady, install } = usePWAInstall();
  const isOnline = useOnlineStatus();

  const [platformTab, setPlatformTab] = useState<PlatformTab>(
    isIOS ? 'ios' : 'desktop'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2400);
    } catch {
      setCopiedUrl(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Top Hero Grid: Install Action & Live Offline Diagnostics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <BiqatBrandMark className="h-11 w-11 shrink-0" />
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                <span>Progressive Web App</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>100% Offline IndexedDB</span>
                <span className="mx-2" aria-hidden="true">·</span>
                <span>
                  {isOnline
                    ? lang === 'am'
                      ? 'ኦንላይን'
                      : 'Online'
                    : lang === 'am'
                      ? 'ኦፍላይን'
                      : 'Offline Active'}
                </span>
              </div>
            </div>

            <h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'am'
                ? 'ብቃት KPI አፕን በስልክዎ ወይም በኮምፒውተርዎ ላይ ይጫኑ'
                : 'Install Biqat KPI as a Standalone Offline App'}
            </h1>

            <p className="text-sm sm:text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-2xl">
              {lang === 'am'
                ? 'አንድ ጊዜ ከጫኑት በኋላ ምንም የኢንተርኔት ግንኙነት ሳያስፈልግ እንደ መደበኛ የስልክ ወይም የኮምፒውተር አፕ በፍጥነት ይከፈታል። ሁሉም የቅርንጫፍ እና የግል KPI እቅዶችዎ በመሳሪያዎ ውስጥ ብቻ ይቀመጣሉ።'
                : 'Once installed to your home screen or desktop dock, Biqat KPI launches instantly in its own standalone window with zero internet requirement. All plans, actual logs, and multi-year archives stay privately on your device.'}
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {/* Primary Install Action Area */}
            <div className="flex flex-wrap items-center gap-3">
              {isInstalled ? (
                <div className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-5 py-2.5 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>
                    {lang === 'am'
                      ? 'በተሳካ ሁኔታ ተጭኗል (Standalone Mode)'
                      : 'Running as Installed App'}
                  </span>
                </div>
              ) : isInstallable ? (
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span>
                    {lang === 'am'
                      ? 'በአንድ ክሊክ አሁን ጫን (Install Biqat KPI)'
                      : 'Install Biqat KPI Now (1-Click)'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      <span>
                        {lang === 'am'
                          ? 'ሊንኩ ተቀድቷል! በአዲስ Tab ይክፈቱት'
                          : 'App URL Copied — Open in Browser Tab'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 shrink-0" />
                      <span>
                        {lang === 'am'
                          ? 'የአፑን አድራሻ ቅዳ (Copy App Link)'
                          : 'Copy App Link for Browser Install'}
                      </span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => onNavigate('overview')}
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <span>{lang === 'am' ? 'ወደ KPI ዳሽቦርድ ሂድ' : 'Open KPI Dashboard'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {isInIframe && !isInstalled && !isInstallable && (
              <p className="border-t border-slate-100 dark:border-slate-800 pt-3.5 text-xs leading-relaxed text-amber-800 dark:text-amber-300 max-w-xl">
                {lang === 'am'
                  ? 'ማስታወሻ፦ አሁን አፑን እየተመለከቱ ያሉት በቅድመ-እይታ ፍሬም (Preview Frame) ውስጥ ስለሆነ ብራውዘሮች ቀጥታ የመጫኛ ቁልፍን በአዲስ ትር (Standalone Tab) ሲከፍቱት ወዲያውኑ ያሳያሉ። ከላይ በቀኝ በኩል ያለውን "Open in New Tab" ምልክት ይጠቀሙ።'
                  : 'Tip: Browsers show the native 1-click install prompt when opened in a top-level browser tab. Use the Open in New Tab button in the top-right corner or copy the link above to trigger 1-click desktop or Android installation.'}
              </p>
            )}
          </div>
        </div>

        {/* Right Live Device Readiness Diagnostics */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <InstallAppDeviceIcon className="h-6 w-6" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am' ? 'የኦፍላይን ዝግጁነት ማረጋገጫ' : 'Offline & PWA Readiness'}
                </h2>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                100% Ready
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <WifiOff className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{lang === 'am' ? 'Service Worker ካሽ' : 'Offline Service Worker'}</span>
                </span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {swReady
                    ? lang === 'am'
                      ? 'ንቁ (Active)'
                      : 'Registered'
                    : lang === 'am'
                      ? 'ዝግጁ (Ready)'
                      : 'Configured'}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{lang === 'am' ? 'የመሳሪያ ውስጥ ዳታቤዝ' : 'Local IndexedDB Vault'}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                  {kpiCount} KPIs · {fiscalYearsCount} {lang === 'am' ? 'ዓመታት' : 'FYs'}
                </span>
              </div>

              <div className="py-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>{lang === 'am' ? 'የግል PIN መቆለፊያ' : '4-Digit Local PIN'}</span>
                </span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {pinEnabled
                    ? lang === 'am'
                      ? 'ተቆልፏል (Enabled)'
                      : 'Enabled'
                    : lang === 'am'
                      ? 'አማራጭ (Optional)'
                      : 'Available'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onExportBackup}
            className="w-full min-h-[42px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <HardDriveDownload className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span>
              {lang === 'am'
                ? 'የአሁኑን ዳታ Backup አውርድ (.json)'
                : 'Download Offline JSON Backup'}
            </span>
          </button>
        </div>
      </div>

      {/* Step-by-Step Platform Installation Guide */}
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? 'በማንኛውም መሳሪያ ላይ የመጫኛ ቅደም ተከተል'
                : 'Step-by-Step Installation by Device'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'የሚጠቀሙበትን ስልክ ወይም ኮምፒውተር ይምረጡ'
                : 'Choose your operating system or browser below'}
            </p>
          </div>

          <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPlatformTab('desktop')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                platformTab === 'desktop'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Laptop className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'ኮምፒውተር (Chrome / Edge)' : 'Desktop (Chrome / Edge)'}</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('android')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                platformTab === 'android'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Android</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatformTab('ios')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                platformTab === 'ios'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Share className="h-3.5 w-3.5" />
              <span>iPhone / iPad</span>
            </button>
          </div>
        </div>

        <motion.div
          key={platformTab}
          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {platformTab === 'desktop' && (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  01. {lang === 'am' ? 'በሙሉ ትር ይክፈቱ' : 'Open Standalone Tab'}
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am' ? 'አፑን በChrome ወይም Edge ይክፈቱ' : 'Open in Chrome or Edge'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'አፑን በቀጥታ የብራውዘር ትር (Tab) ውስጥ ይክፈቱት።'
                    : 'Ensure Biqat KPI is open in a full Chrome, Edge, or Brave browser tab.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  02. {lang === 'am' ? 'የመጫኛ ምልክቱን ይጫኑ' : 'Click Install Icon'}
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? '"Install App" ቁልፍን ይምረጡ'
                    : 'Click "Install Biqat KPI"'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'ከላይ ያለውን ሰማያዊ "Install" ቁልፍ ወይም በአድራሻ መጻፊያው (Address Bar) ቀኝ ጥግ ያለውን የኮምፒውተር መጫኛ ምልክት ይጫኑ።'
                    : 'Click the primary Install button above or the install monitor icon on the right side of your browser address bar.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  03. {lang === 'am' ? 'ከዴስክቶፕ ይጠቀሙ' : 'Launch Offline Anytime'}
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? 'በTaskbar ወይም Desktop ላይ ይቀመጣል'
                    : 'Pin to Taskbar or Dock'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'አፑ የራሱ መስኮት (Window) ይኖረዋል፤ ኢንተርኔት ባይኖርም ሙሉ በሙሉ ይሰራል።'
                    : 'Launch directly from your Windows Taskbar or macOS Dock with shortcut links to Overview, Actuals, and Reports.'}
                </p>
              </div>
            </>
          )}

          {platformTab === 'android' && (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  01. Chrome on Android
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am' ? 'በChrome ብራውዘር ይክፈቱ' : 'Open in Android Chrome'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'በአንድሮይድ ስልክዎ Chrome ብራውዘር የአፑን አድራሻ ይክፈቱ።'
                    : 'Open the Biqat KPI URL in Google Chrome on your Android phone.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  02. Install App
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? '"Install App" ወይም ከሜኑ ይምረጡ'
                    : 'Tap "Install App" from Menu'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'ከላይ ያለውን ባለ ሶስት ነጥብ (⋮) ሜኑ ነክተው "Install app" ወይም "Add to Home screen" የሚለውን ይጫኑ።'
                    : 'Tap the Install button above, or tap the three-dot (⋮) Chrome menu and select "Install app".'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  03. Home Screen App
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am' ? 'በስልክዎ ገጽ ላይ ይወጣል' : 'Native App Drawer Icon'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'የብቃት KPI አርማ በስልክዎ ላይ ይቀመጣል፤ በረጅሙ ሲጫኑት ቀጥታ ወደ ክንውን መመዝገቢያ ያስገባዎታል።'
                    : 'Appears in your Android app drawer with maskable icon support and long-press quick shortcuts.'}
                </p>
              </div>
            </>
          )}

          {platformTab === 'ios' && (
            <>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  01. Safari Browser
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am' ? 'በSafari ብራውዘር ይክፈቱ' : 'Open in Safari on iOS'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'በiPhone ወይም iPad ላይ Safari ብራውዘርን በመጠቀም አፑን ይክፈቱ።'
                    : 'Open Biqat KPI inside Safari on your iPhone or iPad.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  02. Tap Share
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am' ? 'የShare ምልክቱን ይጫኑ' : 'Tap the Safari Share Icon'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'በSafari ታችኛው መስመር ላይ የሚገኘውን የShare (ወደ ላይ ቀስት ያለው ሳጥን) ምልክት ይንኩ።'
                    : 'Tap the Share button (square with upward arrow) centered in the Safari bottom bar.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                  03. Add to Home Screen
                </div>
                <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? '"Add to Home Screen" ይምረጡ'
                    : 'Select "Add to Home Screen"'}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? '"Add to Home Screen" የሚለውን ነክተው ከላይ በቀኝ "Add" ሲሉ ሙሉ ስክሪን አፕ ሆኖ ይጫናል።'
                    : 'Tap "Add to Home Screen" then "Add" — Biqat KPI launches full-screen with its Apple Touch Icon.'}
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Offline Privacy Assurance Strip */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <OfflineVaultShieldIcon className="h-8 w-8 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? '100% የግል እና ደህንነቱ የተጠበቀ (Zero Cloud Tracking)'
                : '100% Private Personal Data Architecture'}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl">
              {lang === 'am'
                ? 'ይህ አፕ ለግል የቅርንጫፍ ሰራተኛ አገልግሎት የተሰራ ስለሆነ ምንም መረጃ ወደ ውጭ ሰርቨር አይልክም። በፈለጉ ጊዜ በJSON ወይም በExcel (CSV) ወደ ስልክዎ ማውረድ ይችላሉ።'
                : 'Designed strictly for personal employee use: zero external servers, zero account sign-ups, optional 4-digit PIN lock, and instant portable JSON/CSV exports.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 shrink-0 cursor-pointer"
        >
          <span>{lang === 'am' ? 'የሪፖርት ገጽን ይመልከቱ' : 'Preview Reports Page'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
