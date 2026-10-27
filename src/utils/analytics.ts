import {
  ActualLogEntry,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategory,
  KpiCategoryDef,
  KpiItem,
  Language,
  PeriodScope,
} from '../types/kpi';
import {
  DEFAULT_KPI_CATEGORIES,
  getFiscalMonths,
  getQuarterLabel,
  QUARTER_MONTH_INDICES,
} from './i18n';

export type PerformanceStatus = 'exceptional' | 'on_track' | 'at_risk' | 'critical' | 'no_target';

export interface KpiEvaluatedRow {
  kpi: KpiItem;
  branchAnnualTarget: number;
  personalAnnualTarget: number;
  branchSharePct: number;
  periodTarget: number;
  periodActual: number;
  hasActualData: boolean;
  variance: number;
  achievementPct: number;
  weightedScore: number;
  maxWeight: number;
  status: PerformanceStatus;
  annualActualYtd: number;
  annualAchievementPct: number;
  annualRemainingGap: number;
  requiredMonthlyRunRate: number | null;
  branchActualContributionPct: number;
}

export interface PortfolioSummary {
  scopeLabel: string;
  totalWeight: number;
  totalWeightedPoints: number;
  normalizedScorePct: number;
  overallGrade: {
    code: 'A+' | 'A' | 'B' | 'C' | 'D';
    labelAm: string;
    labelEn: string;
    status: PerformanceStatus;
  };
  exceedingCount: number;
  onTrackCount: number;
  atRiskCount: number;
  criticalCount: number;
  rows: KpiEvaluatedRow[];
  monthlyCompositeTrend: {
    monthIndex: number;
    shortLabel: string;
    fullLabel: string;
    weightedTargetPct: number;
    weightedActualScorePct: number;
    hasData: boolean;
  }[];
  categorySummaries: {
    category: KpiCategory;
    weightSum: number;
    weightedEarned: number;
    achievementPct: number;
    kpiCount: number;
  }[];
}

export function getMonthIndicesForScope(scope: PeriodScope, activeMonthIndex: number): number[] {
  if (scope.type === 'month') {
    return [scope.monthIndex];
  }
  if (scope.type === 'quarter') {
    return QUARTER_MONTH_INDICES[scope.quarter];
  }
  if (scope.type === 'ytd') {
    const end = Math.max(0, Math.min(11, activeMonthIndex));
    return Array.from({ length: end + 1 }, (_, i) => i);
  }
  return Array.from({ length: 12 }, (_, i) => i);
}

export function getScopeLabel(scope: PeriodScope, profile: EmployeeProfile, lang: Language): string {
  const months = getFiscalMonths(profile.calendarType);
  if (scope.type === 'annual') {
    return lang === 'am'
      ? `ዓመታዊ አጠቃላይ (${profile.fiscalYearLabel})`
      : `Full Fiscal Year (${profile.fiscalYearLabel})`;
  }
  if (scope.type === 'ytd') {
    const m = months[profile.activeMonthIndex] || months[0];
    return lang === 'am'
      ? `እስከ ${m.fullAm} ድረስ (YTD)`
      : `Year-to-Date through ${m.shortEn} (YTD)`;
  }
  if (scope.type === 'quarter') {
    return getQuarterLabel(scope.quarter, lang);
  }
  const m = months[scope.monthIndex] || months[0];
  return lang === 'am' ? `ወርሃዊ — ${m.fullAm}` : `Monthly — ${m.fullEn}`;
}

export function getKpiMonthActualInfo(
  kpiId: string,
  monthIndex: number,
  logs: ActualLogEntry[]
): { value: number; hasData: boolean; logCount: number } {
  const matching = logs.filter((l) => l.kpiId === kpiId && l.monthIndex === monthIndex);
  if (matching.length === 0) {
    return { value: 0, hasData: false, logCount: 0 };
  }
  const total = matching.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  return {
    value: total,
    hasData: true,
    logCount: matching.filter((m) => !m.isDirectOverride).length || matching.length,
  };
}

export function aggregateValues(values: number[], mode: 'sum' | 'average'): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return mode === 'average' ? sum / values.length : sum;
}

export function computeTargetForScope(kpi: KpiItem, scope: PeriodScope, activeMonthIndex: number): number {
  if (scope.type === 'annual') {
    return kpi.personalAnnualTarget;
  }
  if (scope.type === 'quarter') {
    return kpi.quarterlyTargets[scope.quarter] ?? 0;
  }
  if (scope.type === 'month') {
    return kpi.monthlyTargets[scope.monthIndex] ?? 0;
  }
  const indices = getMonthIndicesForScope(scope, activeMonthIndex);
  const vals = indices.map((idx) => kpi.monthlyTargets[idx] ?? 0);
  return aggregateValues(vals, kpi.aggregation);
}

export function computeActualForIndices(
  kpi: KpiItem,
  indices: number[],
  logs: ActualLogEntry[]
): { actual: number; hasData: boolean } {
  const monthInfos = indices.map((idx) => getKpiMonthActualInfo(kpi.id, idx, logs));
  const anyData = monthInfos.some((m) => m.hasData);
  if (!anyData) {
    return { actual: 0, hasData: false };
  }
  if (kpi.aggregation === 'average') {
    const populated = monthInfos.filter((m) => m.hasData).map((m) => m.value);
    return {
      actual: populated.reduce((a, b) => a + b, 0) / populated.length,
      hasData: true,
    };
  }
  return {
    actual: monthInfos.reduce((a, b) => a + b.value, 0),
    hasData: true,
  };
}

