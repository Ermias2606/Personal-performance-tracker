import React, { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  Search,
  TrendingUp,
} from 'lucide-react';
import {
  ActiveTab,
  ActualLogEntry,
  EmployeeProfile,
  KpiCategoryDef,
  KpiItem,
  PeriodScope,
  QuarterKey,
} from '../types/kpi';
import {
  getStatusLabel,
  KpiEvaluatedRow,
  PerformanceStatus,
  PortfolioSummary,
  YoYPortfolioComparison,
} from '../utils/analytics';
import {
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  QUARTERS,
} from '../utils/i18n';
import { DailyWeeklyPaceSection } from './DailyWeeklyPaceSection';
import { CascadeTreeIcon, CategoryDuotoneIcon } from './BrandIcons';

interface OverviewViewProps {
  profile: EmployeeProfile;
  kpis: KpiItem[];
  logs: ActualLogEntry[];
  categories: KpiCategoryDef[];
  summary: PortfolioSummary;
  yoyComparison: YoYPortfolioComparison | null;
  workingDaysPerMonth: number;
  elapsedWorkingDays: number;
  scope: PeriodScope;
  onChangeScope: (scope: PeriodScope) => void;
  onUpdateWorkingDays: (workingDaysPerMonth: number, elapsedWorkingDays: number) => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onQuickLogForKpi: (kpiId: string, monthIndex?: number) => void;
}

export const StatusIndicator: React.FC<{
  status: PerformanceStatus;
  lang: 'am' | 'en';
}> = ({ status, lang }) => {
  const label = getStatusLabel(status, lang);
  if (status === 'exceptional') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 print:text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'on_track') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 print:text-blue-700 whitespace-nowrap">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'at_risk') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 print:text-amber-700 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === 'critical') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 print:text-red-700 whitespace-nowrap">
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
        <span>{label}</span>
      </span>
    );
  }
  return <span className="text-xs text-slate-400 whitespace-nowrap">{label}</span>;
};

