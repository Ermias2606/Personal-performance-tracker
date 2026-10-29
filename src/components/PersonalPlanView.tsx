import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CalendarDays,
  CheckCircle2,
  Grid3X3,
  Info,
  Lock,
  RefreshCw,
  Sliders,
  Sparkles,
  Unlock,
} from 'lucide-react';
import {
  ActiveTab,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategoryDef,
  KpiItem,
  PlanDistributionStrategy,
  QuarterKey,
} from '../types/kpi';
import {
  autoSyncUnsyncedKpiPlans,
  bulkApplyShareAndCascadeAll,
  cascadeAnnualToQuartersAndMonths,
  cascadeQuarterToMonthsAndRollupAnnual,
  getDistributionStrategyLabel,
  getKpiPlanSyncDiagnostic,
  rollupMonthsToQuartersAndAnnualForKpi,
  roundForKpiUnit,
  updateMonthTargetWithSync,
} from '../utils/planCascade';
import { getEffectiveMonthWorkingConfig } from '../utils/ethiopianCalendar';
import {
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  getQuarterLabel,
  QUARTER_MONTH_INDICES,
  QUARTERS,
} from '../utils/i18n';

interface PersonalPlanViewProps {
  profile: EmployeeProfile;
  activeFy: FiscalYearWorkspace;
  priorFy?: FiscalYearWorkspace | null;
  kpis: KpiItem[];
  categories: KpiCategoryDef[];
  focusedKpiId: string | null;
  onSaveKpi: (kpi: KpiItem) => void;
  onUpdateKpis: (kpis: KpiItem[]) => void;
  onOpenWorkingCalendar?: (monthIndex: number) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const PersonalPlanView: React.FC<PersonalPlanViewProps> = ({
  profile,
  activeFy,
  priorFy,
  kpis,
  categories,
  focusedKpiId,
  onSaveKpi,
  onUpdateKpis,
  onOpenWorkingCalendar,
  onNavigateTab,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);

  const [viewMode, setViewMode] = useState<'single' | 'matrix'>('single');
  const [matrixScope, setMatrixScope] = useState<'quarters' | 'months'>('quarters');
  const [matrixCategory, setMatrixCategory] = useState<string>('all');
  const [autoSync, setAutoSync] = useState<boolean>(true);

  const [selectedKpiId, setSelectedKpiId] = useState<string>(
    focusedKpiId || kpis[0]?.id || ''
  );

  // Bulk assignment controls
  const [bulkSharePct, setBulkSharePct] = useState<string>('10');
  const [bulkStrategy, setBulkStrategy] = useState<PlanDistributionStrategy>('equal');
  const [bulkFeedback, setBulkFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (focusedKpiId && kpis.some((k) => k.id === focusedKpiId)) {
      setSelectedKpiId(focusedKpiId);
      setViewMode('single');
    } else if (!kpis.some((k) => k.id === selectedKpiId) && kpis[0]) {
      setSelectedKpiId(kpis[0].id);
    }
  }, [focusedKpiId, kpis, selectedKpiId]);

  const diagnosticsByKpi = useMemo(() => {
    const map: Record<string, ReturnType<typeof getKpiPlanSyncDiagnostic>> = {};
    for (const k of kpis) {
      map[k.id] = getKpiPlanSyncDiagnostic(k);
    }
    return map;
  }, [kpis]);

  const portfolioPlanStats = useMemo(() => {
    let plannedCount = 0;
    let syncedCount = 0;
    for (const k of kpis) {
      const d = diagnosticsByKpi[k.id];
      if (!d.isUnplanned) plannedCount += 1;
      if (d.isFullySynced) syncedCount += 1;
    }
    return {
      total: kpis.length,
      plannedCount,
      syncedCount,
      unsyncedCount: kpis.length - syncedCount,
    };
  }, [kpis, diagnosticsByKpi]);