export function computeAchievementPct(
  kpi: KpiItem,
  target: number,
  actual: number,
  hasData: boolean
): number {
  if (target <= 0) {
    return actual > 0 ? 100 : 0;
  }
  if (kpi.direction === 'higher_better') {
    return Math.max(0, (actual / target) * 100);
  }
  if (!hasData) return 0;
  if (actual <= 0) return 120;
  if (actual <= target) {
    return 100 + ((target - actual) / target) * 100;
  }
  return Math.max(0, (target / actual) * 100);
}

export function classifyStatus(achievementPct: number, target: number): PerformanceStatus {
  if (target <= 0) return 'no_target';
  if (achievementPct >= 100) return 'exceptional';
  if (achievementPct >= 85) return 'on_track';
  if (achievementPct >= 70) return 'at_risk';
  return 'critical';
}

export function getStatusLabel(status: PerformanceStatus, lang: Language): string {
  const labels: Record<PerformanceStatus, { am: string; en: string }> = {
    exceptional: { am: 'ከእቅድ በላይ (≥100%)', en: 'Exceeding (≥100%)' },
    on_track: { am: 'በጥሩ ሂደት (85–99%)', en: 'On Track (85–99%)' },
    at_risk: { am: 'ትኩረት የሚሻ (70–84%)', en: 'Needs Attention (70–84%)' },
    critical: { am: 'ዝቅተኛ (<70%)', en: 'Behind Plan (<70%)' },
    no_target: { am: 'እቅድ አልተሞላም', en: 'No Target Set' },
  };
  return labels[status][lang];
}

export function getOverallGrade(scorePct: number): PortfolioSummary['overallGrade'] {
  if (scorePct >= 100) {
    return {
      code: 'A+',
      labelAm: 'የላቀ አፈጻጸም (Distinguished)',
      labelEn: 'Distinguished Performance',
      status: 'exceptional',
    };
  }
  if (scorePct >= 90) {
    return {
      code: 'A',
      labelAm: 'ከሚጠበቀው በላይ (Exceeds)',
      labelEn: 'Exceeds Expectations',
      status: 'exceptional',
    };
  }
  if (scorePct >= 80) {
    return {
      code: 'B',
      labelAm: 'ጥሩ አፈጻጸም (Commendable)',
      labelEn: 'Meets & Solid Progress',
      status: 'on_track',
    };
  }
  if (scorePct >= 70) {
    return {
      code: 'C',
      labelAm: 'መካከለኛ — ማሻሻያ የሚሻ',
      labelEn: 'Developing — Needs Focus',
      status: 'at_risk',
    };
  }
  return {
    code: 'D',
    labelAm: 'ዝቅተኛ — አስቸኳይ ትኩረት',
    labelEn: 'Below Target — Action Needed',
    status: 'critical',
  };
}

