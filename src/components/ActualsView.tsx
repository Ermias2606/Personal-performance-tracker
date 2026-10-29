import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle2,
  Edit3,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  ActualLogEntry,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategoryDef,
  KpiItem,
  QuarterKey,
} from '../types/kpi';
import {
  computeAchievementPct,
  computeActualForIndices,
  getKpiMonthActualInfo,
} from '../utils/analytics';
import {
  autoSyncUnsyncedKpiPlans,
  cascadeAnnualToQuartersAndMonths,
  getKpiPlanSyncDiagnostic,
  updateMonthTargetWithSync,
} from '../utils/planCascade';
import {
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  QUARTER_MONTH_INDICES,
  QUARTERS,
} from '../utils/i18n';

interface ActualsViewProps {
  profile: EmployeeProfile;
  activeFy: FiscalYearWorkspace;
  priorFy?: FiscalYearWorkspace | null;
  kpis: KpiItem[];
  categories: KpiCategoryDef[];
  logs: ActualLogEntry[];
  onSaveKpi: (kpi: KpiItem) => void;
  onUpdateKpis: (kpis: KpiItem[]) => void;
  onSetMonthlyActualTotal: (kpiId: string, monthIndex: number, targetTotal: number) => void;
  onClearMonthlyActual: (kpiId: string, monthIndex: number) => void;
  onDeleteLog: (logId: string) => void;
  onOpenLogModal: (kpiId?: string, monthIndex?: number) => void;
  onNavigateTab: (tab: ActiveTab, focusKpiId?: string) => void;
}

type SheetPeriodKey = QuarterKey | 'ALL';