  const monthNetDays = useMemo(
    () =>
      Array.from({ length: 12 }, (_, mIdx) =>
        getEffectiveMonthWorkingConfig(activeFy, mIdx).netWorkingDays
      ),
    [activeFy]
  );

  const activeKpi = kpis.find((k) => k.id === selectedKpiId) || kpis[0];

  if (!activeKpi) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          {lang === 'am'
            ? 'በመጀመሪያ የቅርንጫፉን ዓመታዊ እቅድ ያስገቡ'
            : 'Please set up your Branch Annual Plan first'}
        </p>
        <button
          type="button"
          onClick={() => onNavigateTab('branch')}
          className="mt-4 min-h-[42px] rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
        >
          {lang === 'am' ? 'ወደ የቅርንጫፍ እቅድ ሂድ' : 'Go to Branch Plan'}
        </button>
      </div>
    );
  }

  const activeDiag = diagnosticsByKpi[activeKpi.id];
  const branchSharePct =
    activeKpi.branchAnnualTarget > 0
      ? (activeKpi.personalAnnualTarget / activeKpi.branchAnnualTarget) * 100
      : 0;
  const isAverageMode = activeKpi.aggregation === 'average';
  const pinnedSet = new Set(activeKpi.pinnedMonths || []);
  const activeStrategy: PlanDistributionStrategy = activeKpi.distributionStrategy || 'equal';

  const strategies: PlanDistributionStrategy[] = priorFy
    ? ['equal', 'working_days', 'ramp_up', 'front_loaded', 'prior_year']
    : ['equal', 'working_days', 'ramp_up', 'front_loaded'];

  const showBulkToast = (msg: string) => {
    setBulkFeedback(msg);
    setTimeout(() => setBulkFeedback(null), 4000);
  };

  // Single-KPI handlers
  const handleAnnualChange = (kpi: KpiItem, raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    if (autoSync) {
      onSaveKpi(
        cascadeAnnualToQuartersAndMonths(
          kpi,
          val,
          kpi.distributionStrategy || 'equal',
          activeFy,
          priorFy
        )
      );
    } else {
      onSaveKpi({ ...kpi, personalAnnualTarget: roundForKpiUnit(val, kpi.unit) });
    }
  };

  const handleSharePercentChange = (kpi: KpiItem, raw: string) => {
    const pct = Math.max(0, Number(raw) || 0);
    const computedAnnual = roundForKpiUnit(
      (kpi.branchAnnualTarget * pct) / 100,
      kpi.unit
    );
    if (autoSync) {
      onSaveKpi(
        cascadeAnnualToQuartersAndMonths(
          kpi,
          computedAnnual,
          kpi.distributionStrategy || 'equal',
          activeFy,
          priorFy
        )
      );
    } else {
      onSaveKpi({ ...kpi, personalAnnualTarget: computedAnnual });
    }
  };

  const handleApplyStrategyToKpi = (kpi: KpiItem, strategy: PlanDistributionStrategy) => {
    onSaveKpi(
      cascadeAnnualToQuartersAndMonths(
        kpi,
        kpi.personalAnnualTarget,
        strategy,
        activeFy,
        priorFy
      )
    );
  };

  const handleQuarterChange = (kpi: KpiItem, q: QuarterKey, raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    onSaveKpi(cascadeQuarterToMonthsAndRollupAnnual(kpi, q, val, autoSync, activeFy));
  };

  const handleMonthChange = (kpi: KpiItem, monthIndex: number, raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    onSaveKpi(updateMonthTargetWithSync(kpi, monthIndex, val, autoSync));
  };

  const handleTogglePinMonth = (monthIndex: number) => {
    const current = new Set(activeKpi.pinnedMonths || []);
    if (current.has(monthIndex)) {
      current.delete(monthIndex);
    } else {
      current.add(monthIndex);
    }
    onSaveKpi({
      ...activeKpi,
      pinnedMonths: Array.from(current).sort((a, b) => a - b),
    });
  };

  const handleClearPinnedMonths = () => {
    onSaveKpi({ ...activeKpi, pinnedMonths: [] });
  };

  // Bulk handlers across all KPIs
  const handleBulkApplyShareAll = () => {
    const pct = Math.max(0, Math.min(100, Number(bulkSharePct) || 0));
    const nextKpis = bulkApplyShareAndCascadeAll(
      kpis,
      pct,
      bulkStrategy,
      activeFy,
      priorFy
    );
    onUpdateKpis(nextKpis);
    showBulkToast(
      lang === 'am'
        ? `ለሁሉም ${kpis.length} የKPI መለኪያዎች ${pct}% የቅርንጫፍ ድርሻ እና የ12 ወራት እቅድ ተሰልቷል።`
        : `Applied ${pct}% branch share & cascaded 12-month targets across all ${kpis.length} KPIs.`
    );
  };

  const handleSyncAllUnsynced = () => {
    const pct = Math.max(0, Math.min(100, Number(bulkSharePct) || 10));
    const nextKpis = autoSyncUnsyncedKpiPlans(kpis, pct, activeFy, priorFy);
    onUpdateKpis(nextKpis);
    showBulkToast(
      lang === 'am'
        ? 'ሁሉም ዓመታዊ፣ ሩብ ዓመት እና ወርሃዊ እቅዶች በትክክል ተጣጥመዋል።'
        : 'All KPI annual, quarterly, and 12-month targets are now synchronized.'
    );
  };

  const filteredMatrixKpis = useMemo(() => {
    if (matrixCategory === 'all') return kpis;
    return kpis.filter((k) => k.category === matrixCategory);
  }, [kpis, matrixCategory]);

  return (
    <div className="space-y-6">
      {/* Page Header & View Mode Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'am'
              ? '2. የግል የተሰጠኝ እቅድ — ዓመታዊ፣ ሩብ ዓመት እና 12 ወራት'
              : '2. Personal Assigned Plan — Annual, Quarterly & 12-Month'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? 'እዚህ የሚያስገቡት እቅድ በሁሉም የክንውን መመዝገቢያዎች (Actuals, Weekly Check-In, Daily Pace) ላይ ወዲያውኑ እንደ መለኪያ ያገለግላል።'
              : 'Targets entered here automatically power benchmarks across Monthly Actuals, Quick Log, Weekly Check-In, and Daily Pace.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Segmented Switch: Single KPI vs All KPIs Matrix */}
          <div className="inline-flex rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setViewMode('single')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'single'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'በተናጠል ማዘጋጃ' : 'Single KPI Editor'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span>
                {lang === 'am'
                  ? `የሁሉም KPIs ሰንጠረዥ (${kpis.length})`
                  : `All KPIs Matrix (${kpis.length})`}
              </span>
            </button>
          </div>

          {/* Live Auto-Sync Toggle */}
          <button
            type="button"
            onClick={() => setAutoSync((prev) => !prev)}
            className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              autoSync
                ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
            }`}
            title={
              lang === 'am'
                ? 'ሲበራ ዓመታዊ፣ ሩብ ዓመት እና ወርሃዊ እቅዶች በራስ-ሰር ይናበባሉ'
                : 'When enabled, editing Annual, Quarterly, or Monthly targets automatically updates the others'
            }
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            <span>
              {autoSync
                ? lang === 'am'
                  ? 'ቀጥታ ማመሳሰል፦ በርቷል'
                  : 'Auto-Sync: ON'
                : lang === 'am'
                  ? 'ቀጥታ ማመሳሰል፦ ጠፍቷል'
                  : 'Auto-Sync: Manual'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('actuals')}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>{lang === 'am' ? 'ወደ ክንውን መመዝገቢያ ቀጥል' : 'Next: Enter Actuals'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Plan Completeness & Bulk Multi-KPI Assignment Strip */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {portfolioPlanStats.unsyncedCount === 0 ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  {lang === 'am'
                    ? `ሁሉም ${portfolioPlanStats.total}/${portfolioPlanStats.total} የKPI መለኪያዎች ለ12 ወራት ክንውን ዝግጁ ናቸው`
                    : `All ${portfolioPlanStats.total}/${portfolioPlanStats.total} KPI indicators synced across 12 months`}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {lang === 'am'
                    ? `${portfolioPlanStats.syncedCount}/${portfolioPlanStats.total} KPIs ተሟልተዋል · ${portfolioPlanStats.unsyncedCount} መለኪያዎች ወርሃዊ ማመሳሰል ይፈልጋሉ`
                    : `${portfolioPlanStats.syncedCount}/${portfolioPlanStats.total} KPIs synced · ${portfolioPlanStats.unsyncedCount} need monthly distribution`}
                </span>
              </span>
            )}
          </div>

          {portfolioPlanStats.unsyncedCount > 0 && (
            <button
              type="button"
              onClick={handleSyncAllUnsynced}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start lg:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                {lang === 'am'
                  ? 'ያልተከፋፈሉ እቅዶችን ወደ 12 ወራት አመሳስል'
                  : 'Auto-Sync Missing Monthly Plans'}
              </span>
            </button>
          )}
        </div>

        {/* Bulk Branch Share % & Smart Distribution Preset Bar */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
          <div className="sm:col-span-3">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {lang === 'am'
                ? 'የጅምላ የቅርንጫፍ ድርሻ % (ለሁሉም KPIs)'
                : 'Bulk Branch Share % (All Sum KPIs)'}
            </label>
            <div className="mt-1 flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={bulkSharePct}
                onChange={(e) => setBulkSharePct(e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              />
              <span className="font-mono text-xs font-semibold text-slate-500">%</span>
            </div>
          </div>

          <div className="sm:col-span-5">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              {lang === 'am'
                ? 'የ12 ወራት የእቅድ አከፋፈል ዘዴ (Distribution Strategy)'
                : '12-Month Distribution Strategy'}
            </label>
            <select
              value={bulkStrategy}
              onChange={(e) => setBulkStrategy(e.target.value as PlanDistributionStrategy)}
              className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
            >
              {strategies.map((st) => (
                <option key={st} value={st}>
                  {getDistributionStrategyLabel(st, lang)}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkApplyShareAll}
              className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span>
                {lang === 'am'
                  ? 'ለሁሉም KPIs ተግብር እና አካፍል'
                  : 'Apply & Cascade All KPIs'}
              </span>
            </button>
          </div>
        </div>

        {bulkFeedback && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            {bulkFeedback}
          </p>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODE 1: ALL KPIS UNIFIED PLAN MATRIX (SPREADSHEET)                   */}
      {/* ==================================================================== */}
      {viewMode === 'matrix' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የሁሉም KPI መለኪያዎች የግል እቅድ ሰንጠረዥ (Unified Plan Matrix)'
                  : 'Unified Personal Plan Matrix — All Indicators'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'የሁሉንም መለኪያዎች ዓመታዊ፣ ሩብ ዓመት ወይም 12 ወራት እቅድ በአንድ ገጽ ላይ በፍጥነት ያዘጋጁ።'
                  : 'Edit Annual, Share %, Quarterly, or 12-Month targets across every indicator in one grid.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={matrixCategory}
                onChange={(e) => setMatrixCategory(e.target.value)}
                className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">
                  {lang === 'am' ? 'ሁሉም ዘርፎች' : 'All Categories'}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'am' ? c.nameAm || c.nameEn : c.nameEn || c.nameAm}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setMatrixScope('quarters')}
                  className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    matrixScope === 'quarters'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? 'ዓመታዊ + Q1–Q4' : 'Annual + Q1–Q4'}
                </button>
                <button
                  type="button"
                  onClick={() => setMatrixScope('months')}
                  className={`min-h-[32px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    matrixScope === 'months'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? 'ዓመታዊ + 12 ወራት' : 'Annual + 12 Months'}
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3 min-w-[210px]">
                    {lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}
                  </th>
                  <th className="px-2.5 py-3 text-right min-w-[115px]">
                    {lang === 'am' ? 'የቅርንጫፍ እቅድ' : 'Branch Plan'}
                  </th>
                  <th className="px-2.5 py-3 text-right min-w-[92px]">
                    {lang === 'am' ? 'ድርሻ %' : 'Share %'}
                  </th>
                  <th className="px-2.5 py-3 text-right min-w-[140px]">
                    {lang === 'am' ? 'የእኔ ዓመታዊ እቅድ' : 'My Annual Plan'}
                  </th>
                  {matrixScope === 'quarters'
                    ? QUARTERS.map((q) => (
                        <th key={q} className="px-2.5 py-3 text-right min-w-[125px]">
                          {q}
                        </th>
                      ))
                    : fiscalMonths.map((m) => (
                        <th key={m.index} className="px-2 py-3 text-right min-w-[110px]">
                          <div>{lang === 'am' ? m.shortAm : m.shortEn}</div>
                          <div className="font-mono text-[10px] font-normal text-slate-400">
                            {monthNetDays[m.index]}d
                          </div>
                        </th>
                      ))}
                  <th className="py-3 pl-2.5 pr-5 text-right min-w-[110px]">
                    {lang === 'am' ? 'ሁኔታ / ዝርዝር' : 'Sync / Detail'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredMatrixKpis.map((kpi) => {
                  const diag = diagnosticsByKpi[kpi.id];
                  const isRate =
                    kpi.aggregation === 'average' || kpi.direction === 'lower_better';
                  const rowSharePct =
                    kpi.branchAnnualTarget > 0
                      ? Math.round((kpi.personalAnnualTarget / kpi.branchAnnualTarget) * 1000) / 10
                      : 0;

                  return (
                    <tr
                      key={kpi.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-3 align-middle">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {kpi.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{kpi.code}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>{kpi.unit}</span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span className="font-mono">{kpi.weight}%</span>
                        </div>
                      </td>

                      <td className="px-2.5 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {formatKpiValue(kpi.branchAnnualTarget, kpi.unit, true)}
                      </td>

                      <td className="px-2.5 py-3.5 text-right align-middle">
                        {isRate || kpi.branchAnnualTarget <= 0 ? (
                          <span className="font-mono text-[11px] text-slate-400">
                            {lang === 'am' ? 'ምጣኔ' : 'Rate'}
                          </span>
                        ) : (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            aria-label={`${kpi.code} Share %`}
                            value={rowSharePct}
                            onChange={(e) => handleSharePercentChange(kpi, e.target.value)}
                            className="w-20 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-right font-mono text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                          />
                        )}
                      </td>

                      <td className="px-2.5 py-3.5 text-right align-middle">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          aria-label={`${kpi.code} Annual Target`}
                          value={kpi.personalAnnualTarget}
                          onChange={(e) => handleAnnualChange(kpi, e.target.value)}
                          className="w-32 min-h-[36px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-right font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                        />
                      </td>

                      {matrixScope === 'quarters'
                        ? QUARTERS.map((q) => (
                            <td key={q} className="px-2.5 py-3.5 text-right align-middle">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                aria-label={`${kpi.code} ${q} Target`}
                                value={kpi.quarterlyTargets[q] ?? 0}
                                onChange={(e) => handleQuarterChange(kpi, q, e.target.value)}
                                className="w-28 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                              />
                            </td>
                          ))
                        : fiscalMonths.map((m) => (
                            <td key={m.index} className="px-2 py-3.5 text-right align-middle">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                aria-label={`${kpi.code} ${m.shortEn} Target`}
                                value={kpi.monthlyTargets[m.index] ?? 0}
                                onChange={(e) =>
                                  handleMonthChange(kpi, m.index, e.target.value)
                                }
                                className="w-24 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                              />
                            </td>
                          ))}

                      <td className="py-3.5 pl-2.5 pr-5 text-right align-middle whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {diag.isFullySynced ? (
                            <span
                              className="text-emerald-600 dark:text-emerald-400"
                              title={lang === 'am' ? '12 ወራት ተመሳስሏል' : '12M Synced'}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleApplyStrategyToKpi(
                                  kpi,
                                  kpi.distributionStrategy || 'equal'
                                )
                              }
                              className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                            >
                              {lang === 'am' ? 'አመሳስል' : 'Sync 12M'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedKpiId(kpi.id);
                              setViewMode('single');
                            }}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-600 cursor-pointer"
                          >
                            {lang === 'am' ? 'ዝርዝር' : 'Detail'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ==================================================================== */
        /* MODE 2: SINGLE KPI DETAILED PLANNING WORKSPACE                       */
        /* ==================================================================== */
        <>
          {/* KPI Selector Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {kpis.map((k) => {
              const active = k.id === activeKpi.id;
              const d = diagnosticsByKpi[k.id];
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setSelectedKpiId(k.id)}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border px-3.5 py-2 text-left text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="font-mono opacity-75">{k.code}</span>
                  <span>{k.name.split('(')[0].trim()}</span>
                  {d.isFullySynced ? (
                    <CheckCircle2
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? 'text-emerald-300' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    />
                  ) : (
                    <AlertTriangle
                      className={`h-3.5 w-3.5 shrink-0 ${
                        active ? 'text-amber-300' : 'text-amber-600 dark:text-amber-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected KPI Planning Workspace */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-8">
            {/* Section A: Branch Reference, Annual Input & Smart Distribution Presets */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6 space-y-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    {activeKpi.name}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{activeKpi.code}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{getCategoryLabel(activeKpi.category, lang, categories)}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>
                      {lang === 'am'
                        ? `ክብደት ${activeKpi.weight}%`
                        : `Weight ${activeKpi.weight}%`}
                    </span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>
                      {isAverageMode
                        ? lang === 'am'
                          ? 'ስሌት፦ አማካይ (Average)'
                          : 'Mode: Average'
                        : lang === 'am'
                          ? 'ስሌት፦ ድምር (Cumulative Sum)'
                          : 'Mode: Cumulative Sum'}
                    </span>
                  </p>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400">
                  {lang === 'am'
                    ? 'የቅርንጫፉ አጠቃላይ ዓመታዊ እቅድ፦ '
                    : 'Branch Overall Annual Plan: '}
                  <strong className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                    {formatKpiValue(activeKpi.branchAnnualTarget, activeKpi.unit)}
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am'
                      ? 'የእኔ ዓመታዊ እቅድ (My Annual Assigned Target)'
                      : 'My Annual Assigned Target'}
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={activeKpi.personalAnnualTarget}
                      onChange={(e) => handleAnnualChange(activeKpi, e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                    />
                    <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                      {activeKpi.unit}
                    </span>
                  </div>
                </div>

                {!isAverageMode && activeKpi.branchAnnualTarget > 0 && (
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {lang === 'am'
                        ? 'ከቅርንጫፍ እቅድ የእኔ ድርሻ (%)'
                        : 'Share of Branch Plan (%)'}
                    </label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={Math.round(branchSharePct * 100) / 100}
                        onChange={(e) => handleSharePercentChange(activeKpi, e.target.value)}
                        className="w-full min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-blue-800 dark:text-blue-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        %
                      </span>
                    </div>
                  </div>
                )}

                <div className="sm:col-span-4 flex flex-wrap items-center gap-2">
                  {onOpenWorkingCalendar && (
                    <button
                      type="button"
                      onClick={() => onOpenWorkingCalendar(profile.activeMonthIndex)}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-600 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <CalendarDays className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        {lang === 'am' ? 'የስራ ቀናት እና በዓላት (ዓ.ም)' : 'Working Days (ዓ.ም)'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Smart Distribution Presets Row */}
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                    {lang === 'am'
                      ? 'ብልህ የእቅድ ማከፋፈያ ዘዴዎች (Smart 12-Month Distribution Presets)፦'
                      : 'Smart 12-Month Distribution Presets (applies immediately to unpinned months):'}
                  </span>
                  {pinnedSet.size > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPinnedMonths}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                    >
                      <Unlock className="h-3 w-3" />
                      <span>
                        {lang === 'am'
                          ? `${pinnedSet.size} የተቆለፉ ወራትን ክፈት`
                          : `Unlock ${pinnedSet.size} pinned month(s)`}
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {strategies.map((st) => {
                    const isSelected = activeStrategy === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleApplyStrategyToKpi(activeKpi, st)}
                        className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                      >
                        {getDistributionStrategyLabel(st, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section B: Quarterly Assigned Targets (Q1 to Q4) */}
            <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'am'
                      ? 'የሩብ ዓመት እቅድ ማስገቢያ (Quarterly Targets — Q1 እስከ Q4)'
                      : 'Quarterly Assigned Targets (Q1 to Q4)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {autoSync
                      ? lang === 'am'
                        ? 'ማንኛውንም ሩብ ዓመት ሲቀይሩ የ3ቱ ወራት እና ዓመታዊ እቅድ በራስ-ሰር ይዘምናሉ።'
                        : 'Editing any quarter automatically distributes across its 3 months and updates the Annual total.'
                      : lang === 'am'
                        ? 'እያንዳንዱን የሩብ ዓመት እቅድ በእጅ ማስተካከል ይችላሉ።'
                        : 'Enter or customize each quarter target manually below.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
                  {!activeDiag.hasQuarterDrift ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>
                        {lang === 'am' ? 'ከዓመታዊ እቅድ ጋር እኩል ነው፦ ' : 'Matches Annual: '}
                        {formatKpiValue(activeDiag.quartersAggregate, activeKpi.unit)}
                      </span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                      <Info className="h-3.5 w-3.5" />
                      <span>
                        {lang === 'am' ? 'የ4 ሩብ ዓመት፦ ' : 'Quarterly: '}
                        {formatKpiValue(activeDiag.quartersAggregate, activeKpi.unit)} /{' '}
                        {formatKpiValue(activeKpi.personalAnnualTarget, activeKpi.unit)}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {QUARTERS.map((q) => {
                  const monthNames = QUARTER_MONTH_INDICES[q]
                    .map((idx) =>
                      lang === 'am' ? fiscalMonths[idx].shortAm : fiscalMonths[idx].shortEn
                    )
                    .join(' · ');

                  return (
                    <div
                      key={q}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-4"
                    >
                      <div className="flex items-baseline justify-between">
                        <label
                          htmlFor={`quarter-input-${q}`}
                          className="text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {getQuarterLabel(q, lang)}
                        </label>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {monthNames}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          id={`quarter-input-${q}`}
                          type="number"
                          step="any"
                          min="0"
                          value={activeKpi.quarterlyTargets[q] ?? 0}
                          onChange={(e) => handleQuarterChange(activeKpi, q, e.target.value)}
                          className="w-full min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section C: Monthly Assigned Targets (12 Months with Pinning & Net Working Days) */}
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {lang === 'am'
                      ? 'ወርሃዊ እቅድ ማስገቢያ (12 ወራት — የክንውን መለኪያ መሰረት)'
                      : 'Monthly Assigned Targets (12 Months — Drives All Actual Benchmarks)'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {lang === 'am'
                      ? 'ልዩ ወራትን በመቆለፊያ (Lock) ምልክት በመቆለፍ ቀሪውን እቅድ በሌሎች ወራት ላይ ብቻ ማከፋፈል ይችላሉ።'
                      : 'Pin specific custom months with the lock icon so Annual/Preset splits only adjust unpinned months.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`text-xs font-mono font-semibold tabular-nums ${
                      !activeDiag.hasMonthDrift
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {lang === 'am' ? 'የ12 ወራት፦ ' : '12-Month Aggregate: '}
                    {formatKpiValue(activeDiag.monthsAggregate, activeKpi.unit)}
                  </span>

                  {!autoSync && (
                    <button
                      type="button"
                      onClick={() =>
                        onSaveKpi(rollupMonthsToQuartersAndAnnualForKpi(activeKpi))
                      }
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Calculator className="h-3.5 w-3.5" />
                      <span>
                        {lang === 'am'
                          ? 'ከ12 ወራት → ሩብ ዓመት እና ዓመታዊ ደምር'
                          : 'Rollup Months → Quarters & Annual'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
                {QUARTERS.map((q) => {
                  const indices = QUARTER_MONTH_INDICES[q];
                  const qMonthSum = isAverageMode
                    ? indices.reduce(
                        (s, idx) => s + (activeKpi.monthlyTargets[idx] || 0),
                        0
                      ) / 3
                    : indices.reduce(
                        (s, idx) => s + (activeKpi.monthlyTargets[idx] || 0),
                        0
                      );

                  return (
                    <div
                      key={q}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {getQuarterLabel(q, lang)}
                        </span>
                        <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                          {lang === 'am' ? 'የወራት ድምር፦ ' : 'Months: '}
                          <strong className="text-slate-900 dark:text-white">
                            {formatKpiValue(qMonthSum, activeKpi.unit)}
                          </strong>{' '}
                          / {formatKpiValue(activeKpi.quarterlyTargets[q] || 0, activeKpi.unit)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {indices.map((mIdx) => {
                          const meta = fiscalMonths[mIdx];
                          const isPinned = pinnedSet.has(mIdx);
                          const netDays = monthNetDays[mIdx];
                          return (
                            <div key={mIdx}>
                              <div className="flex items-center justify-between gap-1">
                                <label
                                  htmlFor={`month-plan-${mIdx}`}
                                  className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate"
                                >
                                  {lang === 'am' ? meta.fullAm : meta.fullEn}
                                </label>
                                <div className="flex items-center gap-1 shrink-0">
                                  <span
                                    className="font-mono text-[10px] text-slate-400 tabular-nums"
                                    title={
                                      lang === 'am'
                                        ? `${netDays} የተጣራ የስራ ቀናት`
                                        : `${netDays} net working days`
                                    }
                                  >
                                    {netDays}d
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePinMonth(mIdx)}
                                    title={
                                      isPinned
                                        ? lang === 'am'
                                          ? 'ይህ ወር ተቆልፏል — ለመክፈት ይጫኑ'
                                          : 'Pinned custom target — click to unlock'
                                        : lang === 'am'
                                          ? 'ይህን ወር ቆልፍ (Pin Month)'
                                          : 'Pin this month from auto-split'
                                    }
                                    className={`flex h-5 w-5 items-center justify-center rounded transition-colors cursor-pointer ${
                                      isPinned
                                        ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60'
                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                  >
                                    {isPinned ? (
                                      <Lock className="h-3 w-3" />
                                    ) : (
                                      <Unlock className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                              <input
                                id={`month-plan-${mIdx}`}
                                type="number"
                                step="any"
                                min="0"
                                value={activeKpi.monthlyTargets[mIdx] ?? 0}
                                onChange={(e) =>
                                  handleMonthChange(activeKpi, mIdx, e.target.value)
                                }
                                className={`mt-1 w-full min-h-[40px] rounded-lg border px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden ${
                                  isPinned
                                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/30'
                                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