export function evaluatePortfolio(
  kpis: KpiItem[],
  logs: ActualLogEntry[],
  profile: EmployeeProfile,
  scope: PeriodScope,
  categories: KpiCategoryDef[] = DEFAULT_KPI_CATEGORIES
): PortfolioSummary {
  const scopeIndices = getMonthIndicesForScope(scope, profile.activeMonthIndex);
  const ytdIndices = getMonthIndicesForScope({ type: 'ytd' }, profile.activeMonthIndex);
  const allYearIndices = Array.from({ length: 12 }, (_, i) => i);
  const remainingMonthsCount = Math.max(0, 12 - (profile.activeMonthIndex + 1));

  const rows: KpiEvaluatedRow[] = kpis.map((kpi) => {
    const periodTarget = computeTargetForScope(kpi, scope, profile.activeMonthIndex);
    const { actual: periodActual, hasData: hasActualData } = computeActualForIndices(
      kpi,
      scopeIndices,
      logs
    );

    const achievementPct = computeAchievementPct(kpi, periodTarget, periodActual, hasActualData);
    const cappedRatio = Math.min(achievementPct / 100, 1.2);
    const weightedScore = periodTarget > 0 ? cappedRatio * kpi.weight : 0;

    const variance =
      kpi.direction === 'higher_better' ? periodActual - periodTarget : periodTarget - periodActual;

    const status = classifyStatus(achievementPct, periodTarget);

    const { actual: annualActualAll, hasData: hasAnyAnnualData } = computeActualForIndices(
      kpi,
      scope.type === 'annual' ? allYearIndices : ytdIndices,
      logs
    );
    const annualAchievementPct = computeAchievementPct(
      kpi,
      kpi.personalAnnualTarget,
      annualActualAll,
      hasAnyAnnualData
    );

    let annualRemainingGap = 0;
    let requiredMonthlyRunRate: number | null = null;

    if (kpi.direction === 'higher_better') {
      annualRemainingGap = Math.max(0, kpi.personalAnnualTarget - annualActualAll);
      if (kpi.aggregation === 'sum' && remainingMonthsCount > 0) {
        requiredMonthlyRunRate = annualRemainingGap / remainingMonthsCount;
      } else if (kpi.aggregation === 'average') {
        requiredMonthlyRunRate = kpi.personalAnnualTarget;
      }
    } else {
      annualRemainingGap = hasAnyAnnualData
        ? Math.max(0, annualActualAll - kpi.personalAnnualTarget)
        : 0;
      requiredMonthlyRunRate = kpi.personalAnnualTarget;
    }

    const branchSharePct =
      kpi.branchAnnualTarget > 0
        ? (kpi.personalAnnualTarget / kpi.branchAnnualTarget) * 100
        : 0;

    const branchActualContributionPct =
      kpi.branchAnnualTarget > 0 && kpi.direction === 'higher_better'
        ? (annualActualAll / kpi.branchAnnualTarget) * 100
        : 0;

    return {
      kpi,
      branchAnnualTarget: kpi.branchAnnualTarget,
      personalAnnualTarget: kpi.personalAnnualTarget,
      branchSharePct,
      periodTarget,
      periodActual,
      hasActualData,
      variance,
      achievementPct,
      weightedScore,
      maxWeight: kpi.weight,
      status,
      annualActualYtd: annualActualAll,
      annualAchievementPct,
      annualRemainingGap,
      requiredMonthlyRunRate,
      branchActualContributionPct,
    };
  });

  const activeWeightSum = rows.reduce(
    (sum, r) => (r.periodTarget > 0 ? sum + r.kpi.weight : sum),
    0
  );
  const totalWeight = kpis.reduce((sum, k) => sum + k.weight, 0);
  const totalWeightedPoints = rows.reduce((sum, r) => sum + r.weightedScore, 0);
  const normalizedScorePct =
    activeWeightSum > 0 ? (totalWeightedPoints / activeWeightSum) * 100 : 0;

  const exceedingCount = rows.filter((r) => r.status === 'exceptional').length;
  const onTrackCount = rows.filter((r) => r.status === 'on_track').length;
  const atRiskCount = rows.filter((r) => r.status === 'at_risk').length;
  const criticalCount = rows.filter((r) => r.status === 'critical').length;

  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const monthlyCompositeTrend = fiscalMonths.map((m) => {
    let monthWeightActive = 0;
    let monthPoints = 0;
    let monthHasAnyData = false;

    for (const kpi of kpis) {
      const mTarget = kpi.monthlyTargets[m.index] ?? 0;
      const mInfo = getKpiMonthActualInfo(kpi.id, m.index, logs);
      if (mInfo.hasData) monthHasAnyData = true;
      if (mTarget > 0) {
        monthWeightActive += kpi.weight;
        const ach = computeAchievementPct(kpi, mTarget, mInfo.value, mInfo.hasData);
        monthPoints += Math.min(ach / 100, 1.2) * kpi.weight;
      }
    }

    const scorePct = monthWeightActive > 0 ? (monthPoints / monthWeightActive) * 100 : 0;
    return {
      monthIndex: m.index,
      shortLabel: profile.language === 'am' ? m.shortAm : m.shortEn,
      fullLabel: profile.language === 'am' ? m.fullAm : m.fullEn,
      weightedTargetPct: 100,
      weightedActualScorePct: scorePct,
      hasData: monthHasAnyData,
    };
  });

  // Collect all configured category IDs plus any ad-hoc category IDs present on KPIs
  const orderedCatIds = Array.from(
    new Set([...categories.map((c) => c.id), ...kpis.map((k) => k.category)])
  );

  const categorySummaries = orderedCatIds
    .map((cat) => {
      const catRows = rows.filter((r) => r.kpi.category === cat);
      const weightSum = catRows.reduce((s, r) => s + r.kpi.weight, 0);
      const activeCatWeight = catRows.reduce(
        (s, r) => (r.periodTarget > 0 ? s + r.kpi.weight : s),
        0
      );
      const weightedEarned = catRows.reduce((s, r) => s + r.weightedScore, 0);
      const achievementPct =
        activeCatWeight > 0 ? (weightedEarned / activeCatWeight) * 100 : 0;
      return {
        category: cat,
        weightSum,
        weightedEarned,
        achievementPct,
        kpiCount: catRows.length,
      };
    })
    .filter((c) => c.kpiCount > 0);

  return {
    scopeLabel: getScopeLabel(scope, profile, profile.language),
    totalWeight,
    totalWeightedPoints,
    normalizedScorePct,
    overallGrade: getOverallGrade(normalizedScorePct),
    exceedingCount,
    onTrackCount,
    atRiskCount,
    criticalCount,
    rows,
    monthlyCompositeTrend,
    categorySummaries,
  };
}

// ============================================================================
// Item #1: Daily & Weekly Pace Breakdown Engine
// ============================================================================

export type DailyPaceStatus = 'met' | 'ahead' | 'on_pace' | 'behind';

