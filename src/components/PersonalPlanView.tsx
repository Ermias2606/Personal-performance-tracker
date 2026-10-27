import React, { useEffect, useState } from 'react';
import { ArrowRight, Calculator, CheckCircle2, Info } from 'lucide-react';
import {
  ActiveTab,
  EmployeeProfile,
  KpiCategoryDef,
  KpiItem,
  QuarterKey,
} from '../types/kpi';
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
  kpis: KpiItem[];
  categories: KpiCategoryDef[];
  focusedKpiId: string | null;
  onSaveKpi: (kpi: KpiItem) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

export const PersonalPlanView: React.FC<PersonalPlanViewProps> = ({
  profile,
  kpis,
  categories,
  focusedKpiId,
  onSaveKpi,
  onNavigateTab,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const [selectedKpiId, setSelectedKpiId] = useState<string>(
    focusedKpiId || kpis[0]?.id || ''
  );

  useEffect(() => {
    if (focusedKpiId && kpis.some((k) => k.id === focusedKpiId)) {
      setSelectedKpiId(focusedKpiId);
    } else if (!kpis.some((k) => k.id === selectedKpiId) && kpis[0]) {
      setSelectedKpiId(kpis[0].id);
    }
  }, [focusedKpiId, kpis, selectedKpiId]);

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

  const branchSharePct =
    activeKpi.branchAnnualTarget > 0
      ? (activeKpi.personalAnnualTarget / activeKpi.branchAnnualTarget) * 100
      : 0;

  const isAverageMode = activeKpi.aggregation === 'average';

  const quartersAggregate = isAverageMode
    ? QUARTERS.reduce((s, q) => s + (activeKpi.quarterlyTargets[q] || 0), 0) / 4
    : QUARTERS.reduce((s, q) => s + (activeKpi.quarterlyTargets[q] || 0), 0);

  const monthsAggregate = isAverageMode
    ? activeKpi.monthlyTargets.reduce((s, m) => s + (m || 0), 0) / 12
    : activeKpi.monthlyTargets.reduce((s, m) => s + (m || 0), 0);

  const quartersDiff = Math.abs(quartersAggregate - activeKpi.personalAnnualTarget);
  const monthsDiff = Math.abs(monthsAggregate - activeKpi.personalAnnualTarget);

  const updateAnnualManual = (raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    onSaveKpi({ ...activeKpi, personalAnnualTarget: val });
  };

  const updateSharePercentManual = (raw: string) => {
    const pct = Math.max(0, Number(raw) || 0);
    const computedAnnual =
      Math.round(((activeKpi.branchAnnualTarget * pct) / 100) * 100) / 100;
    onSaveKpi({ ...activeKpi, personalAnnualTarget: computedAnnual });
  };

  const updateQuarterManual = (q: QuarterKey, raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    onSaveKpi({
      ...activeKpi,
      quarterlyTargets: {
        ...activeKpi.quarterlyTargets,
        [q]: val,
      },
    });
  };

  const updateMonthManual = (monthIndex: number, raw: string) => {
    const val = Math.max(0, Number(raw) || 0);
    const nextMonths = [...activeKpi.monthlyTargets];
    nextMonths[monthIndex] = val;
    onSaveKpi({
      ...activeKpi,
      monthlyTargets: nextMonths,
    });
  };

  const distributeAnnualToQuarters = () => {
    if (isAverageMode) {
      const v = activeKpi.personalAnnualTarget;
      onSaveKpi({
        ...activeKpi,
        quarterlyTargets: { Q1: v, Q2: v, Q3: v, Q4: v },
      });
      return;
    }
    const base = Math.floor((activeKpi.personalAnnualTarget / 4) * 100) / 100;
    const rem = Math.round((activeKpi.personalAnnualTarget - base * 3) * 100) / 100;
    onSaveKpi({
      ...activeKpi,
      quarterlyTargets: { Q1: base, Q2: base, Q3: base, Q4: rem },
    });
  };

  const distributeQuartersToMonths = () => {
    const nextMonths = [...activeKpi.monthlyTargets];
    for (const q of QUARTERS) {
      const indices = QUARTER_MONTH_INDICES[q];
      const qTarget = activeKpi.quarterlyTargets[q] || 0;
      if (isAverageMode) {
        indices.forEach((idx) => {
          nextMonths[idx] = qTarget;
        });
      } else {
        const mBase = Math.floor((qTarget / 3) * 100) / 100;
        const mLast = Math.round((qTarget - mBase * 2) * 100) / 100;
        nextMonths[indices[0]] = mBase;
        nextMonths[indices[1]] = mBase;
        nextMonths[indices[2]] = mLast;
      }
    }
    onSaveKpi({
      ...activeKpi,
      monthlyTargets: nextMonths,
    });
  };

  const rollupMonthsToQuartersAndAnnual = () => {
    const nextQuarters: Record<QuarterKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const q of QUARTERS) {
      const indices = QUARTER_MONTH_INDICES[q];
      const sum = indices.reduce((s, idx) => s + (activeKpi.monthlyTargets[idx] || 0), 0);
      nextQuarters[q] = isAverageMode
        ? Math.round((sum / 3) * 100) / 100
        : Math.round(sum * 100) / 100;
    }
    const annualTotal = isAverageMode
      ? Math.round(
          (QUARTERS.reduce((s, q) => s + nextQuarters[q], 0) / 4) * 100
        ) / 100
      : Math.round(QUARTERS.reduce((s, q) => s + nextQuarters[q], 0) * 100) / 100;

    onSaveKpi({
      ...activeKpi,
      quarterlyTargets: nextQuarters,
      personalAnnualTarget: annualTotal,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'am'
              ? '2. የግል የተሰጠኝ እቅድ — ዓመታዊ፣ ሩብ ዓመት እና ወርሃዊ'
              : '2. Personal Assigned Plan — Annual, Quarterly & Monthly'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? 'ከቅርንጫፉ እቅድ ውስጥ ለእርስዎ የተሰጠውን ዓመታዊ፣ የሩብ ዓመት (Quarterly) እና ወርሃዊ (Monthly) እቅድ በእጅ (Manually) ማስገባት ወይም እኩል ማካፈል ይችላሉ።'
              : 'Manually input or adjust your assigned Annual, Quarterly (Q1–Q4), and Monthly (12-month) targets derived from the Branch Plan.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('actuals')}
          className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <span>{lang === 'am' ? 'ወደ ክንውን መመዝገቢያ ቀጥል' : 'Next: Enter Actuals'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* KPI Selector Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {kpis.map((k) => {
          const active = k.id === activeKpi.id;
          return (
            <button
              key={k.id}
              type="button"
              onClick={() => setSelectedKpiId(k.id)}
              className={`min-h-[40px] rounded-lg border px-3.5 py-2 text-left text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <span className="font-mono opacity-75 mr-1.5">{k.code}</span>
              <span>{k.name.split('(')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {/* Selected KPI Planning Workspace */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-8">
        {/* Section A: Branch Reference & Manual Annual Plan */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeKpi.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span>{activeKpi.code}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{getCategoryLabel(activeKpi.category, lang, categories)}</span>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>{lang === 'am' ? `ክብደት ${activeKpi.weight}%` : `Weight ${activeKpi.weight}%`}</span>
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
              {lang === 'am' ? 'የቅርንጫፉ አጠቃላይ ዓመታዊ እቅድ፦ ' : 'Branch Overall Annual Plan: '}
              <strong className="font-mono text-sm text-slate-900 dark:text-white tabular-nums">
                {formatKpiValue(activeKpi.branchAnnualTarget, activeKpi.unit)}
              </strong>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am'
                  ? 'የእኔ ዓመታዊ እቅድ (Annual Plan — በእጅ ማስገቢያ)'
                  : 'My Annual Assigned Target (Manual Input)'}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={activeKpi.personalAnnualTarget}
                  onChange={(e) => updateAnnualManual(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                />
                <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                  {activeKpi.unit}
                </span>
              </div>
            </div>

            {!isAverageMode && activeKpi.branchAnnualTarget > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am'
                    ? 'ከቅርንጫፍ እቅድ የእኔ ድርሻ በመቶኛ (%)'
                    : 'Share of Branch Annual Plan (%)'}
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={Math.round(branchSharePct * 100) / 100}
                    onChange={(e) => updateSharePercentManual(e.target.value)}
                    className="w-full min-h-[44px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 font-mono text-sm font-semibold tabular-nums text-blue-800 dark:text-blue-400 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                  />
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    %
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col justify-end gap-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'ፈጣን የእቅድ ማከፋፈያ አጋዥ (አማራጭ)' : 'Quick Cascade Helpers (Optional)'}
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={distributeAnnualToQuarters}
                  className="min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {lang === 'am' ? 'ዓመታዊ → 4 ሩብ ዓመት አካፍል' : 'Split Annual → 4 Quarters'}
                </button>
                <button
                  type="button"
                  onClick={distributeQuartersToMonths}
                  className="min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {lang === 'am' ? 'ሩብ ዓመት → 12 ወራት አካፍል' : 'Split Quarters → 12 Months'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Manual Quarterly Plan Inputs (Q1, Q2, Q3, Q4) */}
        <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የሩብ ዓመት እቅድ ማስገቢያ (Quarterly Targets — Q1 እስከ Q4)'
                  : 'Quarterly Assigned Targets (Manual Input — Q1 to Q4)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'እያንዳንዱን የሩብ ዓመት እቅድ በቀጥታ በእጅ መጻፍ ወይም ማስተካከል ይችላሉ።'
                  : 'Enter or customize each quarter target manually below.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono tabular-nums">
              {quartersDiff < 0.05 ? (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>
                    {lang === 'am' ? 'ከዓመታዊ እቅድ ጋር እኩል ነው፦ ' : 'Matches Annual: '}
                    {formatKpiValue(quartersAggregate, activeKpi.unit)}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <Info className="h-3.5 w-3.5" />
                  <span>
                    {lang === 'am' ? 'የ4 ሩብ ዓመት ድምር፦ ' : 'Quarterly Aggregate: '}
                    {formatKpiValue(quartersAggregate, activeKpi.unit)} (
                    {lang === 'am' ? 'ዓመታዊ፦ ' : 'Annual: '}
                    {formatKpiValue(activeKpi.personalAnnualTarget, activeKpi.unit)})
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUARTERS.map((q) => {
              const monthNames = QUARTER_MONTH_INDICES[q]
                .map((idx) => (lang === 'am' ? fiscalMonths[idx].shortAm : fiscalMonths[idx].shortEn))
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
                      onChange={(e) => updateQuarterManual(q, e.target.value)}
                      className="w-full min-h-[42px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section C: Manual Monthly Plan Inputs (12 Months) */}
        <div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'ወርሃዊ እቅድ ማስገቢያ (Monthly Targets — 12 ወራት በእጅ ማስገቢያ)'
                  : 'Monthly Assigned Targets (12 Months Manual Input)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'የእያንዳንዱን ወር እቅድ በተናጠል ማስገባት ይችላሉ፤ ከፈለጉም ከወራት ወደ ሩብ ዓመት እና ዓመታዊ ማስላት ይችላሉ።'
                  : 'Type exact targets for every single month, or roll monthly sums up to Quarterly and Annual.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`text-xs font-mono font-semibold tabular-nums ${
                  monthsDiff < 0.1
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {lang === 'am' ? 'የ12 ወራት ድምር፦ ' : '12-Month Aggregate: '}
                {formatKpiValue(monthsAggregate, activeKpi.unit)}
              </span>

              <button
                type="button"
                onClick={rollupMonthsToQuartersAndAnnual}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 text-xs font-semibold text-blue-800 dark:text-blue-300 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Calculator className="h-3.5 w-3.5" />
                <span>
                  {lang === 'am'
                    ? 'ከ12 ወራት → ሩብ ዓመት እና ዓመታዊ ደምር'
                    : 'Sum Months → Quarters & Annual'}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {QUARTERS.map((q) => {
              const indices = QUARTER_MONTH_INDICES[q];
              const qMonthSum = isAverageMode
                ? indices.reduce((s, idx) => s + (activeKpi.monthlyTargets[idx] || 0), 0) / 3
                : indices.reduce((s, idx) => s + (activeKpi.monthlyTargets[idx] || 0), 0);

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
                      return (
                        <div key={mIdx}>
                          <label
                            htmlFor={`month-plan-${mIdx}`}
                            className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400"
                          >
                            {lang === 'am' ? meta.fullAm : meta.fullEn}
                          </label>
                          <input
                            id={`month-plan-${mIdx}`}
                            type="number"
                            step="any"
                            min="0"
                            value={activeKpi.monthlyTargets[mIdx] ?? 0}
                            onChange={(e) => updateMonthManual(mIdx, e.target.value)}
                            className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
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
    </div>
  );
};
