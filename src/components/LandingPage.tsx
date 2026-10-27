import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  Lock,
  Moon,
  Printer,
  Sun,
  TrendingUp,
} from 'lucide-react';
import {
  AppPageRoute,
  EmployeeProfile,
  FiscalYearWorkspace,
} from '../types/kpi';
import {
  computeDailyWeeklyPace,
  PortfolioSummary,
  YoYPortfolioComparison,
} from '../utils/analytics';
import { formatKpiValue, getFiscalMonths, UI_TEXT } from '../utils/i18n';
import { PWAInstallButton } from './PWAInstallButton';
import {
  AppraisalSealIcon,
  BiqatBrandMark,
  CascadeTreeIcon,
  ChronometerPaceIcon,
  LedgerActualsIcon,
  OfflineVaultShieldIcon,
  YoYComparisonIcon,
} from './BrandIcons';

import heroWorkspaceImg from '../assets/images/hero_branch_workspace_1793127229910.jpg';
import bentoMobileImg from '../assets/images/bento_offline_mobile_1793127230196.jpg';
import boardroomAppraisalImg from '../assets/images/case_study_appraisal_1793127231684.jpg';

interface LandingPageProps {
  profile: EmployeeProfile;
  activeFy: FiscalYearWorkspace;
  fiscalYearsCount: number;
  pinEnabled: boolean;
  summary: PortfolioSummary;
  yoyComparison: YoYPortfolioComparison | null;
  onNavigate: (page: AppPageRoute) => void;
  onToggleLanguage: () => void;
  onToggleTheme: () => void;
}

type CascadeRhythm = 'equal' | 'ramp' | 'campaign';

const RHYTHM_WEIGHTS: Record<CascadeRhythm, number[]> = {
  equal: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ramp: [0.78, 0.82, 0.88, 0.94, 0.98, 1.02, 1.04, 1.08, 1.1, 1.12, 1.12, 1.12],
  campaign: [1.18, 0.92, 1.22, 0.95, 0.9, 1.05, 1.15, 0.92, 0.96, 0.9, 0.92, 1.03],
};