export interface DailyWeeklyPaceRow {
  kpi: KpiItem;
  monthTarget: number;
  monthActual: number;
  hasData: boolean;
  achievementPct: number;
  remainingGap: number;
  baselineDailyTarget: number;
  requiredDailyTarget: number;
  requiredWeeklyTarget: number;
  actualDailyRunRate: number;
  paceStatus: DailyPaceStatus;
}

export interface DailyWeeklyPaceSummary {
  monthIndex: number;
  workingDaysPerMonth: number;
  elapsedWorkingDays: number;
  remainingWorkingDays: number;
  remainingWeeks: number;
  expectedTimePct: number;
  metOrAheadCount: number;
  behindPaceCount: number;
  rows: DailyWeeklyPaceRow[];
}

export function computeDailyWeeklyPace(
  kpis: KpiItem[],
  logs: ActualLogEntry[],
  monthIndex: number,
  workingDaysPerMonth: number,
  elapsedWorkingDays: number
): DailyWeeklyPaceSummary {
  const safeTotalDays = Math.max(1, Math.min(31, workingDaysPerMonth || 26));
  const safeElapsedDays = Math.max(0, Math.min(safeTotalDays, elapsedWorkingDays));
  const remainingWorkingDays = Math.max(0, safeTotalDays - safeElapsedDays);
  const daysPerWeek = safeTotalDays / 4.33;
  const remainingWeeks =
    remainingWorkingDays > 0 ? Math.max(0.25, remainingWorkingDays / daysPerWeek) : 0;
  const expectedTimePct = (safeElapsedDays / safeTotalDays) * 100;

  const rows: DailyWeeklyPaceRow[] = kpis.map((kpi) => {
    const monthTarget = kpi.monthlyTargets[monthIndex] ?? 0;
    const { value: monthActual, hasData } = getKpiMonthActualInfo(kpi.id, monthIndex, logs);
    const achievementPct = computeAchievementPct(kpi, monthTarget, monthActual, hasData);

    const isAvgOrLower = kpi.aggregation === 'average' || kpi.direction === 'lower_better';

    if (isAvgOrLower) {
      const remainingGap =
        kpi.direction === 'lower_better'
          ? hasData
            ? Math.max(0, monthActual - monthTarget)
            : 0
          : Math.max(0, monthTarget - monthActual);

      let paceStatus: DailyPaceStatus = 'behind';
      if (hasData && achievementPct >= 100) paceStatus = 'met';
      else if (hasData && achievementPct >= 90) paceStatus = 'on_pace';

      return {
        kpi,
        monthTarget,
        monthActual,
        hasData,
        achievementPct,
        remainingGap,
        baselineDailyTarget: monthTarget,
        requiredDailyTarget: monthTarget,
        requiredWeeklyTarget: monthTarget,
        actualDailyRunRate: hasData ? monthActual : 0,
        paceStatus,
      };
    }

    const remainingGap = Math.max(0, monthTarget - monthActual);
    const baselineDailyTarget = monthTarget / safeTotalDays;
    const requiredDailyTarget =
      remainingGap <= 0
        ? 0
        : remainingWorkingDays > 0
          ? remainingGap / remainingWorkingDays
          : remainingGap;

    const requiredWeeklyTarget =
      remainingGap <= 0
        ? 0
        : remainingWeeks >= 1
          ? remainingGap / remainingWeeks
          : remainingGap;

    const actualDailyRunRate = safeElapsedDays > 0 ? monthActual / safeElapsedDays : monthActual;

    let paceStatus: DailyPaceStatus = 'behind';
    if (monthTarget > 0 && remainingGap <= 0) {
      paceStatus = 'met';
    } else if (achievementPct >= expectedTimePct + 3) {
      paceStatus = 'ahead';
    } else if (achievementPct >= expectedTimePct - 7) {
      paceStatus = 'on_pace';
    } else {
      paceStatus = 'behind';
    }

    return {
      kpi,
      monthTarget,
      monthActual,
      hasData,
      achievementPct,
      remainingGap,
      baselineDailyTarget,
      requiredDailyTarget,
      requiredWeeklyTarget,
      actualDailyRunRate,
      paceStatus,
    };
  });

  const metOrAheadCount = rows.filter(
    (r) => r.paceStatus === 'met' || r.paceStatus === 'ahead' || r.paceStatus === 'on_pace'
  ).length;
  const behindPaceCount = rows.filter((r) => r.paceStatus === 'behind').length;

  return {
    monthIndex,
    workingDaysPerMonth: safeTotalDays,
    elapsedWorkingDays: safeElapsedDays,
    remainingWorkingDays,
    remainingWeeks,
    expectedTimePct,
    metOrAheadCount,
    behindPaceCount,
    rows,
  };
}

// ============================================================================
// Item #4: Year-over-Year (YoY) Multi-Fiscal-Year Comparison Engine
// ============================================================================

export interface YoYKpiComparisonRow {
  currentKpi: KpiItem;
  priorKpi?: KpiItem;
  currentActual: number;
  currentHasData: boolean;
  priorActual: number;
  priorHasData: boolean;
  yoyGrowthPct: number | null; // Positive means improved YoY
  currentAchPct: number;
  priorAchPct: number;
  achDeltaPts: number;
}

