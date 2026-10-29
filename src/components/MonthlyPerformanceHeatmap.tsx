import React, { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react';
import {
  ActualLogEntry,
  EmployeeProfile,
  KpiCategoryDef,
  KpiItem,
  PeriodScope,
  QuarterKey,
} from '../types/kpi';
import {
  computeAchievementPct,
  computeActualForIndices,
  computeTargetForScope,
  getKpiMonthActualInfo,
  PortfolioSummary,
} from '../utils/analytics';
import {
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  MonthMeta,
  QUARTERS,
} from '../utils/i18n';
import { CategoryDuotoneIcon } from './BrandIcons';

export type HeatmapIntensityTier =
  | 'peak'
  | 'target_met'
  | 'on_track'
  | 'developing'
  | 'low'
  | 'unlogged_elapsed'
  | 'unlogged_future'
  | 'no_target';

type HeatmapDisplayMode = 'pct' | 'actual';

interface HeatmapCellData {
  kpiId: string;
  monthIndex: number;
  target: number;
  actual: number;
  hasData: boolean;
  logCount: number;
  achievementPct: number;
  variance: number;
  tier: HeatmapIntensityTier;
}

interface MonthlyPerformanceHeatmapProps {
  profile: EmployeeProfile;
  kpis: KpiItem[];
  logs: ActualLogEntry[];
  categories: KpiCategoryDef[];
  monthlyCompositeTrend: PortfolioSummary['monthlyCompositeTrend'];
  selectedScope: PeriodScope;
  onChangeScope: (scope: PeriodScope) => void;
  onQuickLogForKpi: (kpiId: string, monthIndex?: number) => void;
  onNavigateBranchPlan: () => void;
}

function classifyHeatmapTier(
  achievementPct: number,
  target: number,
  hasData: boolean,
  monthIndex: number,
  activeMonthIndex: number
): HeatmapIntensityTier {
  if (target <= 0) return 'no_target';
  if (!hasData) {
    return monthIndex <= activeMonthIndex ? 'unlogged_elapsed' : 'unlogged_future';
  }
  if (achievementPct >= 115) return 'peak';
  if (achievementPct >= 100) return 'target_met';
  if (achievementPct >= 85) return 'on_track';
  if (achievementPct >= 70) return 'developing';
  return 'low';
}

function classifyCompositeTier(
  scorePct: number,
  hasData: boolean,
  monthIndex: number,
  activeMonthIndex: number
): HeatmapIntensityTier {
  if (!hasData) {
    return monthIndex <= activeMonthIndex ? 'unlogged_elapsed' : 'unlogged_future';
  }
  if (scorePct >= 115) return 'peak';
  if (scorePct >= 100) return 'target_met';
  if (scorePct >= 85) return 'on_track';
  if (scorePct >= 70) return 'developing';
  return 'low';
}

function getHeatmapCellClasses(tier: HeatmapIntensityTier, isSelected: boolean): string {
  const ringClass = isSelected
    ? 'ring-2 ring-blue-600 dark:ring-blue-400 ring-offset-1 ring-offset-white dark:ring-offset-slate-900 z-10'
    : 'hover:brightness-95 dark:hover:brightness-110';

  switch (tier) {
    case 'peak':
      return `bg-emerald-800 dark:bg-emerald-300 text-white dark:text-slate-950 border-emerald-900 dark:border-emerald-200 font-bold ${ringClass}`;
    case 'target_met':
      return `bg-emerald-700 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-800 dark:border-emerald-400 font-semibold ${ringClass}`;
    case 'on_track':
      return `bg-emerald-100 dark:bg-emerald-950/85 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800 font-semibold ${ringClass}`;
    case 'developing':
      return `bg-amber-100 dark:bg-amber-950/80 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800 font-semibold ${ringClass}`;
    case 'low':
      return `bg-rose-200/90 dark:bg-rose-950/90 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-800 font-semibold ${ringClass}`;
    case 'unlogged_elapsed':
      return `bg-rose-50/70 dark:bg-rose-950/25 text-rose-800 dark:text-rose-300 border-dashed border-rose-300 dark:border-rose-800/70 font-medium ${ringClass}`;
    case 'unlogged_future':
      return `bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-slate-800 font-normal ${ringClass}`;
    case 'no_target':
    default:
      return `bg-slate-50/50 dark:bg-slate-900 text-slate-300 dark:text-slate-600 border-slate-100 dark:border-slate-800/60 font-normal ${ringClass}`;
  }
}

function getTierLabel(tier: HeatmapIntensityTier, lang: 'am' | 'en'): string {
  const labels: Record<HeatmapIntensityTier, { am: string; en: string }> = {
    peak: { am: 'ከፍተኛ ብቃት (≥115%)', en: 'Peak Attainment (≥115%)' },
    target_met: { am: 'እቅድ የተሳካ (100–114%)', en: 'Target Met (100–114%)' },
    on_track: { am: 'በጥሩ ሂደት (85–99%)', en: 'On Track (85–99%)' },
    developing: { am: 'መካከለኛ (70–84%)', en: 'Developing (70–84%)' },
    low: { am: 'ዝቅተኛ አፈጻጸም (<70%)', en: 'Low Attainment (<70%)' },
    unlogged_elapsed: { am: 'ያልተመዘገበ (ያለፈ ወር)', en: 'Unlogged (Elapsed Month)' },
    unlogged_future: { am: 'ቀጣይ ወር (ያልደረሰ)', en: 'Upcoming Fiscal Month' },
    no_target: { am: 'እቅድ የለም', en: 'No Monthly Target' },
  };
  return labels[tier][lang];
}

export const MonthlyPerformanceHeatmap: React.FC<MonthlyPerformanceHeatmapProps> = ({
  profile,
  kpis,
  logs,
  categories,
  monthlyCompositeTrend,
  selectedScope,
  onChangeScope,
  onQuickLogForKpi,
  onNavigateBranchPlan,
}) => {
  const lang = profile.language;
  const months = useMemo(() => getFiscalMonths(profile.calendarType), [profile.calendarType]);

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<HeatmapDisplayMode>('pct');
  const [selectedCoords, setSelectedCoords] = useState<{
    kpiId: string;
    monthIndex: number;
  } | null>(null);

  const filteredKpis = useMemo(() => {
    if (categoryFilter === 'all') return kpis;
    return kpis.filter((k) => k.category === categoryFilter);
  }, [kpis, categoryFilter]);

  const matrixRows = useMemo(() => {
    const ytdIndices = Array.from(
      { length: Math.max(1, Math.min(12, profile.activeMonthIndex + 1)) },
      (_, i) => i
    );

    return filteredKpis.map((kpi) => {
      const cells: HeatmapCellData[] = months.map((m) => {
        const target = kpi.monthlyTargets[m.index] ?? 0;
        const actualInfo = getKpiMonthActualInfo(kpi.id, m.index, logs);
        const achievementPct = actualInfo.hasData
          ? computeAchievementPct(kpi, target, actualInfo.value, true)
          : 0;
        const variance =
          kpi.direction === 'higher_better'
            ? actualInfo.value - target
            : target - actualInfo.value;
        const tier = classifyHeatmapTier(
          achievementPct,
          target,
          actualInfo.hasData,
          m.index,
          profile.activeMonthIndex
        );

        return {
          kpiId: kpi.id,
          monthIndex: m.index,
          target,
          actual: actualInfo.value,
          hasData: actualInfo.hasData,
          logCount: actualInfo.logCount,
          achievementPct,
          variance,
          tier,
        };
      });

      const ytdTarget = computeTargetForScope(kpi, { type: 'ytd' }, profile.activeMonthIndex);
      const ytdActualInfo = computeActualForIndices(kpi, ytdIndices, logs);
      const ytdAchievementPct = ytdActualInfo.hasData
        ? computeAchievementPct(kpi, ytdTarget, ytdActualInfo.actual, true)
        : 0;

      const targetMetMonths = cells.filter(
        (c) => c.hasData && c.target > 0 && c.achievementPct >= 100
      ).length;
      const loggedMonths = cells.filter((c) => c.hasData && c.target > 0).length;

      return {
        kpi,
        cells,
        ytdTarget,
        ytdActual: ytdActualInfo.actual,
        ytdHasData: ytdActualInfo.hasData,
        ytdAchievementPct,
        targetMetMonths,
        loggedMonths,
      };
    });
  }, [filteredKpis, months, logs, profile.activeMonthIndex]);

  const densityStats = useMemo(() => {
    let totalTargetCells = 0;
    let loggedCells = 0;
    let targetMetCells = 0;
    let peakCells = 0;
    let lowCells = 0;
    let unloggedElapsedCells = 0;

    const perMonthTargetMetCounts = Array.from({ length: 12 }, () => ({
      met: 0,
      logged: 0,
      totalWithTarget: 0,
    }));

    for (const row of matrixRows) {
      for (const cell of row.cells) {
        if (cell.target > 0) {
          totalTargetCells += 1;
          perMonthTargetMetCounts[cell.monthIndex].totalWithTarget += 1;
          if (cell.hasData) {
            loggedCells += 1;
            perMonthTargetMetCounts[cell.monthIndex].logged += 1;
            if (cell.achievementPct >= 100) {
              targetMetCells += 1;
              perMonthTargetMetCounts[cell.monthIndex].met += 1;
            }
            if (cell.achievementPct >= 115) {
              peakCells += 1;
            }
            if (cell.achievementPct < 70) {
              lowCells += 1;
            }
          } else if (cell.monthIndex <= profile.activeMonthIndex) {
            unloggedElapsedCells += 1;
          }
        }
      }
    }

    const populatedMonths = monthlyCompositeTrend.filter((m) => m.hasData);
    let peakMonth: PortfolioSummary['monthlyCompositeTrend'][number] | null = null;
    let lowestMonth: PortfolioSummary['monthlyCompositeTrend'][number] | null = null;

    for (const m of populatedMonths) {
      if (!peakMonth || m.weightedActualScorePct > peakMonth.weightedActualScorePct) {
        peakMonth = m;
      }
      if (!lowestMonth || m.weightedActualScorePct < lowestMonth.weightedActualScorePct) {
        lowestMonth = m;
      }
    }

    const hitRatePct = loggedCells > 0 ? (targetMetCells / loggedCells) * 100 : 0;

    return {
      totalTargetCells,
      loggedCells,
      targetMetCells,
      peakCells,
      lowCells,
      unloggedElapsedCells,
      hitRatePct,
      peakMonth,
      lowestMonth,
      perMonthTargetMetCounts,
    };
  }, [matrixRows, monthlyCompositeTrend, profile.activeMonthIndex]);

  // Resolve active inspected cell (user-selected or smart default in active fiscal month)
  const inspectedDetail = useMemo(() => {
    if (matrixRows.length === 0) return null;

    if (selectedCoords) {
      const foundRow = matrixRows.find((r) => r.kpi.id === selectedCoords.kpiId);
      const foundCell = foundRow?.cells[selectedCoords.monthIndex];
      const foundMonth = months[selectedCoords.monthIndex];
      if (foundRow && foundCell && foundMonth) {
        return { row: foundRow, cell: foundCell, month: foundMonth };
      }
    }

    const defaultMonthIdx =
      selectedScope.type === 'month'
        ? selectedScope.monthIndex
        : Math.max(0, Math.min(11, profile.activeMonthIndex));

    const firstRow = matrixRows[0];
    const defaultCell = firstRow.cells[defaultMonthIdx] || firstRow.cells[0];
    const defaultMonth = months[defaultCell.monthIndex] || months[0];

    return { row: firstRow, cell: defaultCell, month: defaultMonth };
  }, [matrixRows, selectedCoords, selectedScope, profile.activeMonthIndex, months]);

  const handleToggleMonthScope = (monthIndex: number) => {
    if (selectedScope.type === 'month' && selectedScope.monthIndex === monthIndex) {
      onChangeScope({ type: 'ytd' });
    } else {
      onChangeScope({ type: 'month', monthIndex });
    }
  };

  const activeCutoffMonth: MonthMeta =
    months[profile.activeMonthIndex] || months[0];

  return (
    <section
      aria-label={
        lang === 'am'
          ? 'ወርሃዊ የአፈጻጸም ጥግግት ካርታ'
          : 'Monthly Performance Heatmap'
      }
      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
    >
      {/* Top Header & Controls */}
      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === 'am'
              ? 'ወርሃዊ የአፈጻጸም ጥግግት ካርታ (12-ወር Heatmap)'
              : 'Monthly Performance Heatmap'}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {lang === 'am'
                ? `የበጀት ዓመት ${profile.fiscalYearLabel}`
                : `FY ${profile.fiscalYearLabel}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {lang === 'am'
                ? `የአሁኑ ወር፦ ${activeCutoffMonth.fullAm}`
                : `Active cutoff: ${activeCutoffMonth.shortEn}`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              {lang === 'am'
                ? `${densityStats.loggedCells}/${densityStats.totalTargetCells} የKPI-ወራት ተመዝግበዋል`
                : `${densityStats.loggedCells}/${densityStats.totalTargetCells} KPI-months logged`}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label={lang === 'am' ? 'በKPI ዘርፍ አጣራ' : 'Filter heatmap by KPI category'}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden cursor-pointer"
          >
            <option value="all">
              {lang === 'am' ? 'ሁሉም የKPI ዘርፎች' : 'All Categories'}
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {lang === 'am' ? cat.nameAm : cat.nameEn}
              </option>
            ))}
          </select>

          <div
            role="group"
            aria-label={lang === 'am' ? 'የሳጥን ማሳያ ዘዴ' : 'Heatmap cell value mode'}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1"
          >
            <button
              type="button"
              onClick={() => setDisplayMode('pct')}
              className={`min-h-[30px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                displayMode === 'pct'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'am' ? '% አፈጻጸም' : '% Attainment'}
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode('actual')}
              className={`min-h-[30px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                displayMode === 'actual'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'am' ? 'ክንውን (Actual)' : 'Actual Values'}
            </button>
          </div>
        </div>
      </div>

      {/* 4-Column Attainment Density Summary Strip (Flat Hairline Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/60">
        {/* Peak Attainment Month */}
        <div className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'ከፍተኛ አፈጻጸም የተመዘገበበት ወር' : 'Peak Attainment Month'}
          </span>
          {densityStats.peakMonth ? (
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleMonthScope(densityStats.peakMonth!.monthIndex)}
                className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                <ArrowUpRight className="h-4 w-4 shrink-0" />
                <span>{densityStats.peakMonth.fullLabel}</span>
              </button>
              <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {densityStats.peakMonth.weightedActualScorePct.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              {lang === 'am' ? 'ክንውን አልተመዘገበም' : 'No logged months yet'}
            </span>
          )}
        </div>

        {/* Lowest Attainment Month */}
        <div className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'ዝቅተኛ አፈጻጸም የታየበት ወር' : 'Lowest Attainment Month'}
          </span>
          {densityStats.lowestMonth ? (
            <div className="mt-1.5 flex items-baseline justify-between gap-2">
              <button
                type="button"
                onClick={() => handleToggleMonthScope(densityStats.lowestMonth!.monthIndex)}
                className="inline-flex items-center gap-1 text-sm font-bold text-rose-700 dark:text-rose-400 hover:underline cursor-pointer whitespace-nowrap"
              >
                <ArrowDownRight className="h-4 w-4 shrink-0" />
                <span>{densityStats.lowestMonth.fullLabel}</span>
              </button>
              <span className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                {densityStats.lowestMonth.weightedActualScorePct.toFixed(1)}%
              </span>
            </div>
          ) : (
            <span className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
              {lang === 'am' ? 'ክንውን አልተመዘገበም' : 'No logged months yet'}
            </span>
          )}
        </div>

        {/* Target Hit Density (>=100%) */}
        <div className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'እቅድ ያሳኩ ሳጥኖች ጥግግት (≥100%)' : 'Target-Met Density (≥100%)'}
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              {densityStats.hitRatePct.toFixed(0)}%
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {densityStats.targetMetCells}/{densityStats.loggedCells}{' '}
              {lang === 'am' ? 'ሳጥኖች' : 'logged'} · {densityStats.peakCells}{' '}
              {lang === 'am' ? 'ከፍተኛ' : 'peak'}
            </span>
          </div>
        </div>

        {/* Low Attainment & Unlogged Gaps */}
        <div className="p-4 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'ዝቅተኛ (<70%) እና ያልተመዘገቡ ክፍተቶች' : 'Low (<70%) & Unlogged Elapsed'}
          </span>
          <div className="mt-1.5 flex items-baseline justify-between gap-2 font-mono tabular-nums">
            <span
              className={`text-sm font-bold ${
                densityStats.lowCells > 0
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {densityStats.lowCells} {lang === 'am' ? 'ዝቅተኛ' : 'low'}
            </span>
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {densityStats.unloggedElapsedCells}{' '}
              {lang === 'am' ? 'ያልተመዘገቡ (እስከ አሁን)' : 'unlogged YTD'}
            </span>
          </div>
        </div>
      </div>

      {/* Empty State vs Populated Heatmap Matrix */}
      {matrixRows.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {lang === 'am'
              ? 'በዚህ ዘርፍ ምንም የKPI መለኪያ አልተገኘም።'
              : 'No KPIs match the selected category filter.'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? 'ማጣሪያውን ያጽዱ ወይም አዲስ KPI በቅርንጫፍ እቅድ ገጽ ይፍጠሩ።'
              : 'Reset the category filter or add KPIs in the Branch Plan workspace.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            {categoryFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer whitespace-nowrap shrink-0"
              >
                {lang === 'am' ? 'ሁሉንም አሳይ' : 'Show All Categories'}
              </button>
            )}
            <button
              type="button"
              onClick={onNavigateBranchPlan}
              className="min-h-[38px] rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              {lang === 'am' ? 'ወደ ቅርንጫፍ እቅድ ሂድ' : 'Manage KPIs'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-left">
              <thead>
                {/* Quarter Span Grouping Row */}
                <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-900 px-4 py-2 text-left font-medium">
                    {lang === 'am' ? 'የሩብ ዓመት ክፍፍል' : 'Fiscal Quarters'}
                  </th>
                  {QUARTERS.map((q: QuarterKey) => {
                    const isQuarterScoped =
                      selectedScope.type === 'quarter' && selectedScope.quarter === q;
                    return (
                      <th
                        key={q}
                        colSpan={3}
                        className="border-l border-slate-200/70 dark:border-slate-800 px-2 py-1.5 text-center"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            onChangeScope(
                              isQuarterScoped ? { type: 'ytd' } : { type: 'quarter', quarter: q }
                            )
                          }
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                            isQuarterScoped
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-400'
                          }`}
                        >
                          <span>{q}</span>
                        </button>
                      </th>
                    );
                  })}
                  <th className="border-l border-slate-200/70 dark:border-slate-800 px-3 py-1.5 text-right font-medium">
                    {lang === 'am' ? 'እስከ አሁን' : 'YTD Pace'}
                  </th>
                </tr>

                {/* 12 Month Column Headers */}
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs">
                  <th className="sticky left-0 z-20 w-[230px] min-w-[210px] bg-white dark:bg-slate-900 px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                    {lang === 'am' ? 'የKPI መለኪያ እና ክብደት' : 'KPI Metric & Weight'}
                  </th>
                  {months.map((m) => {
                    const isCurrentCutoff = m.index === profile.activeMonthIndex;
                    const isScopedMonth =
                      selectedScope.type === 'month' && selectedScope.monthIndex === m.index;
                    return (
                      <th
                        key={m.index}
                        className={`min-w-[56px] px-1 py-2 text-center ${
                          m.index % 3 === 0
                            ? 'border-l border-slate-200/70 dark:border-slate-800'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleMonthScope(m.index)}
                          title={
                            lang === 'am'
                              ? `${m.fullAm} — ዳሽቦርዱን በዚህ ወር ለማጣራት ይጫኑ`
                              : `${m.fullEn} — Click to filter Overview by this month`
                          }
                          className={`w-full rounded-md px-1 py-1 text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                            isScopedMonth
                              ? 'bg-blue-600 text-white font-bold'
                              : isCurrentCutoff
                                ? 'text-blue-700 dark:text-blue-400 font-bold underline decoration-2 underline-offset-4 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                                : 'text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {lang === 'am' ? m.shortAm : m.shortEn}
                        </button>
                      </th>
                    );
                  })}
                  <th className="w-[104px] min-w-[96px] border-l border-slate-200/70 dark:border-slate-800 px-3 py-2.5 text-right font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                    {lang === 'am' ? 'YTD አማካይ' : 'YTD Score'}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {/* Pinned Row 0: Weighted Portfolio Attainment Density */}
                <tr className="bg-slate-50/90 dark:bg-slate-800/50">
                  <td className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-800/95 px-4 py-2.5 border-r border-slate-200/60 dark:border-slate-800">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {lang === 'am'
                        ? 'የፖርትፎሊዮ ክብደታዊ አማካይ'
                        : 'Weighted Portfolio Density'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'am'
                        ? 'ጠቅላላ ወርሃዊ የክብደት ውጤት'
                        : 'Composite monthly score · hit count'}
                    </div>
                  </td>

                  {monthlyCompositeTrend.map((m) => {
                    const compTier = classifyCompositeTier(
                      m.weightedActualScorePct,
                      m.hasData,
                      m.monthIndex,
                      profile.activeMonthIndex
                    );
                    const monthHitMeta = densityStats.perMonthTargetMetCounts[m.monthIndex];
                    const isScopedMonth =
                      selectedScope.type === 'month' &&
                      selectedScope.monthIndex === m.monthIndex;

                    return (
                      <td
                        key={m.monthIndex}
                        className={`p-1 ${
                          m.monthIndex % 3 === 0
                            ? 'border-l border-slate-200/70 dark:border-slate-800'
                            : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleMonthScope(m.monthIndex)}
                          title={
                            m.hasData
                              ? `${m.fullLabel}: ${m.weightedActualScorePct.toFixed(1)}% (${monthHitMeta.met}/${monthHitMeta.totalWithTarget} ≥100%)`
                              : `${m.fullLabel}: ${lang === 'am' ? 'ክንውን አልተመዘገበም' : 'No actuals logged'}`
                          }
                          className={`flex min-h-[42px] w-full flex-col items-center justify-center rounded-md border px-1 py-1 font-mono tabular-nums transition-colors duration-150 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${getHeatmapCellClasses(
                            compTier,
                            isScopedMonth
                          )}`}
                        >
                          {m.hasData ? (
                            <>
                              <span className="text-[11px] leading-tight">
                                {Math.round(m.weightedActualScorePct)}%
                              </span>
                              <span className="text-[9px] leading-tight opacity-85">
                                {monthHitMeta.met}/{monthHitMeta.totalWithTarget}
                              </span>
                            </>
                          ) : (
                            <span className="text-[11px]">—</span>
                          )}
                        </button>
                      </td>
                    );
                  })}

                  <td className="border-l border-slate-200/70 dark:border-slate-800 px-3 py-2.5 text-right font-mono tabular-nums">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {densityStats.hitRatePct.toFixed(0)}%
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {lang === 'am' ? 'እቅድ ያሳኩ' : 'hit rate'}
                    </div>
                  </td>
                </tr>

                {/* Individual KPI Heatmap Rows */}
                {matrixRows.map((row) => {
                  const { kpi, cells, ytdAchievementPct, ytdHasData, targetMetMonths, loggedMonths } =
                    row;
                  const kpiDisplayName =
                    lang === 'en' && kpi.nameEn ? kpi.nameEn : kpi.name;
                  const catLabel = getCategoryLabel(kpi.category, lang, categories);

                  return (
                    <tr
                      key={kpi.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-4 py-2 border-r border-slate-200/60 dark:border-slate-800">
                        <div className="flex items-start gap-2 min-w-0">
                          <CategoryDuotoneIcon
                            category={kpi.category}
                            className="mt-0.5 h-4 w-4 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div
                              className="truncate text-xs font-semibold text-slate-900 dark:text-white"
                              title={kpiDisplayName}
                            >
                              {kpiDisplayName}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              <span className="font-mono tabular-nums">{kpi.weight}% wt</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{catLabel}</span>
                              {kpi.direction === 'lower_better' && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-mono text-[10px]">↓ min</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {cells.map((cell) => {
                        const monthMeta = months[cell.monthIndex];
                        const isSelected =
                          inspectedDetail?.cell.kpiId === kpi.id &&
                          inspectedDetail?.cell.monthIndex === cell.monthIndex;

                        const cellText = !cell.hasData
                          ? cell.target <= 0
                            ? 'N/A'
                            : '—'
                          : displayMode === 'pct'
                            ? `${Math.round(cell.achievementPct)}%`
                            : formatKpiValue(cell.actual, kpi.unit, true)
                                .replace(' ETB', '')
                                .trim();

                        const tooltipText = `${kpiDisplayName} — ${
                          lang === 'am' ? monthMeta.fullAm : monthMeta.fullEn
                        } | ${
                          lang === 'am' ? 'እቅድ' : 'Plan'
                        }: ${formatKpiValue(cell.target, kpi.unit, true)} | ${
                          lang === 'am' ? 'ክንውን' : 'Actual'
                        }: ${
                          cell.hasData
                            ? formatKpiValue(cell.actual, kpi.unit, true)
                            : lang === 'am'
                              ? 'አልተመዘገበም'
                              : 'Unlogged'
                        }${
                          cell.hasData
                            ? ` (${cell.achievementPct.toFixed(1)}%)`
                            : ''
                        }`;

                        return (
                          <td
                            key={cell.monthIndex}
                            className={`p-1 ${
                              cell.monthIndex % 3 === 0
                                ? 'border-l border-slate-200/70 dark:border-slate-800'
                                : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCoords({
                                  kpiId: kpi.id,
                                  monthIndex: cell.monthIndex,
                                })
                              }
                              onDoubleClick={() =>
                                onQuickLogForKpi(kpi.id, cell.monthIndex)
                              }
                              title={tooltipText}
                              aria-label={tooltipText}
                              className={`flex min-h-[40px] w-full items-center justify-center rounded-md border px-1 py-1 font-mono text-[11px] tabular-nums transition-colors duration-150 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 ${getHeatmapCellClasses(
                                cell.tier,
                                isSelected
                              )}`}
                            >
                              <span className="truncate max-w-[54px]">{cellText}</span>
                            </button>
                          </td>
                        );
                      })}

                      {/* Right Column: YTD Score & Target Hit Count */}
                      <td className="border-l border-slate-200/70 dark:border-slate-800 px-3 py-2 text-right font-mono tabular-nums">
                        {ytdHasData ? (
                          <div>
                            <div
                              className={`text-xs font-bold ${
                                ytdAchievementPct >= 100
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : ytdAchievementPct >= 85
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : ytdAchievementPct >= 70
                                      ? 'text-amber-700 dark:text-amber-400'
                                      : 'text-rose-700 dark:text-rose-400'
                              }`}
                            >
                              {ytdAchievementPct.toFixed(0)}%
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {targetMetMonths}/{loggedMonths} ≥100%
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Interactive Selected Cell Inspector & Quick Action Bar */}
          {inspectedDetail && (
            <div className="flex flex-col gap-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span className="font-bold text-slate-900 dark:text-white">
                    {lang === 'en' && inspectedDetail.row.kpi.nameEn
                      ? inspectedDetail.row.kpi.nameEn
                      : inspectedDetail.row.kpi.name}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    {lang === 'am'
                      ? inspectedDetail.month.fullAm
                      : inspectedDetail.month.fullEn}
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {getTierLabel(inspectedDetail.cell.tier, lang)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-xs tabular-nums text-slate-600 dark:text-slate-300">
                  <span>
                    {lang === 'am' ? 'ወርሃዊ እቅድ፦ ' : 'Plan: '}
                    <strong className="text-slate-900 dark:text-white">
                      {formatKpiValue(
                        inspectedDetail.cell.target,
                        inspectedDetail.row.kpi.unit
                      )}
                    </strong>
                  </span>
                  <span aria-hidden="true" className="text-slate-400">
                    ·
                  </span>
                  <span>
                    {lang === 'am' ? 'ክንውን፦ ' : 'Actual: '}
                    <strong className="text-slate-900 dark:text-white">
                      {inspectedDetail.cell.hasData
                        ? formatKpiValue(
                            inspectedDetail.cell.actual,
                            inspectedDetail.row.kpi.unit
                          )
                        : lang === 'am'
                          ? 'አልተመዘገበም'
                          : 'Unlogged'}
                    </strong>
                  </span>
                  {inspectedDetail.cell.hasData && (
                    <>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span>
                        {lang === 'am' ? 'አፈጻጸም፦ ' : 'Attainment: '}
                        <strong
                          className={
                            inspectedDetail.cell.achievementPct >= 100
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : inspectedDetail.cell.achievementPct >= 85
                                ? 'text-blue-700 dark:text-blue-400'
                                : inspectedDetail.cell.achievementPct >= 70
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {inspectedDetail.cell.achievementPct.toFixed(1)}%
                        </strong>
                      </span>
                      <span aria-hidden="true" className="text-slate-400">
                        ·
                      </span>
                      <span>
                        {lang === 'am' ? 'ልዩነት፦ ' : 'Variance: '}
                        <strong
                          className={
                            inspectedDetail.cell.variance >= 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }
                        >
                          {inspectedDetail.cell.variance >= 0 ? '+' : '-'}
                          {formatKpiValue(
                            Math.abs(inspectedDetail.cell.variance),
                            inspectedDetail.row.kpi.unit,
                            true
                          )}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleMonthScope(inspectedDetail.cell.monthIndex)}
                  className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {selectedScope.type === 'month' &&
                  selectedScope.monthIndex === inspectedDetail.cell.monthIndex
                    ? lang === 'am'
                      ? 'ወደ YTD መልስ'
                      : 'Reset to YTD'
                    : lang === 'am'
                      ? `${inspectedDetail.month.shortAm} ወርን አጣራ`
                      : `Filter ${inspectedDetail.month.shortEn}`}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onQuickLogForKpi(
                      inspectedDetail.row.kpi.id,
                      inspectedDetail.cell.monthIndex
                    )
                  }
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {lang === 'am'
                      ? `ክንውን መዝግብ (${inspectedDetail.month.shortAm})`
                      : `Log Actual (${inspectedDetail.month.shortEn})`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Accessible 5-Step Color Intensity Scale Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 px-5 py-3 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የቀለም ጥግግት መለኪያ፦' : 'Attainment Intensity:'}
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-xs border border-rose-300 dark:border-rose-800 bg-rose-200/90 dark:bg-rose-950/90"
                />
                <span>{lang === 'am' ? '<70% ዝቅተኛ' : '<70% Low'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-xs border border-amber-300 dark:border-amber-800 bg-amber-100 dark:bg-amber-950/80"
                />
                <span>{lang === 'am' ? '70–84% መካከለኛ' : '70–84% Developing'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-xs border border-emerald-300 dark:border-emerald-800 bg-emerald-100 dark:bg-emerald-950/85"
                />
                <span>{lang === 'am' ? '85–99% በጥሩ ሂደት' : '85–99% On Track'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-xs border border-emerald-800 dark:border-emerald-400 bg-emerald-700 dark:bg-emerald-500"
                />
                <span>{lang === 'am' ? '100–114% የተሳካ' : '100–114% Met'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-xs border border-emerald-900 dark:border-emerald-200 bg-emerald-800 dark:bg-emerald-300"
                />
                <span>{lang === 'am' ? '≥115% ከፍተኛ' : '≥115% Peak'}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 rounded-xs border border-dashed border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30"
                />
                <span>{lang === 'am' ? 'ያልተመዘገበ (YTD)' : 'Unlogged (YTD)'}</span>
              </span>
            </div>

            <span className="text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'ሳጥን ይጫኑ ዝርዝር ለማየት · ሁለቴ ይጫኑ ክንውን ለመመዝገብ'
                : 'Click cell to inspect · Double-click to log actual'}
            </span>
          </div>
        </>
      )}
    </section>
  );
};
