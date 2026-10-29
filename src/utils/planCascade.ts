import {
  FiscalYearWorkspace,
  KpiItem,
  KpiUnit,
  Language,
  PlanDistributionStrategy,
  QuarterKey,
} from '../types/kpi';
import { getKpiMonthActualInfo } from './analytics';
import { getEffectiveMonthWorkingConfig } from './ethiopianCalendar';
import { QUARTER_MONTH_INDICES, QUARTERS } from './i18n';

export function roundForKpiUnit(value: number, unit: KpiUnit): number {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
  if (unit === 'COUNT') {
    return Math.round(safe);
  }
  return Math.round(safe * 100) / 100;
}

export function getDistributionStrategyLabel(
  strategy: PlanDistributionStrategy,
  lang: Language
): string {
  switch (strategy) {
    case 'working_days':
      return lang === 'am'
        ? 'በስራ ቀናት ብዛት (ዓ.ም Net Days)'
        : 'Working-Day Prorated (ዓ.ም)';
    case 'ramp_up':
      return lang === 'am'
        ? 'እያደገ የሚሄድ (20/25/25/30%)'
        : 'Progressive Ramp-Up (20/25/25/30%)';
    case 'front_loaded':
      return lang === 'am'
        ? 'በመጀመሪያ ሩብ ዓመት ከፍ ያለ (30/25/25/20%)'
        : 'Front-Loaded (30/25/25/20%)';
    case 'prior_year':
      return lang === 'am'
        ? 'የባለፈው ዓመት ወቅታዊ አካሄድ'
        : 'Prior-Year Seasonality';
    case 'equal':
    default:
      return lang === 'am'
        ? 'እኩል ክፍፍል (Equal 25/25/25/25%)'
        : 'Equal Split (25/25/25/25%)';
  }
}

export function computeMonthlyWeightsForStrategy(
  strategy: PlanDistributionStrategy,
  kpi: KpiItem,
  activeFy?: FiscalYearWorkspace | null,
  priorFy?: FiscalYearWorkspace | null
): number[] {
  if (strategy === 'working_days' && activeFy) {
    return Array.from({ length: 12 }, (_, mIdx) =>
      Math.max(1, getEffectiveMonthWorkingConfig(activeFy, mIdx).netWorkingDays)
    );
  }

  if (strategy === 'ramp_up') {
    // Q1 = 20%, Q2 = 25%, Q3 = 25%, Q4 = 30%
    return [
      20 / 3, 20 / 3, 20 / 3,
      25 / 3, 25 / 3, 25 / 3,
      25 / 3, 25 / 3, 25 / 3,
      30 / 3, 30 / 3, 30 / 3,
    ];
  }

  if (strategy === 'front_loaded') {
    // Q1 = 30%, Q2 = 25%, Q3 = 25%, Q4 = 20%
    return [
      30 / 3, 30 / 3, 30 / 3,
      25 / 3, 25 / 3, 25 / 3,
      25 / 3, 25 / 3, 25 / 3,
      20 / 3, 20 / 3, 20 / 3,
    ];
  }

  if (strategy === 'prior_year' && priorFy) {
    const match = priorFy.kpis.find(
      (pk) =>
        pk.code.trim().toLowerCase() === kpi.code.trim().toLowerCase() ||
        pk.name.trim().toLowerCase() === kpi.name.trim().toLowerCase()
    );
    if (match) {
      const actualVals = Array.from({ length: 12 }, (_, mIdx) =>
        Math.max(0, getKpiMonthActualInfo(match.id, mIdx, priorFy.actualLogs).value)
      );
      const actualMonthsPopulated = actualVals.filter((v) => v > 0).length;
      const actualSum = actualVals.reduce((a, b) => a + b, 0);
      if (actualMonthsPopulated >= 4 && actualSum > 0) {
        return actualVals.map((v) => (v > 0 ? v : actualSum / 24));
      }
      const planVals = match.monthlyTargets.map((m) => Math.max(0, m || 0));
      const planSum = planVals.reduce((a, b) => a + b, 0);
      if (planSum > 0) {
        return planVals.map((v) => (v > 0 ? v : planSum / 24));
      }
    }
  }

  return Array(12).fill(1);
}

/**
 * Distributes `totalAmount` across `indices` proportionally to `weights` using
 * cumulative rounding so the allocated numbers sum to `totalAmount` with zero drift.
 */