export const LandingPage: React.FC<LandingPageProps> = ({
  profile,
  activeFy,
  fiscalYearsCount,
  pinEnabled,
  summary,
  yoyComparison,
  onNavigate,
  onToggleLanguage,
  onToggleTheme,
}) => {
  const lang = profile.language;
  const prefersReducedMotion = useReducedMotion();
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const currentMonthMeta = fiscalMonths[profile.activeMonthIndex] || fiscalMonths[0];

  // Resilient image error states (Zero-Broken-Image Policy)
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [bentoImgFailed, setBentoImgFailed] = useState(false);
  const [workflowImgFailed, setWorkflowImgFailed] = useState(false);

  // Interactive KPI Cascade Simulator state
  const [simBranchMillions, setSimBranchMillions] = useState<number>(180);
  const [simSharePct, setSimSharePct] = useState<number>(10);
  const [simRhythm, setSimRhythm] = useState<CascadeRhythm>('ramp');

  const simData = useMemo(() => {
    const branchTotal = simBranchMillions * 1_000_000;
    const personalAnnual = (branchTotal * simSharePct) / 100;
    const weights = RHYTHM_WEIGHTS[simRhythm];
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const monthly = weights.map((w) => (personalAnnual * w) / weightSum);
    const maxMonth = Math.max(...monthly, 1);
    const quarters = [
      monthly[0] + monthly[1] + monthly[2],
      monthly[3] + monthly[4] + monthly[5],
      monthly[6] + monthly[7] + monthly[8],
      monthly[9] + monthly[10] + monthly[11],
    ];
    const dailyTarget = monthly[profile.activeMonthIndex] / (activeFy.workingDaysPerMonth || 26);

    return {
      branchTotal,
      personalAnnual,
      monthly,
      maxMonth,
      quarters,
      dailyTarget,
    };
  }, [simBranchMillions, simSharePct, simRhythm, profile.activeMonthIndex, activeFy.workingDaysPerMonth]);

  const pacePreview = useMemo(
    () =>
      computeDailyWeeklyPace(
        activeFy.kpis,
        activeFy.actualLogs,
        activeFy.activeMonthIndex,
        activeFy.workingDaysPerMonth,
        activeFy.elapsedWorkingDaysInMonth
      ),
    [activeFy]
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 transition-colors">
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {UI_TEXT.brand[lang]}
          </button>

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'am' ? 'ገጽታዎች' : 'Features'}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('simulator')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'am' ? 'ካልኩሌተር' : 'Simulator'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'am' ? 'ዳሽቦርድ' : 'Dashboard'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'am' ? 'ሪፖርት' : 'Reports'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('install')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'am' ? 'አፕ ጫን' : 'Install App'}
            </button>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="min-h-[38px] rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              {lang === 'am' ? 'ወደ ስራ ገጽ ግባ' : 'Open Workspace'}
            </button>
          </div>
        </div>
      </header>

      {/* Sub-Header Utility Bar (Language, Theme & Local Workspace Context) */}
      <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {profile.branchName}
            </span>
            <span aria-hidden="true">·</span>
            <span>{profile.fiscalYearLabel}</span>
            <span className="hidden sm:inline" aria-hidden="true">·</span>
            <span className="hidden sm:inline">
              {lang === 'am' ? '100% ኦፍላይን የግል ትራከር' : '100% Offline Personal Tracker'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleTheme}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {profile.theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span>{profile.theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLanguage}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>{lang === 'am' ? 'English' : 'አማርኛ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Marketing & Product Architecture Flow */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 space-y-20">
        {/* 1. Proposition: Split Architectural Hero + Full-Width Proof Strip */}
        <section className="space-y-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
            {/* Left Proposition Column */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 flex flex-col justify-between py-2"
            >
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <BiqatBrandMark className="h-7 w-7 shrink-0" />
                  <span>
                    {lang === 'am'
                      ? 'የቅርንጫፍ ሰራተኛ የKPI መከታተያ · ኦፍላይን PWA'
                      : 'Personal Branch KPI Workspace · Offline PWA'}
                  </span>
                </div>

                <h1
                  className="font-bold tracking-tight text-slate-900 dark:text-white leading-[1.12]"
                  style={{
                    fontSize: 'clamp(2.25rem, 4vw, 3.55rem)',
                    textWrap: 'balance',
                  }}
                >
                  {lang === 'am'
                    ? 'የቅርንጫፍ እቅድን ወደ የግል ዕለታዊ ስኬት የሚቀይር ኦፍላይን ሲስተም።'
                    : 'Turn branch annual targets into clear daily execution—offline.'}
                </h1>

                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-300 max-w-[62ch]">
                  {lang === 'am'
                    ? 'ለግል አገልግሎት የተነደፈ፦ የቅርንጫፉን አጠቃላይ ዓመታዊ እቅድ ያስገቡ፣ የእርስዎን ዓመታዊ፣ የሩብ ዓመት (Q1–Q4) እና ወርሃዊ እቅድ በእጅ ወይም በቀመር ያዘጋጁ፣ ክንውንዎን ይመዝግቡ እና ለምዘና ዝግጁ የሆነ PDF/CSV ሪፖርት ያውጡ።'
                    : 'Built specifically for individual branch professionals: set overall branch annual plans, manually input or cascade your personal annual, quarterly, and 12-month targets, track daily run-rates, and print formal appraisal reports with zero internet dependency.'}
                </p>
              </div>

              <div className="mt-8 space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate('overview')}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>
                      {lang === 'am' ? 'የKPI ዳሽቦርዴን ክፈት' : 'Launch KPI Dashboard'}
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </button>

                  <PWAInstallButton
                    lang={lang}
                    variant="hero"
                    onOpenInstallPage={() => onNavigate('install')}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                  <button
                    type="button"
                    onClick={() => onNavigate('branch')}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    {lang === 'am' ? '1. የቅርንጫፍ እቅድ →' : '1. Branch Plan →'}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('personal')}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    {lang === 'am' ? '2. የግል ካስኬድ →' : '2. Personal Cascade →'}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('actuals')}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    {lang === 'am' ? '3. ክንውን መዝገብ →' : '3. Actuals Sheet →'}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => onNavigate('reports')}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    {lang === 'am' ? '4. ሪፖርት እና YoY →' : '4. Appraisal Report →'}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Right Dominant Visual Carrier with Live Local Portfolio Readout */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.985 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[340px] lg:min-h-[440px]"
            >
              {!heroImgFailed ? (
                <img
                  src={heroWorkspaceImg}
                  alt="Modern Addis Ababa bank executive workspace at sunrise"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover lg:h-full"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex items-center justify-center p-10">
                  <BiqatBrandMark className="h-24 w-24 opacity-80" />
                </div>
              )}

              {/* Measured Contrast Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />

              {/* Clean Live Workspace Overlay Anchored at Bottom */}
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-7 text-white">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-t border-white/15 pt-4">
                  <div>
                    <div className="text-xs text-slate-300">
                      <span>{profile.employeeName}</span>
                      <span className="mx-2" aria-hidden="true">·</span>
                      <span>
                        {lang === 'am' ? currentMonthMeta.fullAm : currentMonthMeta.fullEn} YTD
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-3">
                      <span className="font-mono text-3xl sm:text-4xl font-bold tabular-nums text-white">
                        {summary.normalizedScorePct.toFixed(1)}%
                      </span>
                      <span className="text-sm font-semibold text-sky-300">
                        {lang === 'am'
                          ? `ደረጃ ${summary.overallGrade.code} · ${summary.overallGrade.labelAm}`
                          : `Grade ${summary.overallGrade.code} · ${summary.overallGrade.labelEn}`}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onNavigate('overview')}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 px-3.5 py-2 text-xs font-semibold text-white transition-colors self-start sm:self-auto cursor-pointer"
                  >
                    <span>{lang === 'am' ? 'ቀጥታ ይመልከቱ' : 'Inspect Live Data'}</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Full-Width 4-Column Quantitative Proof Strip Below Hero Split */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 lg:grid-cols-4">
            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'ንቁ የKPI መለኪያዎች እና ዘርፎች' : 'Active Tracked KPIs'}
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {activeFy.kpis.length} KPIs · {summary.totalWeight}%
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'ክብደት የተሰጣቸው የምዘና መለኪያዎች' : 'Weighted appraisal scorecard'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'የእቅድ እርከን (Cascade Depth)' : 'Planning Horizon Depth'}
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                1Y · 4Q · 12M
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? '+ ዕለታዊ እና ሳምንታዊ ሩጫ (Pace)'
                  : '+ Daily & weekly run-rate math'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'የዓመታት ንጽጽር (YoY Archive)' : 'Multi-Year YoY Archive'}
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {fiscalYearsCount} {lang === 'am' ? 'ዓመታት' : 'Fiscal Years'}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {yoyComparison
                  ? `${yoyComparison.scoreDeltaPts >= 0 ? '+' : ''}${yoyComparison.scoreDeltaPts.toFixed(1)} pts vs ${yoyComparison.priorYearLabel.split(' ')[0]}`
                  : lang === 'am'
                    ? 'ከእድገት % ጋር የሚሸጋገር'
                    : 'Rollover with % target bump'}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'የዳታ ግላዊነት (Offline Storage)' : 'Local Device Privacy'}
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                100% Offline
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'IndexedDB + ባለ 4-አሃዝ PIN መቆለፊያ'
                  : 'IndexedDB + optional 4-digit PIN'}
              </div>
            </div>
          </div>
        </section>

        {/* 2. Asymmetric Bento Capabilities Grid with Animated Mechanisms */}
        <section id="features" className="scroll-mt-20 space-y-6">
          <div className="max-w-2xl">
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'am'
                ? 'ከቅርንጫፍ ዓመታዊ እቅድ እስከ ዓመታዊ ምዘና ሪፖርት ድረስ'
                : 'Engineered for every stage of your fiscal year'}
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {lang === 'am'
                ? 'እያንዳንዱ ገጽ ለባንክ እና ለቅርንጫፍ ባለሙያዎች የዕለት ተዕለት የKPI አሰራር የተዘጋጀ ነው።'
                : 'Four dedicated workspaces connecting your branch targets, personal monthly plans, daily actuals, and formal reports.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Bento Card 01 (Span 7): Branch-to-Personal Cascade */}
            <motion.div
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {lang === 'am'
                      ? '01. የቅርንጫፍ እና የግል እቅድ ካስኬድ'
                      : '01. Branch-to-Personal Target Cascade'}
                  </span>
                  <CascadeTreeIcon className="h-7 w-7 shrink-0" />
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? 'ከቅርንጫፍ አጠቃላይ እቅድ የእርስዎን ድርሻ በእጅ ወይም በቀመር ያዘጋጁ'
                    : 'Set branch annual plans, custom KPI categories, and manual monthly splits'}
                </h3>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'የራስዎን የKPI ዘርፎች (Categories) ይፍጠሩ፣ የቅርንጫፉን ዓመታዊ ግብ ያስገቡ፣ ከዚያም የእርስዎን ዓመታዊ፣ ሩብ ዓመት (Q1–Q4) እና 12 ወራት እቅድ በእጅ (Manually) ያስተካክሉ።'
                    : 'Create custom bilingual KPI categories, compute personal targets from branch share percentages, and fine-tune every quarter and month manually with automatic reconciliation checks.'}
                </p>
              </div>

              {/* Animated Visual Cascade Diagram */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'ናሙና፦ ተቀማጭ ገንዘብ (KPI-01)' : 'Live Example: Net Deposit (KPI-01)'}
                  </span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    180M ETB Branch → <strong className="text-blue-600 dark:text-blue-400">18M ETB Personal (10%)</strong>
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  {(['Q1 · 4.2M', 'Q2 · 4.5M', 'Q3 · 4.5M', 'Q4 · 4.8M'] as const).map(
                    (label, idx) => (
                      <div key={label} className="space-y-1.5">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <motion.div
                            initial={prefersReducedMotion ? false : { scaleX: 0 }}
                            whileInView={{ scaleX: 0.78 + idx * 0.07 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 0.45,
                              delay: idx * 0.06,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="h-full origin-left rounded-full bg-blue-600 dark:bg-blue-500"
                          />
                        </div>
                        <div className="font-mono text-[11px] font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                          {label}
                        </div>
                      </div>
                    )
                  )}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => onNavigate('branch')}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <span>{lang === 'am' ? 'የቅርንጫፍ እቅድ እና ዘርፎች ክፈት' : 'Manage Branch Plan & Categories'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('personal')}
                    className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer"
                  >
                    <span>{lang === 'am' ? 'የግል Q1–Q4 እቅድ አስተካክል' : 'Edit My Quarterly/Monthly Plan'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 02 (Span 5): Daily & Weekly Execution Pace */}
            <motion.div
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {lang === 'am'
                      ? '02. ዕለታዊ እና ሳምንታዊ ፍጥነት'
                      : '02. Daily & Weekly Pace Engine'}
                  </span>
                  <ChronometerPaceIcon className="h-7 w-7 shrink-0" />
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? 'በቀሪ የስራ ቀናት ምን ያህል ማከናወን እንዳለብዎ ወዲያውኑ ይወቁ'
                    : 'Know your exact required daily & weekly target'}
                </h3>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'የወሩን ቀሪ ክፍተት (Gap) ለቀሪ የስራ ቀናት እና ሳምንታት በማካፈል ዛሬ ምን ያህል ማሳካት እንዳለብዎ ያሰላል።'
                    : 'Automatically divides your remaining monthly gap by remaining working days so month-end targets never catch you off guard.'}
                </p>
              </div>

              {/* Animated Radial SVG Gauge + Live Pace Readout */}
              <div className="flex items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        strokeWidth="6"
                        className="stroke-slate-100 dark:stroke-slate-800"
                      />
                      <motion.circle
                        cx="32"
                        cy="32"
                        r="26"
                        fill="none"
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="stroke-emerald-600 dark:stroke-emerald-400"
                        initial={prefersReducedMotion ? false : { pathLength: 0 }}
                        whileInView={{
                          pathLength: Math.min(1, Math.max(0.08, pacePreview.expectedTimePct / 100)),
                        }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white">
                      {pacePreview.remainingWorkingDays}d
                    </div>
                  </div>

                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {lang === 'am'
                        ? `${pacePreview.remainingWorkingDays} ቀሪ የስራ ቀናት በወሩ`
                        : `${pacePreview.remainingWorkingDays} working days left in month`}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {pacePreview.metOrAheadCount}/{pacePreview.rows.length}{' '}
                      {lang === 'am' ? 'በጥሩ ፍጥነት ላይ' : 'KPIs on pace'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('overview')}
                  className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 cursor-pointer"
                >
                  <span>{lang === 'am' ? 'እይ' : 'Open'}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>

            {/* Bento Card 03 (Span 5): Offline Mobile Vault & PIN Lock */}
            <motion.div
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col justify-between"
            >
              <div className="h-44 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-800">
                {!bentoImgFailed ? (
                  <img
                    src={bentoMobileImg}
                    alt="Minimalist smartphone on travertine desk"
                    referrerPolicy="no-referrer"
                    onError={() => setBentoImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-slate-800">
                    <OfflineVaultShieldIcon className="h-14 w-14" />
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {lang === 'am'
                      ? '03. ኦፍላይን አፕ እና የPIN መቆለፊያ'
                      : '03. Installable PWA & 4-Digit PIN'}
                  </span>
                  <OfflineVaultShieldIcon className="h-6 w-6 shrink-0" />
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? 'በስልክዎ ላይ ይጫኑት፤ በ4-አሃዝ PIN ይቆልፉት'
                    : 'Works in zero-connectivity branches with local PIN privacy'}
                </h3>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'ያለ ኢንተርኔት ይሰራል፣ Dark Mode አለው፣ እንዲሁም የግል የKPI ውጤትዎን በ4-አሃዝ ሚስጥር ቁጥር ይጠብቃል።'
                    : 'Install to Android, iOS, Windows, or Mac. Includes Dark Mode, portable JSON backups, and an offline 4-digit PIN lock.'}
                </p>

                <div className="pt-1 flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      {pinEnabled
                        ? lang === 'am'
                          ? 'PIN መቆለፊያ ነቅቷል'
                          : 'PIN Lock Active'
                        : lang === 'am'
                          ? 'PIN ለማዘጋጀት ዝግጁ'
                          : 'Optional PIN Lock Ready'}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate('install')}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <span>{lang === 'am' ? 'የመጫኛ ገጽ →' : 'Install Guide →'}</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 04 (Span 7): Cumulative Trend Curve & YoY Appraisal Reports */}
            <motion.div
              whileHover={prefersReducedMotion ? undefined : { y: -2 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {lang === 'am'
                      ? '04. የተጠራቀመ ቻርት፣ YoY እና ሪፖርት'
                      : '04. Cumulative Trajectory, YoY & PDF Reports'}
                  </span>
                  <div className="flex items-center gap-2">
                    <YoYComparisonIcon className="h-7 w-7" />
                    <AppraisalSealIcon className="h-7 w-7" />
                  </div>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                  {lang === 'am'
                    ? 'የተጠራቀመ የአፈጻጸም መስመር ቻርት፣ የዓመታት ንጽጽር እና ለህትመት የተዘጋጀ ሪፖርት'
                    : 'Animated cumulative progress curves, multi-year YoY deltas, and formal PDF/CSV exports'}
                </h3>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'የዘንድሮን አፈጻጸም ከ2018 ዓ.ም ማህደር ጋር ያነጻጽሩ፣ የተጠራቀመ እቅድ እና ክንውንን በመስመር ቻርት ይፈትሹ፣ ለቅርብ ኃላፊዎ የሚቀርብ ሪፖርት በአንድ ክሊክ ያትሙ።'
                    : 'Compare current YTD performance apples-to-apples against archived fiscal years, inspect cumulative trajectories per KPI, and print A4 appraisal sheets with signature blocks.'}
                </p>
              </div>

              {/* Animated Dual-Line SVG Trajectory Preview */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                <svg
                  viewBox="0 0 520 110"
                  className="w-full h-24 overflow-visible"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="landingCurveFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1="12"
                    y1="96"
                    x2="508"
                    y2="96"
                    className="stroke-slate-200 dark:stroke-slate-800"
                    strokeWidth="1"
                  />
                  <line
                    x1="12"
                    y1="52"
                    x2="508"
                    y2="52"
                    className="stroke-slate-100 dark:stroke-slate-800/70"
                    strokeWidth="1"
                  />
                  {/* Planned dashed baseline */}
                  <path
                    d="M 16 94 L 136 74 L 256 54 L 376 34 L 500 16"
                    fill="none"
                    className="stroke-slate-400 dark:stroke-slate-500"
                    strokeWidth="2"
                    strokeDasharray="5 4"
                  />
                  {/* Shaded area */}
                  <path
                    d="M 16 94 L 136 68 L 256 49 L 376 26 L 500 10 L 500 96 L 16 96 Z"
                    fill="url(#landingCurveFill)"
                  />
                  {/* Animated Actual Curve */}
                  <motion.path
                    d="M 16 94 L 136 68 L 256 49 L 376 26 L 500 10"
                    fill="none"
                    className="stroke-blue-600 dark:stroke-blue-400"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={prefersReducedMotion ? false : { pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>

                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {lang === 'am'
                      ? 'ሰማያዊ መስመር፦ የተጠራቀመ ክንውን · የተቆራረጠ፦ የተጠራቀመ እቅድ'
                      : 'Solid blue: Cumulative Actual · Dashed: Cumulative Plan'}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('reports')}
                    className="inline-flex items-center gap-1.5 font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>{lang === 'am' ? 'ሙሉ ሪፖርት ገጽ ክፈት →' : 'Open Reports Page →'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* 3. Interactive Live KPI Cascade Simulator */}
        <section
          id="simulator"
          className="scroll-mt-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                {lang === 'am' ? 'ቀጥታ የእቅድ ካልኩሌተር' : 'Interactive Target Cascade Sandbox'}
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የቅርንጫፍ እቅድ ወደ የግል ወርሃዊ እና ዕለታዊ ግብ እንዴት እንደሚዘረጋ ይሞክሩ'
                  : 'Simulate your Branch-to-Personal KPI Cascade in real time'}
              </h2>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 self-start lg:self-auto">
              {(
                [
                  { key: 'equal', am: 'እኩል 12 ወራት', en: 'Equal 12M' },
                  { key: 'ramp', am: 'እያደገ የሚሄድ', en: 'Progressive Ramp' },
                  { key: 'campaign', am: 'የዘመቻ ወራት', en: 'Campaign Peaks' },
                ] as { key: CascadeRhythm; am: string; en: string }[]
              ).map((mode) => (
                <button
                  key={mode.key}
                  type="button"
                  onClick={() => setSimRhythm(mode.key)}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    simRhythm === mode.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? mode.am : mode.en}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
            {/* Simulator Controls */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <label
                    htmlFor="sim-branch-range"
                    className="font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {lang === 'am' ? 'የቅርንጫፍ ዓመታዊ እቅድ (ETB)' : 'Branch Annual Target (ETB)'}
                  </label>
                  <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                    {simBranchMillions}M ETB
                  </span>
                </div>
                <input
                  id="sim-branch-range"
                  type="range"
                  min={40}
                  max={400}
                  step={10}
                  value={simBranchMillions}
                  onChange={(e) => setSimBranchMillions(Number(e.target.value))}
                  className="mt-2.5 w-full accent-blue-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-baseline justify-between text-xs">
                  <label
                    htmlFor="sim-share-range"
                    className="font-semibold text-slate-700 dark:text-slate-300"
                  >
                    {lang === 'am' ? 'ለእኔ የተሰጠኝ ድርሻ (%)' : 'My Assigned Share (%)'}
                  </label>
                  <span className="font-mono text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">
                    {simSharePct}%
                  </span>
                </div>
                <input
                  id="sim-share-range"
                  type="range"
                  min={2}
                  max={25}
                  step={0.5}
                  value={simSharePct}
                  onChange={(e) => setSimSharePct(Number(e.target.value))}
                  className="mt-2.5 w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Computed Cascade Readout */}
              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-5">
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'am' ? 'የእኔ ዓመታዊ እቅድ' : 'My Annual Plan'}
                  </div>
                  <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {formatKpiValue(simData.personalAnnual, 'ETB', true)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {lang === 'am'
                      ? `ዕለታዊ ግብ (${activeFy.workingDaysPerMonth} ቀን/ወር)`
                      : `Daily Pace (${activeFy.workingDaysPerMonth}d/mo)`}
                  </div>
                  <div className="mt-0.5 font-mono text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatKpiValue(simData.dailyTarget, 'ETB', true)}/d
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('personal')}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  <span>
                    {lang === 'am'
                      ? 'የግል እቅድ ማስተካከያ ገጽ ክፈት'
                      : 'Open Personal Plan Editor'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('actuals')}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span>{lang === 'am' ? 'ክንውን መዝግብ' : 'Log Actuals'}</span>
                </button>
              </div>
            </div>

            {/* 12-Month Animated Bar Chart + Q1-Q4 Totals */}
            <div className="lg:col-span-7 space-y-5">
              <div className="grid grid-cols-4 gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                {simData.quarters.map((qVal, qIdx) => (
                  <div key={qIdx}>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Q{qIdx + 1} {lang === 'am' ? 'እቅድ' : 'Target'}
                    </div>
                    <div className="mt-0.5 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                      {formatKpiValue(qVal, 'ETB', true)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-12 gap-1.5 sm:gap-2 items-end h-44 pt-4">
                {simData.monthly.map((mVal, idx) => {
                  const ratio = Math.max(0.15, mVal / simData.maxMonth);
                  const mMeta = fiscalMonths[idx];
                  const isCurrent = idx === profile.activeMonthIndex;
                  return (
                    <div
                      key={idx}
                      className="flex flex-col items-center h-full justify-end gap-1.5"
                    >
                      <span className="hidden sm:block font-mono text-[9px] tabular-nums text-slate-500 dark:text-slate-400">
                        {(mVal / 1_000_000).toFixed(1)}M
                      </span>
                      <div className="w-full h-32 flex items-end rounded-md bg-slate-100/80 dark:bg-slate-800/60 overflow-hidden">
                        <motion.div
                          animate={{ scaleY: ratio }}
                          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                          className={`w-full h-full origin-bottom rounded-md ${
                            isCurrent
                              ? 'bg-blue-600 dark:bg-blue-400'
                              : 'bg-slate-700 dark:bg-slate-500'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-[10px] truncate max-w-full ${
                          isCurrent
                            ? 'font-bold text-blue-600 dark:text-blue-400'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {lang === 'am' ? mMeta.shortAm : mMeta.shortEn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 4. Multi-Page Appraisal Workflow Directory & Proof */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900 min-h-[280px]">
            {!workflowImgFailed ? (
              <img
                src={boardroomAppraisalImg}
                alt="Modern financial planning boardroom"
                referrerPolicy="no-referrer"
                onError={() => setWorkflowImgFailed(true)}
                className="h-full w-full object-cover lg:h-full"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-slate-900 p-8">
                <AppraisalSealIcon className="h-16 w-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white space-y-2">
              <div className="text-xs text-sky-300 font-semibold">
                {lang === 'am' ? 'ሙሉ ባለ ብዙ-ገጽ የKPI ሲስተም' : 'Complete Multi-Page Workspace'}
              </div>
              <h3 className="text-xl font-bold leading-snug">
                {lang === 'am'
                  ? 'ለሩብ ዓመት እና ለዓመታዊ የሰራተኛ ምዘና ወዲያውኑ ዝግጁ።'
                  : 'Walk into every quarterly and annual review with exact numbers.'}
              </h3>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {(
              [
                {
                  route: 'branch' as AppPageRoute,
                  num: '01',
                  titleAm: 'የቅርንጫፍ እቅድ እና ዘርፎች',
                  titleEn: 'Branch Plan & Categories',
                  descAm: 'አጠቃላይ የቅርንጫፍ እቅድ፣ የKPI ክብደት (100%) እና አዲስ የKPI ዘርፎች መፍጠሪያ ገጽ።',
                  descEn: 'Define branch annual targets, balance KPI weights to 100%, and manage custom categories.',
                  icon: <CascadeTreeIcon className="h-6 w-6" />,
                },
                {
                  route: 'personal' as AppPageRoute,
                  num: '02',
                  titleAm: 'የግል እቅድ ካስኬድ (Q1–Q4 & 12M)',
                  titleEn: 'My Plan Cascade Editor',
                  descAm: 'የግል ዓመታዊ፣ የሩብ ዓመት እና የ12 ወራት እቅድን በእጅ (Manually) ወይም በቀመር ማስገቢያ ገጽ።',
                  descEn: 'Manually edit or auto-distribute your assigned Annual, Quarterly, and Monthly targets.',
                  icon: <ChronometerPaceIcon className="h-6 w-6" />,
                },
                {
                  route: 'actuals' as AppPageRoute,
                  num: '03',
                  titleAm: 'ክንውን መመዝገቢያ (Actuals)',
                  titleEn: 'Actuals Spreadsheet & Ledger',
                  descAm: 'በወርሃዊ ሰንጠረዥ በቀጥታ ወይም በዕለታዊ የስራ ማስታወሻ ክንውንዎን የሚመዘግቡበት ገጽ።',
                  descEn: 'Enter actuals directly into a quarterly spreadsheet grid or log dated activity entries.',
                  icon: <LedgerActualsIcon className="h-6 w-6" />,
                },
                {
                  route: 'reports' as AppPageRoute,
                  num: '04',
                  titleAm: 'ትንተና፣ ቻርት እና ሪፖርት',
                  titleEn: 'Reports, Trend & YoY Analysis',
                  descAm: 'የተጠራቀመ መስመር ቻርት፣ የዓመታት ንጽጽር (YoY)፣ Excel CSV እና የህትመት (PDF) ሪፖርት ገጽ።',
                  descEn: 'Generate cumulative trend charts, YoY comparisons, CSV spreadsheets, and printable PDFs.',
                  icon: <AppraisalSealIcon className="h-6 w-6" />,
                },
              ]
            ).map((card) => (
              <button
                key={card.route}
                type="button"
                onClick={() => onNavigate(card.route)}
                className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:border-blue-600 dark:hover:border-blue-500 transition-colors flex flex-col justify-between gap-4 cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {card.num}
                    </span>
                    {card.icon}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {lang === 'am' ? card.titleAm : card.titleEn}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {lang === 'am' ? card.descAm : card.descEn}
                  </p>
                </div>

                <div className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                  <span>{lang === 'am' ? 'ገጹን ክፈት' : 'Open Page'}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Quiet Editorial Multi-Page Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <BiqatBrandMark className="h-6 w-6" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {UI_TEXT.brand[lang]}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'am'
                ? 'የግል እና የቅርንጫፍ KPI አፈጻጸም መከታተያ'
                : 'Personal & Branch KPI Performance Tracker'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => onNavigate('overview')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.overview[lang]}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('branch')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.branch[lang]}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('personal')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.personal[lang]}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('actuals')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.actuals[lang]}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.reports[lang]}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('install')}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {lang === 'am' ? 'አፑን ጫን (Install)' : 'Install App'}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