export interface YoYPortfolioComparison {
  currentYearLabel: string;
  priorYearLabel: string;
  currentScorePct: number;
  priorScorePct: number;
  scoreDeltaPts: number;
  matchedCount: number;
  rows: YoYKpiComparisonRow[];
}

export function computeYoYComparison(
  currentFy: FiscalYearWorkspace,
  priorFy: FiscalYearWorkspace,
  profile: EmployeeProfile,
  scope: PeriodScope,
  categories: KpiCategoryDef[] = DEFAULT_KPI_CATEGORIES
): YoYPortfolioComparison {
  // Evaluate both fiscal years over the exact same timeframe indices (using currentFy.activeMonthIndex for apples-to-apples YTD)
  const evalProfileCurrent: EmployeeProfile = {
    ...profile,
    fiscalYearLabel: currentFy.fiscalYearLabel,
    calendarType: currentFy.calendarType,
    activeMonthIndex: currentFy.activeMonthIndex,
  };
  const evalProfilePrior: EmployeeProfile = {
    ...profile,
    fiscalYearLabel: priorFy.fiscalYearLabel,
    calendarType: priorFy.calendarType,
    activeMonthIndex: currentFy.activeMonthIndex, // Apples-to-apples same-month YTD window
  };

  const currSummary = evaluatePortfolio(
    currentFy.kpis,
    currentFy.actualLogs,
    evalProfileCurrent,
    scope,
    categories
  );
  const priorSummary = evaluatePortfolio(
    priorFy.kpis,
    priorFy.actualLogs,
    evalProfilePrior,
    scope,
    categories
  );

  let matchedCount = 0;

  const rows: YoYKpiComparisonRow[] = currSummary.rows.map((currRow) => {
    const codeNorm = currRow.kpi.code.trim().toLowerCase();
    const nameNorm = currRow.kpi.name.split('(')[0].trim().toLowerCase();

    const priorRow = priorSummary.rows.find(
      (pr) =>
        pr.kpi.code.trim().toLowerCase() === codeNorm ||
        pr.kpi.name.split('(')[0].trim().toLowerCase() === nameNorm
    );

    if (priorRow) matchedCount += 1;

    const priorActual = priorRow?.periodActual ?? 0;
    const priorHasData = priorRow?.hasActualData ?? false;
    const priorAchPct = priorRow?.achievementPct ?? 0;

    let yoyGrowthPct: number | null = null;
    if (priorRow && priorHasData && currRow.hasActualData && priorActual > 0) {
      if (currRow.kpi.direction === 'higher_better') {
        yoyGrowthPct = ((currRow.periodActual - priorActual) / priorActual) * 100;
      } else {
        // For lower_better (e.g., error rate dropping from 0.8% to 0.6%), reduction is positive improvement
        yoyGrowthPct = ((priorActual - currRow.periodActual) / priorActual) * 100;
      }
    }

    return {
      currentKpi: currRow.kpi,
      priorKpi: priorRow?.kpi,
      currentActual: currRow.periodActual,
      currentHasData: currRow.hasActualData,
      priorActual,
      priorHasData,
      yoyGrowthPct,
      currentAchPct: currRow.achievementPct,
      priorAchPct,
      achDeltaPts: currRow.achievementPct - priorAchPct,
    };
  });

  return {
    currentYearLabel: currentFy.fiscalYearLabel,
    priorYearLabel: priorFy.fiscalYearLabel,
    currentScorePct: currSummary.normalizedScorePct,
    priorScorePct: priorSummary.normalizedScorePct,
    scoreDeltaPts: currSummary.normalizedScorePct - priorSummary.normalizedScorePct,
    matchedCount,
    rows,
  };
}

// ============================================================================
// Historical Cumulative Progress Trend Engine
// ============================================================================

export interface CumulativeTrendPoint {
  stepIndex: number;
  shortLabel: string;
  fullLabel: string;
  cumulativePlanned: number;
  cumulativeActual: number | null;
  paceAchievementPct: number | null;
}

export interface CumulativeTrendSeries {
  mode: 'portfolio' | 'kpi';
  unitLabel: string;
  isPercentageScale: boolean;
  isAverageKpi: boolean;
  selectedKpi?: KpiItem;
  points: CumulativeTrendPoint[];
  latestPlannedToDate: number;
  latestActualToDate: number;
  latestVariance: number;
  latestPacePct: number;
  hasAnyActualData: boolean;
}

