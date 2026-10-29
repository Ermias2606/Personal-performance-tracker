import React from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Plus,
  TrendingUp,
} from 'lucide-react';
import {
  ActualLogEntry,
  EmployeeProfile,
  KpiCategoryDef,
  KpiItem,
} from '../types/kpi';
import { computeDailyWeeklyPace, DailyPaceStatus } from '../utils/analytics';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';
import { formatKpiValue, getCategoryLabel, getFiscalMonths } from '../utils/i18n';

interface DailyWeeklyPaceSectionProps {
  profile: EmployeeProfile;
  kpis: KpiItem[];
  logs: ActualLogEntry[];
  categories: KpiCategoryDef[];
  targetMonthIndex: number;
  workingDaysPerMonth: number;
  elapsedWorkingDays: number;
  holidayDeductedCount?: number;
  onUpdateWorkingDays?: (workingDaysPerMonth: number, elapsedWorkingDays: number) => void;
  onOpenWorkingCalendar?: (monthIndex: number) => void;
  onQuickLogForKpi?: (kpiId: string, monthIndex: number) => void;
  compactForReport?: boolean;
}

export const DailyWeeklyPaceSection: React.FC<DailyWeeklyPaceSectionProps> = ({
  profile,
  kpis,
  logs,
  categories,
  targetMonthIndex,
  workingDaysPerMonth,
  elapsedWorkingDays,
  holidayDeductedCount = 0,
  onUpdateWorkingDays,
  onOpenWorkingCalendar,
  onQuickLogForKpi,
  compactForReport = false,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const monthMeta = fiscalMonths[targetMonthIndex] || fiscalMonths[0];
  const todayIso = new Date().toISOString().slice(0, 10);

  const pace = computeDailyWeeklyPace(
    kpis,
    logs,
    targetMonthIndex,
    workingDaysPerMonth,
    elapsedWorkingDays
  );

  const renderPaceLabel = (status: DailyPaceStatus) => {
    if (status === 'met') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{lang === 'am' ? 'ወርሃዊ እቅድ ተሳክቷል' : 'Monthly Target Met'}</span>
        </span>
      );
    }
    if (status === 'ahead') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>{lang === 'am' ? 'ከዕለታዊ ፍጥነት በላይ' : 'Ahead of Daily Pace'}</span>
        </span>
      );
    }
    if (status === 'on_pace') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 whitespace-nowrap">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />
          <span>{lang === 'am' ? 'በዕለታዊ ፍጥነት ላይ' : 'On Daily Pace'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>{lang === 'am' ? 'ፍጥነት መጨመር ይሻል' : 'Accelerate Daily Pace'}</span>
      </span>
    );
  };

  return (
    <div
      className={
        compactForReport
          ? 'border-b border-slate-200 dark:border-slate-800 pb-7 print-break-avoid'
          : 'rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden'
      }
    >
      {/* Header & Working Days Controls */}
      <div
        className={
          compactForReport
            ? 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4'
            : 'flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 lg:flex-row lg:items-center lg:justify-between'
        }
      >
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? `ዕለታዊ እና ሳምንታዊ የአፈጻጸም ግብ — ${monthMeta.fullAm}`
                : `Daily & Weekly Execution Pace — ${monthMeta.fullEn}`}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>
              {lang === 'am'
                ? `ቀሪ የስራ ቀናት፦ ${pace.remainingWorkingDays}/${pace.workingDaysPerMonth} ቀናት`
                : `${pace.remainingWorkingDays}/${pace.workingDaysPerMonth} net floor days left`}
            </span>
            {holidayDeductedCount > 0 && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  {lang === 'am'
                    ? `${holidayDeductedCount} በዓል/ፈቃድ ተቀንሷል`
                    : `${holidayDeductedCount} holiday/leave deducted`}
                </span>
              </>
            )}
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              {lang === 'am'
                ? `ያለፈው የወሩ ጊዜ፦ ${pace.expectedTimePct.toFixed(0)}%`
                : `Month time elapsed: ${pace.expectedTimePct.toFixed(0)}%`}
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>{formatEthiopianDate(todayIso, lang)}</span>
          </p>
        </div>

        {(onUpdateWorkingDays || onOpenWorkingCalendar) && (
          <div className="no-print flex flex-wrap items-center gap-2.5 text-xs">
            {onUpdateWorkingDays && (
              <>
                <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span>{lang === 'am' ? 'የተጣራ ቀናት፦' : 'Net Days:'}</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={pace.workingDaysPerMonth}
                    onChange={(e) => {
                      const nextTotal = Math.max(1, Math.min(31, Number(e.target.value) || 26));
                      onUpdateWorkingDays(
                        nextTotal,
                        Math.min(nextTotal, pace.elapsedWorkingDays)
                      );
                    }}
                    className="w-14 min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-center font-mono font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  />
                </label>

                <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <span>{lang === 'am' ? 'ያለፉ፦' : 'Elapsed:'}</span>
                  <input
                    type="number"
                    min={0}
                    max={pace.workingDaysPerMonth}
                    value={pace.elapsedWorkingDays}
                    onChange={(e) => {
                      const nextElapsed = Math.max(
                        0,
                        Math.min(pace.workingDaysPerMonth, Number(e.target.value) || 0)
                      );
                      onUpdateWorkingDays(pace.workingDaysPerMonth, nextElapsed);
                    }}
                    className="w-14 min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-center font-mono font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  />
                </label>
              </>
            )}

            {onOpenWorkingCalendar && (
              <button
                type="button"
                onClick={() => onOpenWorkingCalendar(targetMonthIndex)}
                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:border-blue-600 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'በዓላት እና ፈቃድ (ዓ.ም)' : 'Holidays & Leave (ዓ.ም)'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pace Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <th className="py-3 pl-5 pr-3">{lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}</th>
              <th className="px-3 py-3 text-right">{lang === 'am' ? 'ወርሃዊ እቅድ' : 'Month Target'}</th>
              <th className="px-3 py-3 text-right">{lang === 'am' ? 'እስካሁን ክንውን' : 'MTD Actual'}</th>
              <th className="px-3 py-3 text-right">{lang === 'am' ? 'ቀሪ ወርሃዊ ግብ' : 'Remaining Gap'}</th>
              <th className="px-3 py-3 text-right">
                {lang === 'am' ? 'የሚጠበቅ ሳምንታዊ ግብ' : 'Required / Week'}
              </th>
              <th className="px-3 py-3 text-right">
                {lang === 'am' ? 'የሚጠበቅ ዕለታዊ ግብ' : 'Required / Day'}
              </th>
              <th className="px-3 py-3 text-right">
                {lang === 'am' ? 'የአሁን ዕለታዊ አማካይ' : 'Current / Day'}
              </th>
              <th className="px-3 py-3">{lang === 'am' ? 'የፍጥነት ሁኔታ' : 'Pace Status'}</th>
              {onQuickLogForKpi && !compactForReport && (
                <th className="no-print py-3 pl-2 pr-5 text-right">
                  {lang === 'am' ? 'ዛሬ መዝግብ' : 'Log'}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {pace.rows.map((row) => {
              const isRate =
                row.kpi.aggregation === 'average' || row.kpi.direction === 'lower_better';
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
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {formatKpiValue(row.monthTarget, row.kpi.unit, true)}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                    {row.hasData
                      ? `${formatKpiValue(row.monthActual, row.kpi.unit, true)} (${row.achievementPct.toFixed(0)}%)`
                      : '—'}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {row.remainingGap > 0
                      ? formatKpiValue(row.remainingGap, row.kpi.unit, true)
                      : lang === 'am'
                        ? 'ተሟልቷል'
                        : '0 (Met)'}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {isRate
                      ? formatKpiValue(row.requiredWeeklyTarget, row.kpi.unit)
                      : row.remainingGap > 0
                        ? formatKpiValue(row.requiredWeeklyTarget, row.kpi.unit, true)
                        : '—'}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                    {isRate
                      ? formatKpiValue(row.requiredDailyTarget, row.kpi.unit)
                      : row.remainingGap > 0
                        ? formatKpiValue(row.requiredDailyTarget, row.kpi.unit, true)
                        : '—'}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {row.hasData
                      ? formatKpiValue(row.actualDailyRunRate, row.kpi.unit, true)
                      : '—'}
                  </td>

                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {renderPaceLabel(row.paceStatus)}
                  </td>

                  {onQuickLogForKpi && !compactForReport && (
                    <td className="no-print py-3.5 pl-2 pr-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onQuickLogForKpi(row.kpi.id, targetMonthIndex)}
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                        <span>{lang === 'am' ? 'መዝግብ' : 'Log'}</span>
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