function allocateProportionally(
  totalAmount: number,
  indices: number[],
  weights: number[],
  unit: KpiUnit
): Record<number, number> {
  const result: Record<number, number> = {};
  if (indices.length === 0) return result;

  const cleanTotal = roundForKpiUnit(totalAmount, unit);
  const weightSum = indices.reduce((s, idx) => s + Math.max(0.0001, weights[idx] ?? 1), 0);

  let cumWeight = 0;
  let prevRoundedCum = 0;

  indices.forEach((mIdx, pos) => {
    cumWeight += Math.max(0.0001, weights[mIdx] ?? 1);
    const exactCum =
      pos === indices.length - 1 ? cleanTotal : (cleanTotal * cumWeight) / weightSum;
    const roundedCum = roundForKpiUnit(exactCum, unit);
    const slice = Math.max(0, Math.round((roundedCum - prevRoundedCum) * 100) / 100);
    result[mIdx] = unit === 'COUNT' ? Math.round(slice) : slice;
    prevRoundedCum = roundedCum;
  });

  return result;
}

export function rollupMonthsToQuartersAndAnnualForKpi(kpi: KpiItem): KpiItem {
  const isAvg = kpi.aggregation === 'average';
  const safeMonths = Array.from({ length: 12 }, (_, i) => Math.max(0, Number(kpi.monthlyTargets[i]) || 0));
  const nextQuarters: Record<QuarterKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

  for (const q of QUARTERS) {
    const qIndices = QUARTER_MONTH_INDICES[q];
    const sum = qIndices.reduce((s, idx) => s + safeMonths[idx], 0);
    nextQuarters[q] = isAvg
      ? Math.round((sum / 3) * 100) / 100
      : roundForKpiUnit(sum, kpi.unit);
  }

  const annual = isAvg
    ? Math.round((safeMonths.reduce((a, b) => a + b, 0) / 12) * 100) / 100
    : roundForKpiUnit(
        safeMonths.reduce((a, b) => a + b, 0),
        kpi.unit
      );

  return {
    ...kpi,
    monthlyTargets: safeMonths,
    quarterlyTargets: nextQuarters,
    personalAnnualTarget: annual,
  };
}

export function cascadeAnnualToQuartersAndMonths(
  kpi: KpiItem,
  nextAnnualRaw: number,
  strategy?: PlanDistributionStrategy,
  activeFy?: FiscalYearWorkspace | null,
  priorFy?: FiscalYearWorkspace | null
): KpiItem {
  const effectiveStrategy = strategy || kpi.distributionStrategy || 'equal';
  const nextAnnual = roundForKpiUnit(nextAnnualRaw, kpi.unit);
  const pinnedSet = new Set((kpi.pinnedMonths || []).filter((m) => m >= 0 && m < 12));
  const safeCurrentMonths = Array.from(
    { length: 12 },
    (_, i) => Math.max(0, Number(kpi.monthlyTargets[i]) || 0)
  );

  if (kpi.aggregation === 'average') {
    const nextMonths = safeCurrentMonths.map((cur, idx) =>
      pinnedSet.has(idx) ? cur : nextAnnual
    );
    const nextQuarters: Record<QuarterKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const q of QUARTERS) {
      const qIndices = QUARTER_MONTH_INDICES[q];
      const qAvg = qIndices.reduce((s, idx) => s + nextMonths[idx], 0) / 3;
      nextQuarters[q] = Math.round(qAvg * 100) / 100;
    }
    return {
      ...kpi,
      distributionStrategy: effectiveStrategy,
      personalAnnualTarget: nextAnnual,
      quarterlyTargets: nextQuarters,
      monthlyTargets: nextMonths,
    };
  }

  const unpinnedIndices = Array.from({ length: 12 }, (_, i) => i).filter(
    (i) => !pinnedSet.has(i)
  );

  if (unpinnedIndices.length === 0) {
    return {
      ...kpi,
      distributionStrategy: effectiveStrategy,
      personalAnnualTarget: nextAnnual,
    };
  }

  const pinnedSum = Array.from(pinnedSet).reduce((s, idx) => s + safeCurrentMonths[idx], 0);
  const remaining = Math.max(0, nextAnnual - pinnedSum);
  const weights = computeMonthlyWeightsForStrategy(
    effectiveStrategy,
    kpi,
    activeFy,
    priorFy
  );
  const allocated = allocateProportionally(remaining, unpinnedIndices, weights, kpi.unit);

  const nextMonths = safeCurrentMonths.map((cur, idx) =>
    pinnedSet.has(idx) ? cur : allocated[idx] ?? 0
  );

  const nextQuarters: Record<QuarterKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const q of QUARTERS) {
    const qIndices = QUARTER_MONTH_INDICES[q];
    const qSum = qIndices.reduce((s, idx) => s + nextMonths[idx], 0);
    nextQuarters[q] = roundForKpiUnit(qSum, kpi.unit);
  }

  return {
    ...kpi,
    distributionStrategy: effectiveStrategy,
    personalAnnualTarget: nextAnnual,
    quarterlyTargets: nextQuarters,
    monthlyTargets: nextMonths,
  };
}

