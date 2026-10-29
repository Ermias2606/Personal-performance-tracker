import {
  ActualLogEntry,
  AppraisalNarrative,
  EmployeeProfile,
  FiscalCalendarType,
  FiscalYearWorkspace,
  KpiCategory,
  KpiCategoryDef,
  KpiItem,
  Language,
  PeriodScope,
  ProspectItem,
  QuarterKey,
  WeeklyCheckInSettings,
} from '../types/kpi';
import {
  formatEthiopianDate,
  getEffectiveMonthWorkingConfig,
} from './ethiopianCalendar';
import {
  DEFAULT_KPI_CATEGORIES,
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  getQuarterLabel,
  QUARTER_MONTH_INDICES,
  QUARTERS,
} from './i18n';

export type PerformanceStatus = 'exceptional' | 'on_track' | 'at_risk' | 'critical' | 'no_target';

export type MomTrendDirection = 'up' | 'down' | 'flat';

export interface KpiMomTrend {
  hasComparison: boolean;
  direction: MomTrendDirection;
  currMonthIndex: number;
  prevMonthIndex: number;
  currMonthShort: string;
  prevMonthShort: string;
  currActual: number;
  prevActual: number;
  currAchvPct: number;
  prevAchvPct: number;
  achvDeltaPts: number; // Positive means performance improved vs previous month
  actualPctChange: number | null;
}

export interface PortfolioMomTrend {
  hasComparison: boolean;
  direction: MomTrendDirection;
  currMonthShort: string;
  prevMonthShort: string;
  currScorePct: number;
  prevScorePct: number;
  scoreDeltaPts: number;
}

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
  momTrend: KpiMomTrend;
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
  portfolioMomTrend: PortfolioMomTrend;
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
  const fiscalMonths = getFiscalMonths(profile.calendarType);

  // Determine the reference month for Month-over-Month (MoM) trend comparison
  let refMonthIdx = profile.activeMonthIndex;
  if (scope.type === 'month') {
    refMonthIdx = scope.monthIndex;
  } else if (scope.type === 'quarter') {
    const qIndices = QUARTER_MONTH_INDICES[scope.quarter];
    const populatedInQuarter = qIndices.filter((mIdx) =>
      logs.some((l) => l.monthIndex === mIdx)
    );
    refMonthIdx =
      populatedInQuarter.length > 0
        ? populatedInQuarter[populatedInQuarter.length - 1]
        : qIndices[qIndices.length - 1];
  }
  refMonthIdx = Math.max(0, Math.min(11, refMonthIdx));
  const prevMonthIdx = Math.max(0, refMonthIdx - 1);
  const currMonthMeta = fiscalMonths[refMonthIdx] || fiscalMonths[0];
  const prevMonthMeta = fiscalMonths[prevMonthIdx] || fiscalMonths[0];
  const currMonthShort =
    profile.language === 'am' ? currMonthMeta.shortAm : currMonthMeta.shortEn;
  const prevMonthShort =
    profile.language === 'am' ? prevMonthMeta.shortAm : prevMonthMeta.shortEn;

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

    // Month-over-Month (MoM) comparison between refMonthIdx and prevMonthIdx
    const currMTarget = kpi.monthlyTargets[refMonthIdx] ?? 0;
    const prevMTarget = kpi.monthlyTargets[prevMonthIdx] ?? 0;
    const currMInfo = getKpiMonthActualInfo(kpi.id, refMonthIdx, logs);
    const prevMInfo = getKpiMonthActualInfo(kpi.id, prevMonthIdx, logs);
    const hasMomComparison =
      refMonthIdx > 0 && currMInfo.hasData && prevMInfo.hasData;

    const currMAchvPct = computeAchievementPct(
      kpi,
      currMTarget,
      currMInfo.value,
      currMInfo.hasData
    );
    const prevMAchvPct = computeAchievementPct(
      kpi,
      prevMTarget,
      prevMInfo.value,
      prevMInfo.hasData
    );
    const achvDeltaPts = hasMomComparison ? currMAchvPct - prevMAchvPct : 0;
    const actualPctChange =
      hasMomComparison && prevMInfo.value > 0
        ? ((currMInfo.value - prevMInfo.value) / prevMInfo.value) * 100
        : null;

    const momDirection: MomTrendDirection = !hasMomComparison
      ? 'flat'
      : Math.abs(achvDeltaPts) < 0.25
        ? 'flat'
        : achvDeltaPts > 0
          ? 'up'
          : 'down';

    const momTrend: KpiMomTrend = {
      hasComparison: hasMomComparison,
      direction: momDirection,
      currMonthIndex: refMonthIdx,
      prevMonthIndex: prevMonthIdx,
      currMonthShort,
      prevMonthShort,
      currActual: currMInfo.value,
      prevActual: prevMInfo.value,
      currAchvPct: currMAchvPct,
      prevAchvPct: prevMAchvPct,
      achvDeltaPts,
      actualPctChange,
    };

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
      momTrend,
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

  const currComposite = monthlyCompositeTrend[refMonthIdx];
  const prevComposite = monthlyCompositeTrend[prevMonthIdx];
  const hasPortfolioMom =
    refMonthIdx > 0 && Boolean(currComposite?.hasData && prevComposite?.hasData);
  const portfolioDelta = hasPortfolioMom
    ? currComposite.weightedActualScorePct - prevComposite.weightedActualScorePct
    : 0;
  const portfolioMomTrend: PortfolioMomTrend = {
    hasComparison: hasPortfolioMom,
    direction: !hasPortfolioMom
      ? 'flat'
      : Math.abs(portfolioDelta) < 0.25
        ? 'flat'
        : portfolioDelta > 0
          ? 'up'
          : 'down',
    currMonthShort,
    prevMonthShort,
    currScorePct: currComposite?.weightedActualScorePct ?? 0,
    prevScorePct: prevComposite?.weightedActualScorePct ?? 0,
    scoreDeltaPts: portfolioDelta,
  };

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
    portfolioMomTrend,
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