export const OverviewView: React.FC<OverviewViewProps> = ({
  profile,
  kpis,
  logs,
  categories,
  summary,
  yoyComparison,
  workingDaysPerMonth,
  elapsedWorkingDays,
  scope,
  onChangeScope,
  onUpdateWorkingDays,
  onNavigateTab,
  onQuickLogForKpi,
}) => {
  const lang = profile.language;
  const prefersReducedMotion = useReducedMotion();
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'exceeding' | 'attention'>('all');
  const [hoveredMonthIdx, setHoveredMonthIdx] = useState<number | null>(null);

  const filteredRows = useMemo(() => {
    return summary.rows.filter((row) => {
      if (categoryFilter !== 'all' && row.kpi.category !== categoryFilter) {
        return false;
      }
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = row.kpi.name.toLowerCase().includes(q);
        const matchCode = row.kpi.code.toLowerCase().includes(q);
        if (!matchName && !matchCode) return false;
      }
      if (statusFilter === 'exceeding') {
        return row.status === 'exceptional' || row.status === 'on_track';
      }
      if (statusFilter === 'attention') {
        return row.status === 'at_risk' || row.status === 'critical';
      }
      return true;
    });
  }, [summary.rows, categoryFilter, searchQuery, statusFilter]);

  const avgBranchShare = useMemo(() => {
    const valid = summary.rows.filter(
      (r) => r.branchAnnualTarget > 0 && r.kpi.direction === 'higher_better'
    );
    if (valid.length === 0) return 0;
    return valid.reduce((s, r) => s + r.branchSharePct, 0) / valid.length;
  }, [summary.rows]);

  const avgBranchActualContrib = useMemo(() => {
    const valid = summary.rows.filter(
      (r) => r.branchAnnualTarget > 0 && r.kpi.direction === 'higher_better'
    );
    if (valid.length === 0) return 0;
    return valid.reduce((s, r) => s + r.branchActualContributionPct, 0) / valid.length;
  }, [summary.rows]);

  if (summary.rows.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <CascadeTreeIcon className="mx-auto mb-3 h-10 w-10" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {lang === 'am' ? 'ምንም የKPI እቅድ ገና አልተመዘገበም' : 'No KPI Plans Configured Yet'}
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {lang === 'am'
            ? 'በመጀመሪያ የቅርንጫፉን አጠቃላይ ዓመታዊ እቅድ እና የKPI ዘርፎችን ያስገቡ፣ ከዚያም የእርስዎን ዓመታዊ፣ የሩብ ዓመት እና ወርሃዊ እቅድ ያዘጋጁ።'
            : 'Start by defining your KPI categories and branch annual targets, then enter your personal annual, quarterly, and monthly targets.'}
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab('branch')}
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{lang === 'am' ? 'የቅርንጫፍ ዓመታዊ እቅድ አዘጋጅ' : 'Set Branch Annual Plan'}</span>
        </button>
      </div>
    );
  }

  const activeHoveredTrend =
    hoveredMonthIdx !== null ? summary.monthlyCompositeTrend[hoveredMonthIdx] : null;

  const paceTargetMonthIndex =
    scope.type === 'month' ? scope.monthIndex : profile.activeMonthIndex;

  return (
    <div className="space-y-8">
      {/* Period Selector Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
            style={{ textWrap: 'balance' }}
          >
            {lang === 'am' ? 'የግል KPI አፈጻጸም ማጠቃለያ' : 'Personal KPI Performance Overview'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            <span>{profile.branchName}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>{profile.fiscalYearLabel}</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {summary.scopeLabel}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => onChangeScope({ type: 'ytd' })}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scope.type === 'ytd'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'am' ? 'እስካሁን (YTD)' : 'YTD'}
            </button>
            <button
              type="button"
              onClick={() => onChangeScope({ type: 'annual' })}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                scope.type === 'annual'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'am' ? 'ዓመታዊ' : 'Annual'}
            </button>
            {QUARTERS.map((q: QuarterKey) => (
              <button
                key={q}
                type="button"
                onClick={() => onChangeScope({ type: 'quarter', quarter: q })}
                className={`min-h-[36px] rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  scope.type === 'quarter' && scope.quarter === q
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <select
            aria-label={lang === 'am' ? 'ወር ይምረጡ' : 'Select Month'}
            value={scope.type === 'month' ? String(scope.monthIndex) : ''}
            onChange={(e) => {
              if (e.target.value !== '') {
                onChangeScope({ type: 'month', monthIndex: Number(e.target.value) });
              }
            }}
            className={`min-h-[40px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              scope.type === 'month'
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-slate-300'
            }`}
          >
            <option value="">{lang === 'am' ? 'ወርሃዊ ምርጫ...' : 'By Month...'}</option>
            {fiscalMonths.map((m) => (
              <option key={m.index} value={m.index}>
                {lang === 'am' ? m.fullAm : m.fullEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4-Column Full-Width KPI Metric Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {lang === 'am' ? 'አጠቃላይ ክብደት ያለው ውጤት' : 'Overall Weighted KPI Score'}
            </p>
            <div className="mt-2 flex items-baseline gap-2.5">
              <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
                {summary.normalizedScorePct.toFixed(1)}%
              </span>
              <span className="font-mono text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                {lang === 'am'
                  ? `ደረጃ ${summary.overallGrade.code}`
                  : `Grade ${summary.overallGrade.code}`}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 truncate">
              <span>
                {lang === 'am' ? summary.overallGrade.labelAm : summary.overallGrade.labelEn}
              </span>
              {yoyComparison && (
                <>
                  <span className="mx-1.5" aria-hidden="true">·</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      yoyComparison.scoreDeltaPts >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {yoyComparison.scoreDeltaPts >= 0 ? '+' : ''}
                    {yoyComparison.scoreDeltaPts.toFixed(1)}% YoY
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="relative h-14 w-14 shrink-0" aria-hidden="true">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                strokeWidth="5"
                className="stroke-slate-100 dark:stroke-slate-800"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                className={
                  summary.normalizedScorePct >= 100
                    ? 'stroke-emerald-600 dark:stroke-emerald-400'
                    : summary.normalizedScorePct >= 85
                      ? 'stroke-blue-600 dark:stroke-blue-400'
                      : summary.normalizedScorePct >= 70
                        ? 'stroke-amber-500'
                        : 'stroke-red-600'
                }
                initial={prefersReducedMotion ? false : { pathLength: 0 }}
                animate={{
                  pathLength: Math.min(1, Math.max(0.04, summary.normalizedScorePct / 100)),
                }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-slate-900 dark:text-white">
              {summary.overallGrade.code}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'በእቅድ መሰረት ያሉ መለኪያዎች' : 'KPIs Meeting / On Track'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.exceedingCount + summary.onTrackCount}
              <span className="text-lg font-normal text-slate-400">/{summary.rows.length}</span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {summary.exceedingCount} {lang === 'am' ? 'ከ100% በላይ' : '≥100%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              {summary.onTrackCount} {lang === 'am' ? 'በጥሩ ሂደት' : 'on track'}
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              {summary.atRiskCount + summary.criticalCount}{' '}
              {lang === 'am' ? 'ትኩረት የሚሹ' : 'need focus'}
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'ከቅርንጫፍ እቅድ የእኔ አማካይ ድርሻ' : 'Avg. Share of Branch Plan'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {avgBranchShare.toFixed(1)}%
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('branch')}
              className="inline-flex items-center gap-0.5 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              <span>{lang === 'am' ? 'እቅድ እይ' : 'Branch Plan'}</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              {lang === 'am' ? 'እስካሁን ለቅርንጫፉ የተበረከተ፦' : 'Actual branch contribution:'}
            </span>{' '}
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
              {avgBranchActualContrib.toFixed(2)}%
            </span>
          </p>
        </motion.div>

        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16, delay: 0.09, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5"
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'የKPI ክብደት እና ዘርፎች' : 'KPI Weight & Categories'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {summary.totalWeight}%
            </span>
            <span
              className={`text-xs font-semibold ${
                Math.abs(summary.totalWeight - 100) < 0.01
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {Math.abs(summary.totalWeight - 100) < 0.01
                ? lang === 'am'
                  ? 'ተመጣጣኝ (100%)'
                  : 'Balanced (100%)'
                : lang === 'am'
                  ? 'ማስተካከያ ይሻል'
                  : 'Adjust to 100%'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            <span>
              {summary.rows.length} {lang === 'am' ? 'መለኪያዎች' : 'KPIs'}
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              {summary.categorySummaries.length} {lang === 'am' ? 'ንቁ ዘርፎች' : 'active categories'}
            </span>
          </p>
        </motion.div>
      </div>

      {/* Item #1: Daily & Weekly Pace Breakdown Section */}
      <DailyWeeklyPaceSection
        profile={profile}
        kpis={kpis}
        logs={logs}
        categories={categories}
        targetMonthIndex={paceTargetMonthIndex}
        workingDaysPerMonth={workingDaysPerMonth}
        elapsedWorkingDays={elapsedWorkingDays}
        onUpdateWorkingDays={onUpdateWorkingDays}
        onQuickLogForKpi={(kpiId, mIdx) => onQuickLogForKpi(kpiId, mIdx)}
      />

      {/* 2-Column Analytical Visualization Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
        {/* Monthly Trajectory SVG Chart */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'ወርሃዊ የKPI አፈጻጸም አዝማሚያ (12 ወራት)'
                  : 'Monthly Weighted KPI Trajectory (12 Months)'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? '100% የወርሃዊ እቅድ መስመር ከእውነተኛ ወርሃዊ አፈጻጸም ጋር ሲነጻጸር'
                  : 'Comparing 100% monthly target benchmark against recorded monthly achievement'}
              </p>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              {activeHoveredTrend ? (
                <span>
                  {activeHoveredTrend.fullLabel}:{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {activeHoveredTrend.hasData
                      ? `${activeHoveredTrend.weightedActualScorePct.toFixed(1)}%`
                      : lang === 'am'
                        ? 'ክንውን አልተመዘገበም'
                        : 'No actuals yet'}
                  </strong>
                </span>
              ) : (
                <span>
                  {lang === 'am' ? 'በወራት ላይ አመልካቹን ያሳርፉ' : 'Hover or tap bars to inspect'}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-2">
            <svg
              viewBox="0 0 640 210"
              className="w-full h-48 overflow-visible select-none"
              role="img"
              aria-label="Monthly KPI Achievement Chart"
            >
              {[0, 50, 100, 120].map((pct) => {
                const y = 175 - (pct / 125) * 150;
                const isTargetLine = pct === 100;
                return (
                  <g key={pct}>
                    <line
                      x1={38}
                      y1={y}
                      x2={630}
                      y2={y}
                      stroke={isTargetLine ? '#3B82F6' : 'currentColor'}
                      className={isTargetLine ? '' : 'text-slate-200 dark:text-slate-800'}
                      strokeWidth={isTargetLine ? 1.5 : 1}
                      strokeDasharray={isTargetLine ? '5 4' : undefined}
                    />
                    <text
                      x={32}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-slate-400 dark:fill-slate-500 text-[10px] font-mono"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {summary.monthlyCompositeTrend.map((m, idx) => {
                const slotWidth = (630 - 44) / 12;
                const barWidth = 24;
                const x = 46 + idx * slotWidth + (slotWidth - barWidth) / 2;
                const cappedVal = Math.min(125, Math.max(0, m.weightedActualScorePct));
                const barHeight = m.hasData ? Math.max(4, (cappedVal / 125) * 150) : 4;
                const y = 175 - barHeight;
                const isCurrentActive = idx === profile.activeMonthIndex;
                const isHovered = hoveredMonthIdx === idx;

                let barFill = '#94A3B8';
                if (m.hasData) {
                  if (m.weightedActualScorePct >= 100) barFill = '#16A34A';
                  else if (m.weightedActualScorePct >= 85) barFill = '#2563EB';
                  else if (m.weightedActualScorePct >= 70) barFill = '#D97706';
                  else barFill = '#DC2626';
                }

                return (
                  <g
                    key={m.monthIndex}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredMonthIdx(idx)}
                    onMouseLeave={() => setHoveredMonthIdx(null)}
                    onClick={() => onChangeScope({ type: 'month', monthIndex: idx })}
                  >
                    <rect
                      x={x - 6}
                      y={15}
                      width={barWidth + 12}
                      height={185}
                      className={
                        isHovered ? 'fill-slate-100 dark:fill-slate-800/60' : 'fill-transparent'
                      }
                      rx={6}
                    />
                    <motion.rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx={4}
                      fill={barFill}
                      opacity={m.hasData ? 1 : 0.35}
                      style={{ transformBox: 'fill-box', transformOrigin: 'bottom' }}
                      initial={prefersReducedMotion ? false : { scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.2,
                        delay: idx * 0.015,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                    {m.hasData && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 6}
                        textAnchor="middle"
                        className="fill-slate-700 dark:fill-slate-300 text-[9px] font-mono font-semibold"
                      >
                        {Math.round(m.weightedActualScorePct)}%
                      </text>
                    )}
                    <text
                      x={x + barWidth / 2}
                      y={194}
                      textAnchor="middle"
                      className={`text-[10px] ${
                        isCurrentActive
                          ? 'fill-blue-700 dark:fill-blue-400 font-bold'
                          : 'fill-slate-500 dark:fill-slate-400 font-medium'
                      }`}
                    >
                      {m.shortLabel}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {lang === 'am'
                ? 'ሰማያዊ የተቆራረጠ መስመር = 100% ወርሃዊ እቅድ · ወሩን በመጫን ዝርዝሩን ይመልከቱ'
                : 'Dashed blue line = 100% monthly target · Click any month bar to filter'}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('reports')}
              className="font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {lang === 'am' ? 'ሙሉ ሪፖርት እና YoY ንጽጽር →' : 'Full Report & YoY →'}
            </button>
          </div>
        </div>

        {/* Category Performance Breakdown */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'am' ? 'በዘርፍ (Category) የክብደት አፈጻጸም' : 'Performance by KPI Category'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'በእያንዳንዱ የKPI ዘርፍ የተገኘ ነጥብ ከተሰጠው ክብደት አንጻር'
                : 'Weighted points earned vs allocated category weight'}
            </p>

            <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
              {summary.categorySummaries.map((cat) => {
                const pct = Math.min(100, Math.max(0, cat.achievementPct));
                return (
                  <div key={cat.category} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 min-w-0">
                        <CategoryDuotoneIcon
                          category={cat.category}
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="truncate">
                          {getCategoryLabel(cat.category, lang, categories)}
                        </span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
                        <strong className="text-slate-900 dark:text-white">
                          {cat.weightedEarned.toFixed(1)}
                        </strong>{' '}
                        / {cat.weightSum} pts ({cat.achievementPct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <motion.div
                        initial={prefersReducedMotion ? false : { scaleX: 0 }}
                        animate={{ scaleX: pct / 100 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className={`h-full rounded-full origin-left ${
                          cat.achievementPct >= 100
                            ? 'bg-emerald-600'
                            : cat.achievementPct >= 85
                              ? 'bg-blue-600'
                              : cat.achievementPct >= 70
                                ? 'bg-amber-500'
                                : 'bg-red-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'am' ? 'ዘርፎችን እና KPI ለመፍጠር፦' : 'Manage categories & KPIs:'}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('branch')}
              className="font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 hover:underline cursor-pointer"
            >
              {lang === 'am' ? 'የቅርንጫፍ እቅድ ክፈት →' : 'Branch & Categories →'}
            </button>
          </div>
        </div>
      </div>

      {/* High-Density KPI Scorecard Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'am' ? 'ዝርዝር የKPI መለኪያዎች ሰንጠረዥ' : 'Detailed KPI Scorecard Matrix'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? `የተመረጠው ጊዜ፦ ${summary.scopeLabel}`
                : `Evaluated scope: ${summary.scopeLabel}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'am' ? 'KPI ፈልግ...' : 'Search KPI...'}
                className="min-h-[38px] w-40 sm:w-48 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              />
            </div>

            <select
              aria-label={lang === 'am' ? 'በዘርፍ አጣራ' : 'Filter by category'}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden cursor-pointer"
            >
              <option value="all">{lang === 'am' ? 'ሁሉም ዘርፎች' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === 'am' ? c.nameAm || c.nameEn : c.nameEn || c.nameAm}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'am' ? 'ሁሉም' : 'All'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('exceeding')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === 'exceeding'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'am' ? 'በጥሩ ሂደት (≥85%)' : 'On Track'}
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('attention')}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === 'attention'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'am' ? 'ትኩረት የሚሹ' : 'Needs Focus'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 pl-5 pr-3">{lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'የቅርንጫፍ እቅድ' : 'Branch Plan'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'የእኔ እቅድ' : 'My Target'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'ክንውን (Actual)' : 'Actual'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'ልዩነት (Gap)' : 'Variance'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'አፈጻጸም %' : 'Achv %'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'ነጥብ (Weight)' : 'Score'}</th>
                <th className="px-3 py-3">{lang === 'am' ? 'ሁኔታ' : 'Status'}</th>
                <th className="py-3 pl-2 pr-5 text-right">{lang === 'am' ? 'ድርጊት' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredRows.map((row: KpiEvaluatedRow) => {
                const isPositiveVar = row.variance >= 0;
                return (
                  <tr
                    key={row.kpi.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 pl-5 pr-3 max-w-xs">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {row.kpi.name}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-mono">{row.kpi.code}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{getCategoryLabel(row.kpi.category, lang, categories)}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>
                          {lang === 'am'
                            ? `የቅርንጫፍ ድርሻ ${row.branchSharePct.toFixed(1)}%`
                            : `${row.branchSharePct.toFixed(1)}% of branch`}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {formatKpiValue(row.branchAnnualTarget, row.kpi.unit, true)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {formatKpiValue(row.periodTarget, row.kpi.unit)}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {row.hasActualData
                        ? formatKpiValue(row.periodActual, row.kpi.unit)
                        : '—'}
                    </td>
                    <td
                      className={`px-3 py-3.5 text-right font-mono tabular-nums whitespace-nowrap ${
                        !row.hasActualData
                          ? 'text-slate-400'
                          : isPositiveVar
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {row.hasActualData
                        ? `${isPositiveVar ? '+' : '-'}${formatKpiValue(
                            Math.abs(row.variance),
                            row.kpi.unit,
                            true
                          )}`
                        : '—'}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                      {row.hasActualData ? `${row.achievementPct.toFixed(1)}%` : '0.0%'}
                    </td>
                    <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {row.weightedScore.toFixed(1)}
                      </span>
                      <span className="text-slate-400">/{row.maxWeight}</span>
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap">
                      <StatusIndicator status={row.status} lang={lang} />
                    </td>
                    <td className="py-3.5 pl-2 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onQuickLogForKpi(row.kpi.id)}
                        className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{lang === 'am' ? 'ክንውን' : 'Log'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredRows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="py-8 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    {lang === 'am'
                      ? 'ከፍለጋዎ ጋር የሚዛመድ የKPI መለኪያ አልተገኘም።'
                      : 'No KPIs match the current filter criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