export function cascadeQuarterToMonthsAndRollupAnnual(
  kpi: KpiItem,
  quarter: QuarterKey,
  nextQuarterRaw: number,
  autoSync: boolean,
  activeFy?: FiscalYearWorkspace | null
): KpiItem {
  const nextQuarterVal = roundForKpiUnit(nextQuarterRaw, kpi.unit);
  const nextQuarters: Record<QuarterKey, number> = {
    ...kpi.quarterlyTargets,
    [quarter]: nextQuarterVal,
  };

  if (!autoSync) {
    return {
      ...kpi,
      quarterlyTargets: nextQuarters,
    };
  }

  const safeMonths = Array.from(
    { length: 12 },
    (_, i) => Math.max(0, Number(kpi.monthlyTargets[i]) || 0)
  );
  const qIndices = QUARTER_MONTH_INDICES[quarter];
  const pinnedSet = new Set((kpi.pinnedMonths || []).filter((m) => qIndices.includes(m)));

  if (kpi.aggregation === 'average') {
    qIndices.forEach((mIdx) => {
      if (!pinnedSet.has(mIdx)) {
        safeMonths[mIdx] = nextQuarterVal;
      }
    });
  } else {
    const unpinnedInQ = qIndices.filter((mIdx) => !pinnedSet.has(mIdx));
    if (unpinnedInQ.length > 0) {
      const pinnedSum = Array.from(pinnedSet).reduce((s, idx) => s + safeMonths[idx], 0);
      const remaining = Math.max(0, nextQuarterVal - pinnedSum);
      const weights =
        kpi.distributionStrategy === 'working_days' && activeFy
          ? Array.from({ length: 12 }, (_, mIdx) =>
              Math.max(1, getEffectiveMonthWorkingConfig(activeFy, mIdx).netWorkingDays)
            )
          : Array(12).fill(1);
      const allocated = allocateProportionally(remaining, unpinnedInQ, weights, kpi.unit);
      unpinnedInQ.forEach((mIdx) => {
        safeMonths[mIdx] = allocated[mIdx] ?? 0;
      });
    }
  }

  // Recompute annual total from the 4 quarters
  const isAvg = kpi.aggregation === 'average';
  const nextAnnual = isAvg
    ? Math.round((QUARTERS.reduce((s, q) => s + (nextQuarters[q] || 0), 0) / 4) * 100) / 100
    : roundForKpiUnit(
        QUARTERS.reduce((s, q) => s + (nextQuarters[q] || 0), 0),
        kpi.unit
      );

  return {
    ...kpi,
    personalAnnualTarget: nextAnnual,
    quarterlyTargets: nextQuarters,
    monthlyTargets: safeMonths,
  };
}

export function updateMonthTargetWithSync(
  kpi: KpiItem,
  monthIndex: number,
  nextMonthRaw: number,
  autoSync: boolean
): KpiItem {
  const nextMonthVal = roundForKpiUnit(nextMonthRaw, kpi.unit);
  const nextMonths = Array.from(
    { length: 12 },
    (_, i) => Math.max(0, Number(kpi.monthlyTargets[i]) || 0)
  );
  nextMonths[monthIndex] = nextMonthVal;

  const updated: KpiItem = {
    ...kpi,
    monthlyTargets: nextMonths,
  };

  if (!autoSync) {
    return updated;
  }

  return rollupMonthsToQuartersAndAnnualForKpi(updated);
}

export interface KpiPlanSyncDiagnostic {
  isUnplanned: boolean;
  hasBranchButNoPersonal: boolean;
  hasQuarterDrift: boolean;
  hasMonthDrift: boolean;
  quartersAggregate: number;
  monthsAggregate: number;
  isFullySynced: boolean;
}