// ============================================================================
// Weekly Check-In & Logging Consistency Engine
// ============================================================================

export interface WeeklyConsistencySummary {
  updatedKpiIds: string[];
  missingKpis: KpiItem[];
  updatedCount: number;
  totalKpis: number;
  streakWeeks: number;
  referenceDateIso: string;
  lastLoggedDateIso: string | null;
}

export function computeWeeklyConsistency(
  kpis: KpiItem[],
  logs: ActualLogEntry[],
  activeMonthIndex: number,
  _settings?: WeeklyCheckInSettings
): WeeklyConsistencySummary {
  const todayIso = new Date().toISOString().slice(0, 10);
  const sortedDates = logs
    .map((l) => l.date)
    .filter(Boolean)
    .sort();
  const lastLoggedDateIso = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  // Determine the 7-day check-in window anchored on today (or active month latest week if historical)
  const todayMs = new Date(`${todayIso}T00:00:00`).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const recentLogs = logs.filter((l) => {
    const t = new Date(`${l.date}T00:00:00`).getTime();
    if (!Number.isFinite(t)) return false;
    return todayMs - t >= -86400000 && todayMs - t <= sevenDaysMs;
  });

  // Fallback: if viewing a historical fiscal year where no logs are within 7 days of system clock,
  // inspect logs in activeMonthIndex from days 22..31 as the latest active week
  const effectiveWeekLogs =
    recentLogs.length > 0
      ? recentLogs
      : logs.filter((l) => {
          if (l.monthIndex !== activeMonthIndex) return false;
          const day = Number(l.date.split('-')[2]) || 1;
          return day >= 22;
        });

  const updatedSet = new Set(effectiveWeekLogs.map((l) => l.kpiId));
  const missingKpis = kpis.filter((k) => !updatedSet.has(k.id));

  // Compute consecutive weekly logging streak across distinct calendar weeks present in logs
  const weekBuckets = new Set<number>();
  for (const log of logs) {
    const ms = new Date(`${log.date}T00:00:00`).getTime();
    if (Number.isFinite(ms)) {
      weekBuckets.add(Math.floor(ms / sevenDaysMs));
    }
  }
  const sortedBuckets = Array.from(weekBuckets).sort((a, b) => b - a);
  let streakWeeks = 0;
  if (sortedBuckets.length > 0) {
    streakWeeks = 1;
    for (let i = 1; i < sortedBuckets.length; i++) {
      // Allow up to 4-week monthly cadence or consecutive weekly buckets
      if (sortedBuckets[i - 1] - sortedBuckets[i] <= 2) {
        streakWeeks += 1;
      } else {
        break;
      }
    }
  }

  return {
    updatedKpiIds: Array.from(updatedSet),
    missingKpis,
    updatedCount: updatedSet.size,
    totalKpis: kpis.length,
    streakWeeks,
    referenceDateIso: todayIso,
    lastLoggedDateIso,
  };
}

// ============================================================================
// Deterministic Appraisal Self-Assessment Draft Generator (100% Offline)
// ============================================================================