export function computeCumulativeTrend(
  kpis: KpiItem[],
  logs: ActualLogEntry[],
  profile: EmployeeProfile,
  scope: PeriodScope,
  metricId: 'portfolio' | string
): CumulativeTrendSeries {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const selectedKpi =
    metricId !== 'portfolio' ? kpis.find((k) => k.id === metricId) : undefined;

  const calcPace = (planned: number, actual: number, kpiRef?: KpiItem): number => {
    if (kpiRef) {
      return computeAchievementPct(kpiRef, planned, actual, true);
    }
    if (planned <= 0) return actual > 0 ? 100 : 0;
    return Math.max(0, (actual / planned) * 100);
  };

  if (scope.type === 'month') {
    const mIdx = scope.monthIndex;
    const monthMeta = fiscalMonths[mIdx] || fiscalMonths[0];
    const monthLogs = logs.filter((l) => l.monthIndex === mIdx);
    const hasMonthData = selectedKpi
      ? monthLogs.some((l) => l.kpiId === selectedKpi.id)
      : monthLogs.length > 0;

    const weekDefs = [
      { maxDay: 0, shortAm: 'መነሻ', shortEn: 'Start', fullAm: 'የወሩ መነሻ', fullEn: 'Month Start', frac: 0 },
      { maxDay: 7, shortAm: 'ሳምንት 1', shortEn: 'Wk 1', fullAm: `${monthMeta.shortAm} ቀን 1–7`, fullEn: `${monthMeta.shortEn} Days 1–7`, frac: 0.25 },
      { maxDay: 15, shortAm: 'ሳምንት 2', shortEn: 'Wk 2', fullAm: `${monthMeta.shortAm} ቀን 8–15`, fullEn: `${monthMeta.shortEn} Days 8–15`, frac: 0.5 },
      { maxDay: 23, shortAm: 'ሳምንት 3', shortEn: 'Wk 3', fullAm: `${monthMeta.shortAm} ቀን 16–23`, fullEn: `${monthMeta.shortEn} Days 16–23`, frac: 0.75 },
      { maxDay: 31, shortAm: 'ወር መጨረሻ', shortEn: 'End', fullAm: `${monthMeta.fullAm} ማጠቃለያ`, fullEn: `${monthMeta.fullEn} Close`, frac: 1 },
    ];

    const getLogDay = (dateStr: string): number => {
      const parts = dateStr.split('-');
      const d = Number(parts[2]);
      return Number.isFinite(d) && d >= 1 && d <= 31 ? d : 30;
    };

    if (selectedKpi) {
      const mTarget = selectedKpi.monthlyTargets[mIdx] ?? 0;
      const isAvg = selectedKpi.aggregation === 'average';
      const kpiLogs = monthLogs.filter((l) => l.kpiId === selectedKpi.id);

      const pointsDefs = isAvg ? weekDefs.slice(1) : weekDefs;
      const points: CumulativeTrendPoint[] = pointsDefs.map((w, idx) => {
        const planned = isAvg ? mTarget : mTarget * w.frac;
        if (!hasMonthData) {
          return {
            stepIndex: idx,
            shortLabel: lang === 'am' ? w.shortAm : w.shortEn,
            fullLabel: lang === 'am' ? w.fullAm : w.fullEn,
            cumulativePlanned: planned,
            cumulativeActual: null,
            paceAchievementPct: null,
          };
        }
        if (w.maxDay === 0) {
          return {
            stepIndex: idx,
            shortLabel: lang === 'am' ? w.shortAm : w.shortEn,
            fullLabel: lang === 'am' ? w.fullAm : w.fullEn,
            cumulativePlanned: 0,
            cumulativeActual: 0,
            paceAchievementPct: 100,
          };
        }
        const uptoLogs = kpiLogs.filter((l) => getLogDay(l.date) <= w.maxDay);
        const val = isAvg
          ? uptoLogs.length > 0
            ? uptoLogs.reduce((s, l) => s + l.value, 0) / uptoLogs.length
            : kpiLogs.reduce((s, l) => s + l.value, 0) / kpiLogs.length
          : uptoLogs.reduce((s, l) => s + l.value, 0);

        return {
          stepIndex: idx,
          shortLabel: lang === 'am' ? w.shortAm : w.shortEn,
          fullLabel: lang === 'am' ? w.fullAm : w.fullEn,
          cumulativePlanned: planned,
          cumulativeActual: val,
          paceAchievementPct: calcPace(planned, val, selectedKpi),
        };
      });

      const lastActive =
        [...points].reverse().find((p) => p.cumulativeActual !== null && p.stepIndex > 0) ||
        points[points.length - 1];
      const latestPlanned = lastActive?.cumulativePlanned ?? mTarget;
      const latestActual = lastActive?.cumulativeActual ?? 0;
      const latestVar =
        selectedKpi.direction === 'higher_better'
          ? latestActual - latestPlanned
          : latestPlanned - latestActual;

      return {
        mode: 'kpi',
        unitLabel: selectedKpi.unit,
        isPercentageScale: selectedKpi.unit === 'PERCENT',
        isAverageKpi: isAvg,
        selectedKpi,
        points,
        latestPlannedToDate: latestPlanned,
        latestActualToDate: latestActual,
        latestVariance: latestVar,
        latestPacePct: hasMonthData ? calcPace(latestPlanned, latestActual, selectedKpi) : 0,
        hasAnyActualData: hasMonthData,
      };
    }

    const activeWeight = kpis.reduce(
      (s, k) => ((k.monthlyTargets[mIdx] ?? 0) > 0 ? s + k.weight : s),
      0
    );

    const points: CumulativeTrendPoint[] = weekDefs.map((w, idx) => {
      const plannedPct = w.frac * 100;
      if (!hasMonthData) {
        return {
          stepIndex: idx,
          shortLabel: lang === 'am' ? w.shortAm : w.shortEn,
          fullLabel: lang === 'am' ? w.fullAm : w.fullEn,
          cumulativePlanned: plannedPct,
          cumulativeActual: null,
          paceAchievementPct: null,
        };
      }
      if (w.maxDay === 0) {
        return {
          stepIndex: idx,
          shortLabel: lang === 'am' ? w.shortAm : w.shortEn,
          fullLabel: lang === 'am' ? w.fullAm : w.fullEn,
          cumulativePlanned: 0,
          cumulativeActual: 0,
          paceAchievementPct: 100,
        };
      }

      let earnedWeight = 0;
      for (const k of kpis) {
        const mTarget = k.monthlyTargets[mIdx] ?? 0;
        if (mTarget <= 0) continue;
        const kLogs = monthLogs.filter(
          (l) => l.kpiId === k.id && getLogDay(l.date) <= w.maxDay
        );
        if (k.aggregation === 'average') {
          const allKLogs = monthLogs.filter((l) => l.kpiId === k.id);
          const source = kLogs.length > 0 ? kLogs : allKLogs;
          if (source.length > 0) {
            const avgVal = source.reduce((s, l) => s + l.value, 0) / source.length;
            const ach = computeAchievementPct(k, mTarget, avgVal, true);
            earnedWeight += w.frac * Math.min(ach / 100, 1.2) * k.weight;
          }
        } else {
          const sumVal = kLogs.reduce((s, l) => s + l.value, 0);
          const ratio = Math.min(sumVal / mTarget, 1.2);
          earnedWeight += ratio * k.weight;
        }
      }

      const actualPct = activeWeight > 0 ? (earnedWeight / activeWeight) * 100 : 0;
      return {
        stepIndex: idx,
        shortLabel: lang === 'am' ? w.shortAm : w.shortEn,
        fullLabel: lang === 'am' ? w.fullAm : w.fullEn,
        cumulativePlanned: plannedPct,
        cumulativeActual: actualPct,
        paceAchievementPct: calcPace(plannedPct, actualPct),
      };
    });

    const lastPt = points[points.length - 1];
    const latestPlanned = lastPt.cumulativePlanned;
    const latestActual = lastPt.cumulativeActual ?? 0;

    return {
      mode: 'portfolio',
      unitLabel: '%',
      isPercentageScale: true,
      isAverageKpi: false,
      points,
      latestPlannedToDate: latestPlanned,
      latestActualToDate: latestActual,
      latestVariance: latestActual - latestPlanned,
      latestPacePct: hasMonthData ? calcPace(latestPlanned, latestActual) : 0,
      hasAnyActualData: hasMonthData,
    };
  }

  const scopeIndices = getMonthIndicesForScope(scope, profile.activeMonthIndex);

  let lastActivePos = -1;
  scopeIndices.forEach((mIdx, pos) => {
    const hasLogInMonth = selectedKpi
      ? logs.some((l) => l.kpiId === selectedKpi.id && l.monthIndex === mIdx)
      : logs.some((l) => l.monthIndex === mIdx);
    if (hasLogInMonth) {
      lastActivePos = Math.max(lastActivePos, pos);
    }
  });

  const hasAnyActualData = lastActivePos >= 0;

  if (selectedKpi) {
    const isAvg = selectedKpi.aggregation === 'average';
    const points: CumulativeTrendPoint[] = [];

    if (!isAvg) {
      points.push({
        stepIndex: 0,
        shortLabel: lang === 'am' ? 'መነሻ' : 'Start',
        fullLabel: lang === 'am' ? 'የጊዜው መነሻ (0)' : 'Period Start (0)',
        cumulativePlanned: 0,
        cumulativeActual: hasAnyActualData ? 0 : null,
        paceAchievementPct: hasAnyActualData ? 100 : null,
      });
    }

    scopeIndices.forEach((mIdx, pos) => {
      const prefix = scopeIndices.slice(0, pos + 1);
      const plannedVals = prefix.map((idx) => selectedKpi.monthlyTargets[idx] ?? 0);
      const cumPlanned = aggregateValues(plannedVals, selectedKpi.aggregation);
      const meta = fiscalMonths[mIdx] || fiscalMonths[0];

      if (!hasAnyActualData || pos > lastActivePos) {
        points.push({
          stepIndex: points.length,
          shortLabel: lang === 'am' ? meta.shortAm : meta.shortEn,
          fullLabel: lang === 'am' ? meta.fullAm : meta.fullEn,
          cumulativePlanned: cumPlanned,
          cumulativeActual: null,
          paceAchievementPct: null,
        });
      } else {
        const { actual: cumActual } = computeActualForIndices(selectedKpi, prefix, logs);
        points.push({
          stepIndex: points.length,
          shortLabel: lang === 'am' ? meta.shortAm : meta.shortEn,
          fullLabel: lang === 'am' ? meta.fullAm : meta.fullEn,
          cumulativePlanned: cumPlanned,
          cumulativeActual: cumActual,
          paceAchievementPct: calcPace(cumPlanned, cumActual, selectedKpi),
        });
      }
    });

    const latestActivePoint =
      [...points].reverse().find((p) => p.cumulativeActual !== null && (isAvg || p.stepIndex > 0)) ||
      points[points.length - 1];

    const latestPlanned = latestActivePoint?.cumulativePlanned ?? 0;
    const latestActual = latestActivePoint?.cumulativeActual ?? 0;
    const latestVariance =
      selectedKpi.direction === 'higher_better'
        ? latestActual - latestPlanned
        : latestPlanned - latestActual;

    return {
      mode: 'kpi',
      unitLabel: selectedKpi.unit,
      isPercentageScale: selectedKpi.unit === 'PERCENT',
      isAverageKpi: isAvg,
      selectedKpi,
      points,
      latestPlannedToDate: latestPlanned,
      latestActualToDate: latestActual,
      latestVariance,
      latestPacePct: hasAnyActualData ? calcPace(latestPlanned, latestActual, selectedKpi) : 0,
      hasAnyActualData,
    };
  }

  const activePortfolioWeight = kpis.reduce((sum, k) => {
    const scopeTarget = computeTargetForScope(k, scope, profile.activeMonthIndex);
    return scopeTarget > 0 ? sum + k.weight : sum;
  }, 0);

  const points: CumulativeTrendPoint[] = [
    {
      stepIndex: 0,
      shortLabel: lang === 'am' ? 'መነሻ' : 'Start',
      fullLabel: lang === 'am' ? 'የጊዜው መነሻ (0%)' : 'Period Start (0%)',
      cumulativePlanned: 0,
      cumulativeActual: hasAnyActualData ? 0 : null,
      paceAchievementPct: hasAnyActualData ? 100 : null,
    },
  ];

  scopeIndices.forEach((mIdx, pos) => {
    const prefix = scopeIndices.slice(0, pos + 1);
    const meta = fiscalMonths[mIdx] || fiscalMonths[0];
    const stepFraction = (pos + 1) / scopeIndices.length;

    let plannedWeightedSum = 0;
    let actualWeightedSum = 0;

    for (const k of kpis) {
      const fullScopeTarget = computeTargetForScope(k, scope, profile.activeMonthIndex);
      if (fullScopeTarget <= 0) continue;

      const sumOfScopeMonthlyTargets = scopeIndices.reduce(
        (s, idx) => s + (k.monthlyTargets[idx] ?? 0),
        0
      );

      if (k.aggregation === 'average') {
        plannedWeightedSum += stepFraction * k.weight;
        if (hasAnyActualData && pos <= lastActivePos) {
          const { actual: avgAct, hasData } = computeActualForIndices(k, prefix, logs);
          const prefixTarget = aggregateValues(
            prefix.map((idx) => k.monthlyTargets[idx] ?? 0),
            'average'
          );
          const ach = computeAchievementPct(k, prefixTarget, avgAct, hasData);
          actualWeightedSum += stepFraction * Math.min(ach / 100, 1.2) * k.weight;
        }
      } else {
        const prefixPlannedSum = prefix.reduce(
          (s, idx) => s + (k.monthlyTargets[idx] ?? 0),
          0
        );
        const plannedShare =
          sumOfScopeMonthlyTargets > 0
            ? prefixPlannedSum / sumOfScopeMonthlyTargets
            : stepFraction;
        plannedWeightedSum += plannedShare * k.weight;

        if (hasAnyActualData && pos <= lastActivePos) {
          const { actual: prefixActSum } = computeActualForIndices(k, prefix, logs);
          const actShare = Math.min(prefixActSum / fullScopeTarget, 1.2);
          actualWeightedSum += actShare * k.weight;
        }
      }
    }

    const cumPlannedPct =
      activePortfolioWeight > 0 ? (plannedWeightedSum / activePortfolioWeight) * 100 : 0;

    if (!hasAnyActualData || pos > lastActivePos) {
      points.push({
        stepIndex: points.length,
        shortLabel: lang === 'am' ? meta.shortAm : meta.shortEn,
        fullLabel: lang === 'am' ? meta.fullAm : meta.fullEn,
        cumulativePlanned: cumPlannedPct,
        cumulativeActual: null,
        paceAchievementPct: null,
      });
    } else {
      const cumActualPct =
        activePortfolioWeight > 0 ? (actualWeightedSum / activePortfolioWeight) * 100 : 0;
      points.push({
        stepIndex: points.length,
        shortLabel: lang === 'am' ? meta.shortAm : meta.shortEn,
        fullLabel: lang === 'am' ? meta.fullAm : meta.fullEn,
        cumulativePlanned: cumPlannedPct,
        cumulativeActual: cumActualPct,
        paceAchievementPct: calcPace(cumPlannedPct, cumActualPct),
      });
    }
  });

  const latestActivePoint =
    [...points].reverse().find((p) => p.cumulativeActual !== null && p.stepIndex > 0) ||
    points[points.length - 1];

  const latestPlanned = latestActivePoint?.cumulativePlanned ?? 0;
  const latestActual = latestActivePoint?.cumulativeActual ?? 0;

  return {
    mode: 'portfolio',
    unitLabel: '%',
    isPercentageScale: true,
    isAverageKpi: false,
    points,
    latestPlannedToDate: latestPlanned,
    latestActualToDate: latestActual,
    latestVariance: latestActual - latestPlanned,
    latestPacePct: hasAnyActualData ? calcPace(latestPlanned, latestActual) : 0,
    hasAnyActualData,
  };
}