export function getKpiPlanSyncDiagnostic(kpi: KpiItem): KpiPlanSyncDiagnostic {
  const isAvg = kpi.aggregation === 'average';
  const safeMonths = Array.from(
    { length: 12 },
    (_, i) => Math.max(0, Number(kpi.monthlyTargets[i]) || 0)
  );
  const quartersAggregate = isAvg
    ? QUARTERS.reduce((s, q) => s + (kpi.quarterlyTargets[q] || 0), 0) / 4
    : QUARTERS.reduce((s, q) => s + (kpi.quarterlyTargets[q] || 0), 0);

  const monthsAggregate = isAvg
    ? safeMonths.reduce((s, m) => s + m, 0) / 12
    : safeMonths.reduce((s, m) => s + m, 0);

  const tolerance = kpi.unit === 'COUNT' ? 1 : 0.15;
  const hasQuarterDrift = Math.abs(quartersAggregate - kpi.personalAnnualTarget) > tolerance;
  const hasMonthDrift = Math.abs(monthsAggregate - kpi.personalAnnualTarget) > tolerance;
  const isUnplanned = kpi.personalAnnualTarget <= 0 && monthsAggregate <= 0;
  const hasBranchButNoPersonal = kpi.branchAnnualTarget > 0 && kpi.personalAnnualTarget <= 0;

  return {
    isUnplanned,
    hasBranchButNoPersonal,
    hasQuarterDrift,
    hasMonthDrift,
    quartersAggregate,
    monthsAggregate,
    isFullySynced: !isUnplanned && !hasQuarterDrift && !hasMonthDrift,
  };
}

export function bulkApplyShareAndCascadeAll(
  kpis: KpiItem[],
  sharePct: number,
  strategy: PlanDistributionStrategy,
  activeFy?: FiscalYearWorkspace | null,
  priorFy?: FiscalYearWorkspace | null
): KpiItem[] {
  const cleanPct = Math.max(0, Math.min(100, sharePct));
  return kpis.map((kpi) => {
    const isRate = kpi.aggregation === 'average' || kpi.direction === 'lower_better';
    let targetAnnual = kpi.personalAnnualTarget;

    if (isRate) {
      if (targetAnnual <= 0 && kpi.branchAnnualTarget > 0) {
        targetAnnual = kpi.branchAnnualTarget;
      }
    } else if (kpi.branchAnnualTarget > 0) {
      targetAnnual = roundForKpiUnit((kpi.branchAnnualTarget * cleanPct) / 100, kpi.unit);
    }

    return cascadeAnnualToQuartersAndMonths(
      { ...kpi, pinnedMonths: [] },
      targetAnnual,
      strategy,
      activeFy,
      priorFy
    );
  });
}

export function autoSyncUnsyncedKpiPlans(
  kpis: KpiItem[],
  defaultSharePct = 10,
  activeFy?: FiscalYearWorkspace | null,
  priorFy?: FiscalYearWorkspace | null
): KpiItem[] {
  return kpis.map((kpi) => {
    const diag = getKpiPlanSyncDiagnostic(kpi);
    if (diag.isFullySynced) return kpi;

    // Case 1: Monthly targets were entered manually while Annual was left at 0 -> roll up!
    if (kpi.personalAnnualTarget <= 0 && diag.monthsAggregate > 0) {
      return rollupMonthsToQuartersAndAnnualForKpi(kpi);
    }

    // Case 2: Annual plan > 0, but quarters or months weren't cascaded yet -> cascade!
    if (kpi.personalAnnualTarget > 0 && (diag.hasMonthDrift || diag.hasQuarterDrift)) {
      return cascadeAnnualToQuartersAndMonths(
        kpi,
        kpi.personalAnnualTarget,
        kpi.distributionStrategy || 'equal',
        activeFy,
        priorFy
      );
    }

    // Case 3: Branch plan > 0, Personal plan = 0 -> derive default share or rate benchmark & cascade!
    if (kpi.branchAnnualTarget > 0 && kpi.personalAnnualTarget <= 0) {
      const isRate = kpi.aggregation === 'average' || kpi.direction === 'lower_better';
      const derivedAnnual = isRate
        ? kpi.branchAnnualTarget
        : roundForKpiUnit((kpi.branchAnnualTarget * defaultSharePct) / 100, kpi.unit);
      return cascadeAnnualToQuartersAndMonths(
        kpi,
        derivedAnnual,
        kpi.distributionStrategy || 'equal',
        activeFy,
        priorFy
      );
    }

    return kpi;
  });
}