export const ActualsView: React.FC<ActualsViewProps> = ({
  profile,
  activeFy,
  priorFy,
  kpis,
  categories,
  logs,
  onSaveKpi,
  onUpdateKpis,
  onSetMonthlyActualTotal,
  onClearMonthlyActual,
  onDeleteLog,
  onOpenLogModal,
  onNavigateTab,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const defaultQuarter = fiscalMonths[profile.activeMonthIndex]?.quarter || 'Q1';

  const [mode, setMode] = useState<'sheet' | 'logs'>('sheet');
  const [selectedPeriod, setSelectedPeriod] = useState<SheetPeriodKey>(defaultQuarter);
  const [indicatorScope, setIndicatorScope] = useState<'all' | 'assigned'>('all');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  // Inline quick-plan editor inside Actuals grid cell
  const [inlinePlanCell, setInlinePlanCell] = useState<{
    kpiId: string;
    monthIndex: number;
    monthDraft: string;
    annualDraft: string;
  } | null>(null);

  // Logs mode filters
  const [filterKpiId, setFilterKpiId] = useState<string>('all');
  const [filterMonthIdx, setFilterMonthIdx] = useState<string>('all');
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const visibleMonthIndices = useMemo(() => {
    if (selectedPeriod === 'ALL') {
      return Array.from({ length: 12 }, (_, i) => i);
    }
    return QUARTER_MONTH_INDICES[selectedPeriod];
  }, [selectedPeriod]);

  const ytdIndices = useMemo(() => {
    const end = Math.max(0, Math.min(11, profile.activeMonthIndex));
    return Array.from({ length: end + 1 }, (_, i) => i);
  }, [profile.activeMonthIndex]);

  const unsyncedDiagnostics = useMemo(() => {
    let unsyncedCount = 0;
    let assignedCount = 0;
    for (const k of kpis) {
      const diag = getKpiPlanSyncDiagnostic(k);
      if (!diag.isFullySynced) unsyncedCount += 1;
      if (!diag.isUnplanned) assignedCount += 1;
    }
    return { unsyncedCount, assignedCount };
  }, [kpis]);

  const displayedKpis = useMemo(() => {
    return kpis.filter((k) => {
      if (selectedCatFilter !== 'all' && k.category !== selectedCatFilter) return false;
      if (indicatorScope === 'assigned') {
        const d = getKpiPlanSyncDiagnostic(k);
        return !d.isUnplanned;
      }
      return true;
    });
  }, [kpis, selectedCatFilter, indicatorScope]);

  const filteredLogs = useMemo(() => {
    return [...logs]
      .filter((entry) => {
        if (filterKpiId !== 'all' && entry.kpiId !== filterKpiId) return false;
        if (filterMonthIdx !== 'all' && entry.monthIndex !== Number(filterMonthIdx)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [logs, filterKpiId, filterMonthIdx]);

  const handleAutoSyncAllMissing = () => {
    const synced = autoSyncUnsyncedKpiPlans(kpis, 10, activeFy, priorFy);
    onUpdateKpis(synced);
  };

  const openInlinePlanEditor = (kpi: KpiItem, monthIndex: number) => {
    setInlinePlanCell({
      kpiId: kpi.id,
      monthIndex,
      monthDraft: String(kpi.monthlyTargets[monthIndex] ?? 0),
      annualDraft: String(kpi.personalAnnualTarget ?? 0),
    });
  };

  const handleSaveInlineMonthPlan = (kpi: KpiItem) => {
    if (!inlinePlanCell) return;
    const val = Math.max(0, Number(inlinePlanCell.monthDraft) || 0);
    onSaveKpi(updateMonthTargetWithSync(kpi, inlinePlanCell.monthIndex, val, true));
    setInlinePlanCell(null);
  };

  const handleCascadeInlineAnnualPlan = (kpi: KpiItem) => {
    if (!inlinePlanCell) return;
    const annualVal = Math.max(0, Number(inlinePlanCell.annualDraft) || 0);
    onSaveKpi(
      cascadeAnnualToQuartersAndMonths(
        kpi,
        annualVal,
        kpi.distributionStrategy || 'equal',
        activeFy,
        priorFy
      )
    );
    setInlinePlanCell(null);
  };

  const getPctColorClass = (achPct: number) => {
    if (achPct >= 100) return 'text-emerald-700 dark:text-emerald-400';
    if (achPct >= 85) return 'text-blue-700 dark:text-blue-400';
    if (achPct >= 70) return 'text-amber-700 dark:text-amber-400';
    return 'text-red-700 dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'am'
              ? '3. ክንውን መመዝገቢያ እና የእቅድ አፈጻጸም መለኪያ'
              : '3. Actual Performance Input & Plan Benchmarks'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? 'ወርሃዊ ክንውንዎን ከግል ወርሃዊ፣ ሩብ ዓመት እና ዓመታዊ እቅድዎ ጋር እያነጻጸሩ በቀጥታ ይመዝግቡ።'
              : 'Enter actual figures directly against your Personal Monthly, Quarterly, and Annual Assigned Targets.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setMode('sheet')}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'sheet'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'am' ? 'ወርሃዊ ሰንጠረዥ (Direct Sheet)' : 'Monthly Grid'}
            </button>
            <button
              type="button"
              onClick={() => setMode('logs')}
              className={`min-h-[36px] rounded-md px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'logs'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'am' ? `ዝርዝር መዝገብ (${logs.length})` : `Activity Logs (${logs.length})`}
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenLogModal(undefined, profile.activeMonthIndex)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'am' ? 'አዲስ ክንውን መዝግብ' : 'Log Actual Entry'}</span>
          </button>
        </div>
      </div>

      {/* Guardrail Banner when any KPI has unsynced or zero monthly plans */}
      {unsyncedDiagnostics.unsyncedCount > 0 && kpis.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-200">
                {lang === 'am'
                  ? `${unsyncedDiagnostics.unsyncedCount} የKPI መለኪያዎች ወርሃዊ እቅዳቸው ከዓመታዊ/ቅርንጫፍ እቅድ ጋር አልተመሳሰለም`
                  : `${unsyncedDiagnostics.unsyncedCount} KPI indicator(s) have unsynced or unassigned monthly targets`}
              </p>
              <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/80">
                {lang === 'am'
                  ? 'ወርሃዊ እቅዶችን በአንድ ክሊክ ማመሳሰል ወይም በእያንዳንዱ ሳጥን ላይ "እቅድ፦ ..." የሚለውን በመጫን ማስተካከል ይችላሉ።'
                  : 'Auto-distribute missing monthly plans in one click, or click any "Plan" figure in the grid to adjust inline.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleAutoSyncAllMissing}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>
                {lang === 'am' ? 'ወርሃዊ እቅዶችን አሁን አመሳስል' : 'Auto-Sync Monthly Plans'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('personal')}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Target className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{lang === 'am' ? 'የግል እቅድ ክፈት' : 'Personal Plan Editor'}</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'sheet' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          {/* Toolbar: Indicator Scope, Category Filter & Q1-Q4 / All 12M Switcher */}
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'ወርሃዊ እቅድ እና ክንውን ቀጥታ ማስገቢያ ሰንጠረዥ'
                  : 'Direct Monthly Plan vs. Actual Spreadsheet'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'ክንውን በቀጥታ ይጻፉ · ማንኛውንም የወር እቅድ ለመቀየር "እቅድ፦ ..." ላይ ይጫኑ።'
                  : 'Type actuals into any month cell · click any "Plan" benchmark to adjust your target inline.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* All Indicators vs Assigned Plan Only */}
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setIndicatorScope('all')}
                  className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    indicatorScope === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? `ሁሉም (${kpis.length})` : `All KPIs (${kpis.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setIndicatorScope('assigned')}
                  className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    indicatorScope === 'assigned'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am'
                    ? `የተሰጠኝ ብቻ (${unsyncedDiagnostics.assignedCount})`
                    : `Assigned (${unsyncedDiagnostics.assignedCount})`}
                </button>
              </div>

              {/* Category Filter */}
              <select
                value={selectedCatFilter}
                onChange={(e) => setSelectedCatFilter(e.target.value)}
                className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">{lang === 'am' ? 'ሁሉም ዘርፎች' : 'All Categories'}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === 'am' ? c.nameAm || c.nameEn : c.nameEn || c.nameAm}
                  </option>
                ))}
              </select>

              {/* Q1 | Q2 | Q3 | Q4 | All 12M */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                {QUARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSelectedPeriod(q)}
                    className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      selectedPeriod === q
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('ALL')}
                  className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedPeriod === 'ALL'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? '12 ወራት' : 'All 12M'}
                </button>
              </div>
            </div>
          </div>

          {displayedKpis.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'am'
                  ? 'በዚህ ማጣሪያ የተገኘ የKPI መለኪያ የለም'
                  : 'No KPI indicators match the selected filter'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIndicatorScope('all');
                  setSelectedCatFilter('all');
                }}
                className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:border-blue-600 cursor-pointer"
              >
                {lang === 'am' ? 'ሁሉንም KPIs አሳይ' : 'Show All KPIs'}
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 pl-5 pr-3 min-w-[220px]">
                      {lang === 'am'
                        ? 'የKPI መለኪያ እና ዓመታዊ እቅድ'
                        : 'KPI Indicator & Annual Plan'}
                    </th>
                    {visibleMonthIndices.map((mIdx) => {
                      const meta = fiscalMonths[mIdx];
                      const isActiveM = mIdx === profile.activeMonthIndex;
                      return (
                        <th key={mIdx} className="px-3 py-3 min-w-[188px]">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                            <span>{lang === 'am' ? meta.fullAm : meta.fullEn}</span>
                            {isActiveM && (
                              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                · {lang === 'am' ? 'አሁን' : 'Active'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                            {lang === 'am'
                              ? 'እቅድ (ይስተካከላል) · ክንውን ከታች'
                              : 'Plan (click to edit) · Actual below'}
                          </div>
                        </th>
                      );
                    })}
                    {selectedPeriod !== 'ALL' && (
                      <th className="px-3 py-3 text-right min-w-[145px] bg-slate-100/50 dark:bg-slate-800/40">
                        <div>
                          {lang === 'am'
                            ? `የ${selectedPeriod} ሩብ ዓመት`
                            : `${selectedPeriod} Quarter`}
                        </div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          {lang === 'am' ? 'ክንውን / እቅድ (%)' : 'Actual / Plan (%)'}
                        </div>
                      </th>
                    )}
                    <th className="py-3 pl-3 pr-5 text-right min-w-[165px] bg-slate-100/70 dark:bg-slate-800/60">
                      <div>{lang === 'am' ? 'ዓመታዊ አፈጻጸም' : 'Annual Progress'}</div>
                      <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                        {lang === 'am' ? 'YTD ክንውን / ዓመታዊ እቅድ' : 'YTD Actual / Annual Plan'}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {displayedKpis.map((kpi) => {
                    const isRate =
                      kpi.aggregation === 'average' || kpi.direction === 'lower_better';

                    // Quarter summary when viewing Q1..Q4
                    const qTarget =
                      selectedPeriod !== 'ALL'
                        ? kpi.quarterlyTargets[selectedPeriod] ?? 0
                        : 0;
                    const qActualInfo =
                      selectedPeriod !== 'ALL'
                        ? computeActualForIndices(
                            kpi,
                            QUARTER_MONTH_INDICES[selectedPeriod],
                            logs
                          )
                        : { actual: 0, hasData: false };
                    const qAchPct =
                      selectedPeriod !== 'ALL'
                        ? computeAchievementPct(
                            kpi,
                            qTarget,
                            qActualInfo.actual,
                            qActualInfo.hasData
                          )
                        : 0;

                    // Annual YTD / Full-year progress
                    const annualIndices =
                      selectedPeriod === 'ALL'
                        ? Array.from({ length: 12 }, (_, i) => i)
                        : ytdIndices;
                    const annualActualInfo = computeActualForIndices(kpi, annualIndices, logs);
                    const annualAchPct = computeAchievementPct(
                      kpi,
                      kpi.personalAnnualTarget,
                      annualActualInfo.actual,
                      annualActualInfo.hasData
                    );
                    const annualRemaining =
                      !isRate && kpi.personalAnnualTarget > 0
                        ? Math.max(0, kpi.personalAnnualTarget - annualActualInfo.actual)
                        : 0;

                    return (
                      <tr
                        key={kpi.id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-4 pl-5 pr-3 align-top">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {kpi.name}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono">{kpi.code}</span>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span>{getCategoryLabel(kpi.category, lang, categories)}</span>
                            <span className="mx-1.5" aria-hidden="true">·</span>
                            <span className="font-mono">{kpi.weight}%</span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                            {kpi.personalAnnualTarget > 0 ? (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('personal', kpi.id)}
                                className="font-mono text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                              >
                                {lang === 'am' ? 'ዓመታዊ እቅድ፦ ' : 'Annual Plan: '}
                                <strong className="text-slate-900 dark:text-white tabular-nums">
                                  {formatKpiValue(kpi.personalAnnualTarget, kpi.unit, true)}
                                </strong>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onNavigateTab('personal', kpi.id)}
                                className="font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                + {lang === 'am' ? 'የግል እቅድ አስገባ' : 'Assign Personal Plan'}
                              </button>
                            )}
                          </div>
                        </td>

                        {visibleMonthIndices.map((mIdx) => {
                          const mTarget = kpi.monthlyTargets[mIdx] ?? 0;
                          const mInfo = getKpiMonthActualInfo(kpi.id, mIdx, logs);
                          const achPct = computeAchievementPct(
                            kpi,
                            mTarget,
                            mInfo.value,
                            mInfo.hasData
                          );
                          const isEditingThisPlan =
                            inlinePlanCell?.kpiId === kpi.id &&
                            inlinePlanCell?.monthIndex === mIdx;

                          const monthGap = mTarget - mInfo.value;

                          return (
                            <td key={mIdx} className="px-3 py-4 align-top">
                              {/* Top Plan Benchmark Row (Clickable to inline-edit plan) */}
                              <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                                <button
                                  type="button"
                                  onClick={() => openInlinePlanEditor(kpi, mIdx)}
                                  title={
                                    lang === 'am'
                                      ? 'የወሩን እቅድ በቀጥታ ለማስተካከል ይጫኑ'
                                      : 'Click to set or adjust this monthly target inline'
                                  }
                                  className={`group inline-flex items-center gap-1 rounded px-1 -ml-1 py-0.5 text-left transition-colors cursor-pointer ${
                                    mTarget <= 0
                                      ? 'text-amber-700 dark:text-amber-400 font-semibold hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                  }`}
                                >
                                  <span>{lang === 'am' ? 'እቅድ፦' : 'Plan:'}</span>
                                  <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                                    {formatKpiValue(mTarget, kpi.unit, true)}
                                  </strong>
                                  <Edit3 className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
                                </button>

                                {mInfo.hasData && (
                                  <span
                                    className={`font-mono font-bold tabular-nums ${getPctColorClass(
                                      achPct
                                    )}`}
                                  >
                                    {achPct.toFixed(0)}%
                                  </span>
                                )}
                              </div>

                              {/* Inline Quick-Plan Editor Popover inside cell */}
                              {isEditingThisPlan && inlinePlanCell && (
                                <div className="mb-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/70 dark:bg-blue-950/50 p-2.5 space-y-2">
                                  <div>
                                    <label className="block text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                                      {lang === 'am' ? 'የዚህ ወር እቅድ' : 'This Month Target'}
                                    </label>
                                    <div className="mt-1 flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        autoFocus
                                        value={inlinePlanCell.monthDraft}
                                        onChange={(e) =>
                                          setInlinePlanCell({
                                            ...inlinePlanCell,
                                            monthDraft: e.target.value,
                                          })
                                        }
                                        className="w-full min-h-[32px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleSaveInlineMonthPlan(kpi)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                                        title={lang === 'am' ? 'አስቀምጥ' : 'Save Month Plan'}
                                      >
                                        <Check className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setInlinePlanCell(null)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 cursor-pointer"
                                        title={lang === 'am' ? 'ዝጋ' : 'Close'}
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="border-t border-blue-200/60 dark:border-blue-800/60 pt-1.5">
                                    <label className="block text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                      {lang === 'am'
                                        ? 'ወይም ዓመታዊ እቅድ → ለ12 ወራት አካፍል'
                                        : 'Or Set Annual → Split 12M'}
                                    </label>
                                    <div className="mt-1 flex items-center gap-1">
                                      <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        value={inlinePlanCell.annualDraft}
                                        onChange={(e) =>
                                          setInlinePlanCell({
                                            ...inlinePlanCell,
                                            annualDraft: e.target.value,
                                          })
                                        }
                                        className="w-full min-h-[30px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 font-mono text-[11px] tabular-nums text-slate-900 dark:text-white"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleCascadeInlineAnnualPlan(kpi)}
                                        className="rounded bg-slate-900 dark:bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white whitespace-nowrap cursor-pointer"
                                      >
                                        {lang === 'am' ? '12 ወር አካፍል' : 'Split 12M'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Direct Actual Input + Detailed Modal Trigger */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder={lang === 'am' ? 'ክንውን አስገባ...' : 'Enter actual...'}
                                  value={mInfo.hasData ? mInfo.value : ''}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    if (raw === '') {
                                      onClearMonthlyActual(kpi.id, mIdx);
                                    } else {
                                      const num = Number(raw);
                                      if (!Number.isNaN(num)) {
                                        onSetMonthlyActualTotal(kpi.id, mIdx, num);
                                      }
                                    }
                                  }}
                                  className="w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:border-blue-600 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  title={lang === 'am' ? 'ዝርዝር ክንውን ጨምር' : 'Add detailed entry'}
                                  onClick={() => onOpenLogModal(kpi.id, mIdx)}
                                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Live Remaining Monthly Gap Line */}
                              {mTarget > 0 && mInfo.hasData && (
                                <div className="mt-1 text-[10px] font-mono tabular-nums">
                                  {isRate ? (
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {kpi.direction === 'lower_better'
                                        ? mInfo.value <= mTarget
                                          ? lang === 'am'
                                            ? 'በገደብ ውስጥ (On Target)'
                                            : 'Within Limit'
                                          : `${lang === 'am' ? 'ከገደብ በላይ' : 'Above limit'} (+${(
                                              mInfo.value - mTarget
                                            ).toFixed(2)})`
                                        : monthGap <= 0
                                          ? lang === 'am'
                                            ? 'እቅድ ተሳክቷል'
                                            : 'Target Met'
                                          : `${lang === 'am' ? 'ቀሪ፦ ' : 'Gap: '}${formatKpiValue(
                                              monthGap,
                                              kpi.unit,
                                              true
                                            )}`}
                                    </span>
                                  ) : monthGap <= 0 ? (
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      <span>
                                        {lang === 'am' ? 'ተሳክቷል' : 'Met'}
                                        {monthGap < 0
                                          ? ` (+${formatKpiValue(
                                              Math.abs(monthGap),
                                              kpi.unit,
                                              true
                                            )})`
                                          : ''}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {lang === 'am' ? 'ቀሪ፦ ' : 'Rem: '}
                                      <strong className="text-slate-700 dark:text-slate-300">
                                        {formatKpiValue(monthGap, kpi.unit, true)}
                                      </strong>
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Quarter Summary Column */}
                        {selectedPeriod !== 'ALL' && (
                          <td className="px-3 py-4 text-right align-top bg-slate-50/60 dark:bg-slate-800/25 font-mono tabular-nums whitespace-nowrap">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {qActualInfo.hasData
                                ? formatKpiValue(qActualInfo.actual, kpi.unit, true)
                                : '—'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              / {formatKpiValue(qTarget, kpi.unit, true)}
                            </div>
                            {qActualInfo.hasData && qTarget > 0 && (
                              <div className={`mt-1 text-[11px] font-bold ${getPctColorClass(qAchPct)}`}>
                                {qAchPct.toFixed(1)}%
                              </div>
                            )}
                          </td>
                        )}

                        {/* Annual Assigned Plan vs YTD/FY Actual Column */}
                        <td className="py-4 pl-3 pr-5 text-right align-top bg-slate-50/90 dark:bg-slate-800/40 font-mono tabular-nums whitespace-nowrap">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {annualActualInfo.hasData
                              ? formatKpiValue(annualActualInfo.actual, kpi.unit, true)
                              : '—'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            / {formatKpiValue(kpi.personalAnnualTarget, kpi.unit, true)}
                          </div>
                          {annualActualInfo.hasData && kpi.personalAnnualTarget > 0 && (
                            <div
                              className={`mt-1 text-[11px] font-bold ${getPctColorClass(
                                annualAchPct
                              )}`}
                            >
                              {annualAchPct.toFixed(1)}%
                            </div>
                          )}
                          {!isRate && annualRemaining > 0 && (
                            <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                              {lang === 'am' ? 'ቀሪ ዓመታዊ፦ ' : 'Rem FY: '}
                              {formatKpiValue(annualRemaining, kpi.unit, true)}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* ==================================================================== */
        /* ACTIVITY LOGS AUDIT TABLE WITH PERSONAL PLAN IMPACT %                */
        /* ==================================================================== */
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የተመዘገቡ የዕለት እና ወርሃዊ ክንውኖች ዝርዝር'
                  : 'Recorded Performance Entries & Plan Impact'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'እያንዳንዱ የተመዘገበ ክንውን ከወርሃዊ እና ዓመታዊ የግል እቅድዎ ምን ያህል መቶኛ (%) እንዳሳካ ያሳያል።'
                  : 'Chronological audit trail showing each entry’s contribution toward your Monthly and Annual Assigned Plan.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterKpiId}
                onChange={(e) => setFilterKpiId(e.target.value)}
                className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">{lang === 'am' ? 'ሁሉም KPIs' : 'All KPIs'}</option>
                {kpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code} — {k.name.split('(')[0].trim()}
                  </option>
                ))}
              </select>

              <select
                value={filterMonthIdx}
                onChange={(e) => setFilterMonthIdx(e.target.value)}
                className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="all">{lang === 'am' ? 'ሁሉም ወራት' : 'All Months'}</option>
                {fiscalMonths.map((m) => (
                  <option key={m.index} value={m.index}>
                    {lang === 'am' ? m.fullAm : m.fullEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center">
              <Calendar className="mx-auto h-7 w-7 text-slate-400" />
              <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {lang === 'am' ? 'ምንም የተመዘገበ ክንውን የለም' : 'No Actual Entries Found'}
              </p>
              <button
                type="button"
                onClick={() => onOpenLogModal(undefined, profile.activeMonthIndex)}
                className="mt-4 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'የመጀመሪያ ክንውን መዝግብ' : 'Log First Entry'}</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <th className="py-3 pl-5 pr-3">{lang === 'am' ? 'ቀን እና ወር' : 'Date & Month'}</th>
                    <th className="px-3 py-3">{lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}</th>
                    <th className="px-3 py-3 text-right">{lang === 'am' ? 'የተመዘገበ መጠን' : 'Recorded Value'}</th>
                    <th className="px-3 py-3 text-right">
                      {lang === 'am' ? 'የወሩ እቅድ እና ድርሻ %' : 'Month Plan & Impact'}
                    </th>
                    <th className="px-3 py-3">{lang === 'am' ? 'ማብራሪያ / ማስታወሻ' : 'Note / Reference'}</th>
                    <th className="py-3 pl-3 pr-5 text-right">{lang === 'am' ? 'አጥፋ' : 'Remove'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredLogs.map((entry) => {
                    const kpi = kpis.find((k) => k.id === entry.kpiId);
                    const monthMeta = fiscalMonths[entry.monthIndex];
                    const mTarget = kpi ? kpi.monthlyTargets[entry.monthIndex] ?? 0 : 0;
                    const isRate =
                      kpi?.aggregation === 'average' || kpi?.direction === 'lower_better';
                    const monthSharePct =
                      kpi && mTarget > 0
                        ? isRate
                          ? computeAchievementPct(kpi, mTarget, entry.value, true)
                          : (entry.value / mTarget) * 100
                        : null;
                    const annualSharePct =
                      kpi && !isRate && kpi.personalAnnualTarget > 0
                        ? (entry.value / kpi.personalAnnualTarget) * 100
                        : null;

                    return (
                      <tr
                        key={entry.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 pl-5 pr-3 whitespace-nowrap">
                          <div className="font-mono font-semibold text-slate-900 dark:text-white">
                            {entry.date}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {monthMeta
                              ? lang === 'am'
                                ? monthMeta.fullAm
                                : monthMeta.fullEn
                              : ''}
                          </div>
                        </td>
                        <td className="px-3 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                          {kpi ? `${kpi.code} · ${kpi.name}` : entry.kpiId}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                          {kpi ? formatKpiValue(entry.value, kpi.unit) : entry.value}
                        </td>
                        <td className="px-3 py-3.5 text-right font-mono tabular-nums whitespace-nowrap">
                          {kpi && mTarget > 0 ? (
                            <div>
                              <div className="text-slate-700 dark:text-slate-300">
                                {monthSharePct !== null ? (
                                  <strong className="text-blue-700 dark:text-blue-400">
                                    {monthSharePct.toFixed(1)}%
                                  </strong>
                                ) : null}{' '}
                                <span className="text-[11px] text-slate-500">
                                  / {formatKpiValue(mTarget, kpi.unit, true)}
                                </span>
                              </div>
                              {annualSharePct !== null && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                  {annualSharePct.toFixed(1)}%{' '}
                                  {lang === 'am' ? 'ከዓመታዊ እቅድ' : 'of Annual Plan'}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-slate-600 dark:text-slate-400 max-w-xs">
                          {entry.note || '—'}
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right whitespace-nowrap">
                          {confirmDeleteLogId === entry.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteLog(entry.id);
                                  setConfirmDeleteLogId(null);
                                }}
                                className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                              >
                                {lang === 'am' ? 'አጥፋ' : 'Delete'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteLogId(null)}
                                className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                              >
                                {lang === 'am' ? 'ተው' : 'Cancel'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteLogId(entry.id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 cursor-pointer"
                              aria-label="Delete log"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