export function generateDeterministicAppraisalDraft(
  summary: PortfolioSummary,
  prospects: ProspectItem[],
  lang: Language
): AppraisalNarrative {
  const strong = [...summary.rows]
    .filter((r) => r.hasActualData && r.achievementPct >= 95)
    .sort((a, b) => b.achievementPct - a.achievementPct);
  const lagging = [...summary.rows]
    .filter((r) => r.periodTarget > 0 && r.achievementPct < 90)
    .sort((a, b) => a.achievementPct - b.achievementPct);

  const activeProspects = prospects.filter(
    (p) => p.stage !== 'won' && p.stage !== 'lost'
  );

  if (lang === 'am') {
    const keyAchievements =
      strong.length > 0
        ? strong
            .map(
              (r) =>
                `• ${r.kpi.name}፦ ከተያዘው ${formatKpiValue(r.periodTarget, r.kpi.unit, true)} እቅድ ውስጥ ${formatKpiValue(r.periodActual, r.kpi.unit, true)} (${r.achievementPct.toFixed(1)}%) በማከናወን ${r.weightedScore.toFixed(1)} የክብደት ነጥብ ተመዝግቧል።`
            )
            .join('\n')
        : `• በ${summary.scopeLabel} አጠቃላይ ${summary.normalizedScorePct.toFixed(1)}% ክብደት ያለው ውጤት ተመዝግቧል።`;

    const varianceExplanations =
      lagging.length > 0
        ? lagging
            .map(
              (r) =>
                `• ${r.kpi.name} (${r.achievementPct.toFixed(1)}%)፦ የ${formatKpiValue(Math.abs(r.variance), r.kpi.unit, true)} ልዩነት የታየ ሲሆን፣ በቀሪ የስራ ቀናት በታለመ የደንበኛ ክትትል ለማካካስ እቅድ ተይዟል።`
            )
            .join('\n')
        : '• ሁሉም ዋና ዋና የKPI መለኪያዎች ከ90% በላይ በጥሩ የአፈጻጸም ምህዋር ላይ ይገኛሉ።';

    const nextPeriodCommitments = [
      lagging[0] && lagging[0].requiredMonthlyRunRate
        ? `• ለ${lagging[0].kpi.code} ዓመታዊ ግብ ስኬት በየወሩ በአማካይ ${formatKpiValue(lagging[0].requiredMonthlyRunRate, lagging[0].kpi.unit, true)} የማከናወን ዕለታዊ ክትትል ማድረግ።`
        : '• በሁሉም ከፍተኛ ክብደት ባላቸው የፋይናንስ እና የደንበኛ መለኪያዎች ከ100% በላይ አፈጻጸምን ማስቀጠል።',
      activeProspects.length > 0
        ? `• በፓይፕላይን ውስጥ የተመዘገቡ ${activeProspects.length} ተስፋ ሰጪ ደንበኞችን (Prospects) ወደ ተጨባጭ ክንውን መቀየር።`
        : '• በየሳምንቱ አርብ/ቅዳሜ ወጥ የሆነ የKPI ክንውን ግምገማ ማካሄድ።',
    ].join('\n');

    return {
      keyAchievements,
      varianceExplanations,
      nextPeriodCommitments,
      supervisorComments: '',
      updatedAt: new Date().toISOString(),
    };
  }

  const keyAchievements =
    strong.length > 0
      ? strong
          .map(
            (r) =>
              `• ${r.kpi.name}: Delivered ${formatKpiValue(r.periodActual, r.kpi.unit, true)} against ${formatKpiValue(r.periodTarget, r.kpi.unit, true)} target (${r.achievementPct.toFixed(1)}%), contributing ${r.weightedScore.toFixed(1)} weighted points.`
          )
          .join('\n')
      : `• Achieved an overall weighted KPI score of ${summary.normalizedScorePct.toFixed(1)}% (${summary.overallGrade.labelEn}) for ${summary.scopeLabel}.`;

  const varianceExplanations =
    lagging.length > 0
      ? lagging
          .map(
            (r) =>
              `• ${r.kpi.name} (${r.achievementPct.toFixed(1)}%): Variance of ${formatKpiValue(Math.abs(r.variance), r.kpi.unit, true)} due to timing of client settlements; targeted follow-ups are underway.`
          )
          .join('\n')
      : '• All active KPIs are tracking at ≥90% of target with no material negative variances.';

  const nextPeriodCommitments = [
    lagging[0] && lagging[0].requiredMonthlyRunRate
      ? `• Maintain a monthly run-rate of ${formatKpiValue(lagging[0].requiredMonthlyRunRate, lagging[0].kpi.unit, true)}/mo on ${lagging[0].kpi.code} to close the remaining annual gap.`
      : '• Sustain ≥100% execution pace across high-weight deposit, FCY, and digital activation indicators.',
    activeProspects.length > 0
      ? `• Convert ${activeProspects.length} active pipeline prospects currently tracked in the follow-up queue.`
      : '• Complete weekly Friday/Saturday KPI check-ins to monitor daily floor run-rates.',
  ].join('\n');

  return {
    keyAchievements,
    varianceExplanations,
    nextPeriodCommitments,
    supervisorComments: '',
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// Auto Up-To-Date (As-Of Date) Pro-Rated Plan & Full Annual Progress Engine
// ============================================================================

export interface PeriodCellBreakdown {
  plan: number;
  actual: number;
  hasData: boolean;
  achvPct: number;
}

export interface UpToDateAnnualKpiRow {
  kpi: KpiItem;
  upToDatePlan: number;
  upToDateActual: number;
  hasUpToDateData: boolean;
  upToDateVariance: number;
  upToDateAchvPct: number;
  upToDatePoints: number;
  upToDateStatus: PerformanceStatus;
  annualPlan: number;
  annualActual: number;
  hasAnnualData: boolean;
  annualCompletionPct: number;
  annualPointsEarnedSoFar: number;
  annualScheduleDeltaPct: number;
  annualRemainingGap: number;
  pipelineWeightedValue: number;
  projectedYearEndActual: number;
  projectedAnnualAchvPct: number;
  projectedPoints: number;
  monthlyBreakdown: (PeriodCellBreakdown & { monthIndex: number })[];
  quarterlyBreakdown: Record<QuarterKey, PeriodCellBreakdown>;
}

export interface CategoryDualBreakdown {
  category: KpiCategory;
  kpiCount: number;
  weightSum: number;
  upToDateEarnedPoints: number;
  upToDateAchvPct: number;
  annualEarnedPoints: number;
  annualCompletionPct: number;
  projectedEarnedPoints: number;
}

export interface UpToDateAnnualReport {
  asOfDateIso: string;
  asOfMonthIndex: number;
  asOfMonthLabelAm: string;
  asOfMonthLabelEn: string;
  elapsedWorkingDaysInMonth: number;
  netWorkingDaysInMonth: number;
  holidayDeductedCount: number;
  monthElapsedPct: number;
  fiscalYearElapsedPct: number;
  totalWeight: number;
  upToDateWeightedPoints: number;
  upToDateScorePct: number;
  upToDateGrade: PortfolioSummary['overallGrade'];
  annualCompletionScorePct: number;
  annualWeightedPointsSoFar: number;
  annualScheduleDeltaPts: number;
  projectedYearEndScorePct: number;
  projectedYearEndPoints: number;
  projectedYearEndGrade: PortfolioSummary['overallGrade'];
  exceedingUpToDateCount: number;
  attentionUpToDateCount: number;
  rows: UpToDateAnnualKpiRow[];
  categoryBreakdowns: CategoryDualBreakdown[];
}

export function mapGregorianMonthToFiscalIndex(
  gregorianMonth1Based: number,
  calendarType: FiscalCalendarType
): number {
  const gm = Math.max(1, Math.min(12, gregorianMonth1Based));
  if (calendarType === 'july_june') {
    return gm >= 7 ? gm - 7 : gm + 5;
  }
  return gm - 1;
}

function countMonSatDaysInRange(year: number, month1Based: number, endDayInclusive: number): number {
  const daysInMonth = new Date(year, month1Based, 0).getDate();
  const limit = Math.max(0, Math.min(daysInMonth, endDayInclusive));
  let count = 0;
  for (let d = 1; d <= limit; d++) {
    const dow = new Date(year, month1Based - 1, d).getDay();
    if (dow !== 0) count += 1; // Monday (1) .. Saturday (6)
  }
  return count;
}

export function computeUpToDateAndAnnualReport(
  fy: FiscalYearWorkspace,
  profile: EmployeeProfile,
  categories: KpiCategoryDef[] = DEFAULT_KPI_CATEGORIES,
  asOfDateIsoInput?: string
): UpToDateAnnualReport {
  const todayIso = new Date().toISOString().slice(0, 10);
  const safeIso =
    asOfDateIsoInput && /^\d{4}-\d{2}-\d{2}$/.test(asOfDateIsoInput)
      ? asOfDateIsoInput
      : todayIso;

  const [rawGy, rawGm, rawGd] = safeIso.split('-').map(Number);
  const gy = Number.isFinite(rawGy) ? rawGy : new Date().getFullYear();
  const gm = Number.isFinite(rawGm) && rawGm >= 1 && rawGm <= 12 ? rawGm : 10;
  const daysInGregMonth = new Date(gy, gm, 0).getDate();
  const gd = Number.isFinite(rawGd) ? Math.max(1, Math.min(daysInGregMonth, rawGd)) : 15;

  const calendarMonthIdx = mapGregorianMonthToFiscalIndex(gm, fy.calendarType);
  // Check whether logs exist around the calendar date or if this is an archived historical year
  const asOfMonthIndex = Math.max(0, Math.min(11, calendarMonthIdx));
  const fiscalMonths = getFiscalMonths(fy.calendarType);
  const monthMeta = fiscalMonths[asOfMonthIndex] || fiscalMonths[0];

  const monthConfig = getEffectiveMonthWorkingConfig(fy, asOfMonthIndex);
  const totalMonSatInCalendarMonth = countMonSatDaysInRange(gy, gm, daysInGregMonth);
  const hasExplicitMonthOverride = Boolean(fy.monthlyWorkingConfigs?.[asOfMonthIndex]);
  const baseWorkingDays = hasExplicitMonthOverride
    ? monthConfig.baseWorkingDays
    : totalMonSatInCalendarMonth || fy.workingDaysPerMonth || 26;

  const holidaysInMonth = monthConfig.holidays;
  const netWorkingDaysInMonth = Math.max(1, baseWorkingDays - holidaysInMonth.length);

  // Elapsed working days auto-calculated up to `gd` (deducting holidays occurring on or before `gd`)
  const rawMonSatElapsed = countMonSatDaysInRange(gy, gm, gd);
  const holidaysElapsed = holidaysInMonth.filter((h) => {
    const hParts = h.date.split('-').map(Number);
    if (hParts[1] === gm) {
      return (hParts[2] || 1) <= gd;
    }
    return true;
  }).length;

  const scaleFactor =
    totalMonSatInCalendarMonth > 0 ? baseWorkingDays / totalMonSatInCalendarMonth : 1;
  const computedElapsedWorkingDays = Math.max(
    0,
    Math.min(
      netWorkingDaysInMonth,
      Math.round(rawMonSatElapsed * scaleFactor) - holidaysElapsed
    )
  );

  const monthElapsedFraction =
    netWorkingDaysInMonth > 0 ? computedElapsedWorkingDays / netWorkingDaysInMonth : 0;
  const monthElapsedPct = monthElapsedFraction * 100;
  const fiscalYearElapsedFraction = Math.max(
    0.01,
    Math.min(1, (asOfMonthIndex + monthElapsedFraction) / 12)
  );
  const fiscalYearElapsedPct = fiscalYearElapsedFraction * 100;

  const openProspects = (fy.prospects || []).filter(
    (p) => p.stage !== 'won' && p.stage !== 'lost'
  );

  const rows: UpToDateAnnualKpiRow[] = fy.kpis.map((kpi) => {
    // 1. 12-Month & Quarterly breakdowns across the entire fiscal year
    const monthlyBreakdown = Array.from({ length: 12 }, (_, mIdx) => {
      const mPlan = kpi.monthlyTargets[mIdx] ?? 0;
      const mInfo = getKpiMonthActualInfo(kpi.id, mIdx, fy.actualLogs);
      const mAchv = computeAchievementPct(kpi, mPlan, mInfo.value, mInfo.hasData);
      return {
        monthIndex: mIdx,
        plan: mPlan,
        actual: mInfo.value,
        hasData: mInfo.hasData,
        achvPct: mAchv,
      };
    });

    const quarterlyBreakdown = QUARTERS.reduce(
      (acc, q) => {
        const qIndices = QUARTER_MONTH_INDICES[q];
        const qPlan = kpi.quarterlyTargets[q] ?? 0;
        const { actual: qActual, hasData: qHasData } = computeActualForIndices(
          kpi,
          qIndices,
          fy.actualLogs
        );
        acc[q] = {
          plan: qPlan,
          actual: qActual,
          hasData: qHasData,
          achvPct: computeAchievementPct(kpi, qPlan, qActual, qHasData),
        };
        return acc;
      },
      {} as Record<QuarterKey, PeriodCellBreakdown>
    );

    // 2. Pro-Rated Up-To-Date Plan & Actual up to `asOfDateIso`
    let upToDatePlan = 0;
    let upToDateActual = 0;
    let hasUpToDateData = false;

    const priorIndices = Array.from({ length: asOfMonthIndex }, (_, i) => i);
    const currentMonthTarget = kpi.monthlyTargets[asOfMonthIndex] ?? 0;

    // Logs in current month filtered up to `gd` (if year matches, filter by ISO <= safeIso; if archived year, filter by day <= gd)
    const currentMonthLogsAll = fy.actualLogs.filter(
      (l) => l.kpiId === kpi.id && l.monthIndex === asOfMonthIndex
    );
    const currentMonthFilteredLogs = currentMonthLogsAll.filter((l) => {
      if (l.isDirectOverride) return false;
      const [ly, lm, ld] = l.date.split('-').map(Number);
      if (ly === gy && lm === gm) {
        return l.date <= safeIso;
      }
      if (lm === gm && Number.isFinite(ld)) {
        return ld <= gd;
      }
      return l.date <= safeIso || ly < gy;
    });
    const currentMonthOverrides = currentMonthLogsAll.filter((l) => l.isDirectOverride);

    if (kpi.aggregation === 'average') {
      const activeIndices = [...priorIndices, asOfMonthIndex];
      const targetVals = activeIndices
        .map((idx) => kpi.monthlyTargets[idx] ?? 0)
        .filter((v) => v > 0);
      upToDatePlan =
        targetVals.length > 0
          ? targetVals.reduce((a, b) => a + b, 0) / targetVals.length
          : currentMonthTarget;

      const populatedVals: number[] = [];
      for (const idx of priorIndices) {
        const info = getKpiMonthActualInfo(kpi.id, idx, fy.actualLogs);
        if (info.hasData) populatedVals.push(info.value);
      }
      if (currentMonthFilteredLogs.length > 0 || currentMonthOverrides.length > 0) {
        const currVal =
          currentMonthFilteredLogs.reduce((s, l) => s + l.value, 0) +
          currentMonthOverrides.reduce((s, l) => s + l.value, 0);
        populatedVals.push(currVal);
      }
      if (populatedVals.length > 0) {
        hasUpToDateData = true;
        upToDateActual =
          populatedVals.reduce((a, b) => a + b, 0) / populatedVals.length;
      }
    } else {
      const priorPlanSum = priorIndices.reduce(
        (s, idx) => s + (kpi.monthlyTargets[idx] ?? 0),
        0
      );
      upToDatePlan = priorPlanSum + currentMonthTarget * monthElapsedFraction;

      let priorActualSum = 0;
      for (const idx of priorIndices) {
        const info = getKpiMonthActualInfo(kpi.id, idx, fy.actualLogs);
        if (info.hasData) {
          hasUpToDateData = true;
          priorActualSum += info.value;
        }
      }

      let currMonthActualToDate = currentMonthFilteredLogs.reduce(
        (s, l) => s + (Number(l.value) || 0),
        0
      );
      if (currentMonthOverrides.length > 0) {
        const overrideSum = currentMonthOverrides.reduce(
          (s, l) => s + (Number(l.value) || 0),
          0
        );
        // If user entered a direct monthly total override without dated daily logs, pro-rate or include if past month-end
        currMonthActualToDate +=
          currentMonthFilteredLogs.length > 0
            ? overrideSum
            : overrideSum * (gd >= daysInGregMonth ? 1 : monthElapsedFraction);
      }

      if (currentMonthFilteredLogs.length > 0 || currentMonthOverrides.length > 0) {
        hasUpToDateData = true;
      }
      upToDateActual = priorActualSum + currMonthActualToDate;
    }

    const upToDateVariance =
      kpi.direction === 'higher_better'
        ? upToDateActual - upToDatePlan
        : hasUpToDateData
          ? upToDatePlan - upToDateActual
          : 0;
    const upToDateAchvPct = computeAchievementPct(
      kpi,
      upToDatePlan,
      upToDateActual,
      hasUpToDateData
    );
    const upToDatePoints = Math.min(upToDateAchvPct / 100, 1.2) * kpi.weight;
    const upToDateStatus = classifyStatus(upToDateAchvPct, upToDatePlan);

    // 3. Full Annual Progress & Year-End Landing Forecast
    const annualPlan = kpi.personalAnnualTarget;
    const allYearIndices = Array.from({ length: 12 }, (_, i) => i);
    const { actual: fullLoggedAnnualActual, hasData: hasAnnualData } =
      computeActualForIndices(kpi, allYearIndices, fy.actualLogs);

    // Use cumulative actual up to `asOfDateIso` when inspecting an earlier cutoff date, otherwise full logged YTD
    const annualActual =
      safeIso < todayIso && kpi.aggregation === 'sum'
        ? upToDateActual
        : fullLoggedAnnualActual;

    const annualCompletionPct =
      kpi.aggregation === 'sum' && kpi.direction === 'higher_better'
        ? annualPlan > 0
          ? Math.max(0, (annualActual / annualPlan) * 100)
          : 0
        : computeAchievementPct(kpi, annualPlan, annualActual, hasAnnualData);

    const annualPointsEarnedSoFar =
      Math.min(annualCompletionPct / 100, 1.2) * kpi.weight;

    const annualScheduleDeltaPct =
      kpi.aggregation === 'sum' && kpi.direction === 'higher_better'
        ? annualCompletionPct - fiscalYearElapsedPct
        : annualCompletionPct - 100;

    const annualRemainingGap =
      kpi.aggregation === 'sum' && kpi.direction === 'higher_better'
        ? Math.max(0, annualPlan - annualActual)
        : 0;

    const pipelineWeightedValue = openProspects
      .filter((p) => p.kpiId === kpi.id)
      .reduce((s, p) => s + (p.expectedValue * p.probabilityPct) / 100, 0);

    let projectedYearEndActual = annualActual;
    if (kpi.aggregation === 'sum') {
      const runRateProjected =
        fiscalYearElapsedFraction > 0
          ? upToDateActual / fiscalYearElapsedFraction
          : annualActual;
      // Blend linear velocity with committed weighted pipeline floor
      projectedYearEndActual = Math.max(
        runRateProjected,
        annualActual + pipelineWeightedValue
      );
    } else {
      projectedYearEndActual = hasUpToDateData ? upToDateActual : annualActual;
    }

    const projectedAnnualAchvPct = computeAchievementPct(
      kpi,
      annualPlan,
      projectedYearEndActual,
      hasUpToDateData || hasAnnualData
    );
    const projectedPoints =
      Math.min(projectedAnnualAchvPct / 100, 1.2) * kpi.weight;

    return {
      kpi,
      upToDatePlan,
      upToDateActual,
      hasUpToDateData,
      upToDateVariance,
      upToDateAchvPct,
      upToDatePoints,
      upToDateStatus,
      annualPlan,
      annualActual,
      hasAnnualData,
      annualCompletionPct,
      annualPointsEarnedSoFar,
      annualScheduleDeltaPct,
      annualRemainingGap,
      pipelineWeightedValue,
      projectedYearEndActual,
      projectedAnnualAchvPct,
      projectedPoints,
      monthlyBreakdown,
      quarterlyBreakdown,
    };
  });

  const totalWeight = fy.kpis.reduce((s, k) => s + k.weight, 0);
  const activeUtdWeight = rows.reduce(
    (s, r) => (r.upToDatePlan > 0 ? s + r.kpi.weight : s),
    0
  );
  const activeAnnualWeight = rows.reduce(
    (s, r) => (r.annualPlan > 0 ? s + r.kpi.weight : s),
    0
  );

  const upToDateWeightedPoints = rows.reduce((s, r) => s + r.upToDatePoints, 0);
  const upToDateScorePct =
    activeUtdWeight > 0 ? (upToDateWeightedPoints / activeUtdWeight) * 100 : 0;

  const annualWeightedPointsSoFar = rows.reduce(
    (s, r) => s + r.annualPointsEarnedSoFar,
    0
  );
  const annualCompletionScorePct =
    activeAnnualWeight > 0
      ? (annualWeightedPointsSoFar / activeAnnualWeight) * 100
      : 0;

  const projectedYearEndPoints = rows.reduce((s, r) => s + r.projectedPoints, 0);
  const projectedYearEndScorePct =
    activeAnnualWeight > 0
      ? (projectedYearEndPoints / activeAnnualWeight) * 100
      : 0;

  const exceedingUpToDateCount = rows.filter(
    (r) => r.upToDateStatus === 'exceptional'
  ).length;
  const attentionUpToDateCount = rows.filter(
    (r) => r.upToDateStatus === 'at_risk' || r.upToDateStatus === 'critical'
  ).length;

  const orderedCatIds = Array.from(
    new Set([...categories.map((c) => c.id), ...fy.kpis.map((k) => k.category)])
  );

  const categoryBreakdowns: CategoryDualBreakdown[] = orderedCatIds
    .map((catId) => {
      const catRows = rows.filter((r) => r.kpi.category === catId);
      const weightSum = catRows.reduce((s, r) => s + r.kpi.weight, 0);
      const upToDateEarnedPoints = catRows.reduce((s, r) => s + r.upToDatePoints, 0);
      const annualEarnedPoints = catRows.reduce(
        (s, r) => s + r.annualPointsEarnedSoFar,
        0
      );
      const projectedEarnedPoints = catRows.reduce(
        (s, r) => s + r.projectedPoints,
        0
      );
      return {
        category: catId,
        kpiCount: catRows.length,
        weightSum,
        upToDateEarnedPoints,
        upToDateAchvPct: weightSum > 0 ? (upToDateEarnedPoints / weightSum) * 100 : 0,
        annualEarnedPoints,
        annualCompletionPct: weightSum > 0 ? (annualEarnedPoints / weightSum) * 100 : 0,
        projectedEarnedPoints,
      };
    })
    .filter((c) => c.kpiCount > 0);

  return {
    asOfDateIso: safeIso,
    asOfMonthIndex,
    asOfMonthLabelAm: monthMeta.fullAm,
    asOfMonthLabelEn: monthMeta.fullEn,
    elapsedWorkingDaysInMonth: computedElapsedWorkingDays,
    netWorkingDaysInMonth,
    holidayDeductedCount: holidaysInMonth.length,
    monthElapsedPct,
    fiscalYearElapsedPct,
    totalWeight,
    upToDateWeightedPoints,
    upToDateScorePct,
    upToDateGrade: getOverallGrade(upToDateScorePct),
    annualCompletionScorePct,
    annualWeightedPointsSoFar,
    annualScheduleDeltaPts: annualCompletionScorePct - fiscalYearElapsedPct,
    projectedYearEndScorePct,
    projectedYearEndPoints,
    projectedYearEndGrade: getOverallGrade(projectedYearEndScorePct),
    exceedingUpToDateCount,
    attentionUpToDateCount,
    rows,
    categoryBreakdowns,
  };
}

export function buildFormattedProgressSummaryText(
  report: UpToDateAnnualReport,
  profile: EmployeeProfile,
  categories: KpiCategoryDef[],
  lang: Language
): string {
  const ethDate = formatEthiopianDate(report.asOfDateIso, lang);
  if (lang === 'am') {
    const lines = [
      `የKPI አፈጻጸም ወቅታዊ እና ዓመታዊ ሪፖርት — ${profile.employeeName}`,
      `${profile.branchName} · የበጀት ዓመት ${profile.fiscalYearLabel}`,
      `እስከ ${report.asOfDateIso} (${ethDate}) · የዓመቱ ${report.fiscalYearElapsedPct.toFixed(1)}% የስራ ጊዜ አልፏል`,
      `----------------------------------------`,
      `• ወቅታዊ (Up-To-Date) አፈጻጸም፦ ${report.upToDateScorePct.toFixed(1)}% (ደረጃ ${report.upToDateGrade.code} — ${report.upToDateWeightedPoints.toFixed(1)}/${report.totalWeight} ነጥብ)`,
      `• ዓመታዊ (Annual) አጠቃላይ ክንውን፦ ${report.annualCompletionScorePct.toFixed(1)}% (${report.annualScheduleDeltaPts >= 0 ? '+' : ''}${report.annualScheduleDeltaPts.toFixed(1)}% ከዓመታዊ የጊዜ ሂደት አንጻር)`,
      `• የዓመት መጨረሻ ትንበያ (Forecast)፦ ${report.projectedYearEndScorePct.toFixed(1)}% (ደረጃ ${report.projectedYearEndGrade.code})`,
      `----------------------------------------`,
      ...report.rows.map(
        (r) =>
          `• ${r.kpi.code} ${r.kpi.name} (${getCategoryLabel(r.kpi.category, 'am', categories)})፦ ወቅታዊ ${formatKpiValue(r.upToDateActual, r.kpi.unit, true)} / ${formatKpiValue(r.upToDatePlan, r.kpi.unit, true)} (${r.upToDateAchvPct.toFixed(1)}%) | ዓመታዊ ${r.annualCompletionPct.toFixed(1)}%`
      ),
    ];
    return lines.join('\n');
  }

  const lines = [
    `KPI Up-To-Date & Annual Progress Brief — ${profile.employeeName}`,
    `${profile.branchName} · FY ${profile.fiscalYearLabel}`,
    `As of ${report.asOfDateIso} (${ethDate}) · ${report.fiscalYearElapsedPct.toFixed(1)}% of Fiscal Year Elapsed`,
    `----------------------------------------`,
    `• Up-To-Date Weighted Score: ${report.upToDateScorePct.toFixed(1)}% (Grade ${report.upToDateGrade.code} — ${report.upToDateWeightedPoints.toFixed(1)}/${report.totalWeight} pts)`,
    `• Full Annual Completion: ${report.annualCompletionScorePct.toFixed(1)}% (${report.annualScheduleDeltaPts >= 0 ? '+' : ''}${report.annualScheduleDeltaPts.toFixed(1)} pts vs. elapsed year clock)`,
    `• Year-End Landing Forecast: ${report.projectedYearEndScorePct.toFixed(1)}% (Projected Grade ${report.projectedYearEndGrade.code})`,
    `----------------------------------------`,
    ...report.rows.map(
      (r) =>
        `• ${r.kpi.code} ${r.kpi.name} (${getCategoryLabel(r.kpi.category, 'en', categories)}): UTD ${formatKpiValue(r.upToDateActual, r.kpi.unit, true)} / ${formatKpiValue(r.upToDatePlan, r.kpi.unit, true)} (${r.upToDateAchvPct.toFixed(1)}%) | Annual ${r.annualCompletionPct.toFixed(1)}%`
    ),
  ];
  return lines.join('\n');
}
