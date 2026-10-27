import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  History,
  Printer,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategoryDef,
  PeriodScope,
  QuarterKey,
} from '../types/kpi';
import {
  computeYoYComparison,
  getStatusLabel,
  KpiEvaluatedRow,
  PortfolioSummary,
} from '../utils/analytics';
import {
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  QUARTERS,
} from '../utils/i18n';
import { exportReportAsCsv } from '../storage/offlineDb';
import { StatusIndicator } from './OverviewView';
import { CumulativeTrendChart } from './CumulativeTrendChart';
import { DailyWeeklyPaceSection } from './DailyWeeklyPaceSection';

interface ReportsViewProps {
  profile: EmployeeProfile;
  activeFy: FiscalYearWorkspace;
  allFiscalYears: FiscalYearWorkspace[];
  categories: KpiCategoryDef[];
  summary: PortfolioSummary;
  scope: PeriodScope;
  onChangeScope: (scope: PeriodScope) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  profile,
  activeFy,
  allFiscalYears,
  categories,
  summary,
  scope,
  onChangeScope,
}) => {
  const lang = profile.language;
  const kpis = activeFy.kpis;
  const logs = activeFy.actualLogs;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const remainingMonthsCount = Math.max(0, 12 - (profile.activeMonthIndex + 1));

  const otherFiscalYears = useMemo(
    () => allFiscalYears.filter((fy) => fy.id !== activeFy.id),
    [allFiscalYears, activeFy.id]
  );

  const [compareFyId, setCompareFyId] = useState<string>(otherFiscalYears[0]?.id || '');

  useEffect(() => {
    if (!otherFiscalYears.some((f) => f.id === compareFyId)) {
      setCompareFyId(otherFiscalYears[0]?.id || '');
    }
  }, [otherFiscalYears, compareFyId]);

  const yoyComparison = useMemo(() => {
    const prior =
      otherFiscalYears.find((f) => f.id === compareFyId) || otherFiscalYears[0];
    if (!prior) return null;
    return computeYoYComparison(activeFy, prior, profile, scope, categories);
  }, [activeFy, otherFiscalYears, compareFyId, profile, scope, categories]);

  const topStrengths = [...summary.rows]
    .filter((r) => r.hasActualData && r.achievementPct >= 90)
    .sort((a, b) => b.achievementPct - a.achievementPct);

  const priorityGaps = [...summary.rows]
    .filter((r) => r.periodTarget > 0 && r.achievementPct < 90)
    .sort((a, b) => a.achievementPct - b.achievementPct);

  const handleExportCsv = () => {
    const headers =
      lang === 'am'
        ? [
            'ኮድ',
            'የKPI ስም',
            'ዘርፍ',
            'መለኪያ',
            'ክብደት (%)',
            'የቅርንጫፍ ዓመታዊ እቅድ',
            'የእኔ ዓመታዊ እቅድ',
            'ከቅርንጫፍ ድርሻ (%)',
            `የጊዜው እቅድ (${summary.scopeLabel})`,
            'ክንውን (Actual)',
            'ልዩነት (Variance)',
            'አፈጻጸም (%)',
            'የተገኘ ነጥብ (Weighted Score)',
            ...(yoyComparison
              ? [
                  `የቀድሞ ዓመት ክንውን (${yoyComparison.priorYearLabel})`,
                  'ዓመታዊ እድገት YoY (%)',
                ]
              : []),
            'ዓመታዊ ቀሪ እቅድ (Gap)',
            'በቀሪ ወራት በየወሩ የሚጠበቅ (Run-Rate)',
            'ሁኔታ',
          ]
        : [
            'Code',
            'KPI Name',
            'Category',
            'Unit',
            'Weight (%)',
            'Branch Annual Plan',
            'My Annual Plan',
            'Branch Share (%)',
            `Period Target (${summary.scopeLabel})`,
            'Actual',
            'Variance',
            'Achievement (%)',
            'Weighted Score',
            ...(yoyComparison
              ? [
                  `Prior Year Actual (${yoyComparison.priorYearLabel})`,
                  'YoY Growth (%)',
                ]
              : []),
            'Annual Remaining Gap',
            'Required Monthly Run-Rate',
            'Status',
          ];

    const csvRows = summary.rows.map((r) => {
      const yoyRow = yoyComparison?.rows.find((yr) => yr.currentKpi.id === r.kpi.id);
      return [
        r.kpi.code,
        r.kpi.name,
        getCategoryLabel(r.kpi.category, lang, categories),
        r.kpi.unit,
        r.kpi.weight,
        r.branchAnnualTarget,
        r.personalAnnualTarget,
        Number(r.branchSharePct.toFixed(2)),
        Number(r.periodTarget.toFixed(2)),
        Number(r.periodActual.toFixed(2)),
        Number(r.variance.toFixed(2)),
        Number(r.achievementPct.toFixed(2)),
        Number(r.weightedScore.toFixed(2)),
        ...(yoyComparison
          ? [
              yoyRow && yoyRow.priorHasData ? Number(yoyRow.priorActual.toFixed(2)) : '',
              yoyRow && yoyRow.yoyGrowthPct !== null
                ? Number(yoyRow.yoyGrowthPct.toFixed(2))
                : '',
            ]
          : []),
        Number(r.annualRemainingGap.toFixed(2)),
        r.requiredMonthlyRunRate !== null ? Number(r.requiredMonthlyRunRate.toFixed(2)) : '',
        getStatusLabel(r.status, lang),
      ];
    });

    const dateStr = new Date().toISOString().slice(0, 10);
    exportReportAsCsv(headers, csvRows, `kpi-performance-report-${dateStr}.csv`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const executiveSummaryText =
    lang === 'am'
      ? `በ${summary.scopeLabel} የምዘና ወቅት ${profile.employeeName} ከተቀመጡት ${summary.rows.length} የKPI መለኪያዎች ውስጥ አጠቃላይ ${summary.normalizedScorePct.toFixed(
          1
        )}% (${summary.totalWeightedPoints.toFixed(1)} ከ ${
          summary.totalWeight
        } ነጥብ) በማስመዝገብ "${summary.overallGrade.labelAm}" ደረጃ ላይ ይገኛሉ።${
          yoyComparison
            ? ` ከ${yoyComparison.priorYearLabel} ተመሳሳይ ወቅት (${yoyComparison.priorScorePct.toFixed(
                1
              )}%) ጋር ሲነጻጸር የ${yoyComparison.scoreDeltaPts >= 0 ? '+' : ''}${yoyComparison.scoreDeltaPts.toFixed(
                1
              )} ነጥብ ለውጥ አሳይቷል።`
            : ''
        } ከሁሉም መለኪያዎች ውስጥ ${
          summary.exceedingCount
        } መለኪያዎች ከ100% በላይ የተከናወኑ ሲሆን፣ ${
          summary.atRiskCount + summary.criticalCount
        } መለኪያዎች ደግሞ በቀሪዎቹ ${remainingMonthsCount} ወራት ልዩ ትኩረት እና የተጠናከረ ክትትል ይሻሉ።`
      : `For the evaluated period (${summary.scopeLabel}), ${profile.employeeName} achieved an overall weighted KPI score of ${summary.normalizedScorePct.toFixed(
          1
        )}% (${summary.totalWeightedPoints.toFixed(1)} out of ${
          summary.totalWeight
        } weighted points), earning an appraisal classification of "${
          summary.overallGrade.labelEn
        }".${
          yoyComparison
            ? ` Compared against ${yoyComparison.priorYearLabel} (${yoyComparison.priorScorePct.toFixed(
                1
              )}%), portfolio performance shifted by ${
                yoyComparison.scoreDeltaPts >= 0 ? '+' : ''
              }${yoyComparison.scoreDeltaPts.toFixed(1)} pts.`
            : ''
        } Across ${summary.rows.length} tracked indicators, ${
          summary.exceedingCount
        } KPIs met or exceeded 100% of plan, while ${
          summary.atRiskCount + summary.criticalCount
        } indicators require focused execution across the remaining ${remainingMonthsCount} fiscal months.`;

  const showPaceInReport = scope.type === 'month' || scope.type === 'ytd';
  const paceMonthIdx =
    scope.type === 'month' ? scope.monthIndex : activeFy.activeMonthIndex;

  return (
    <div className="space-y-6">
      {/* Interactive Report Controls (Hidden in Print) */}
      <div className="no-print flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'am'
              ? '4. አጠቃላይ የአፈጻጸም ትንተና እና ሪፖርት'
              : '4. Comprehensive KPI Analysis & Appraisal Report'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? 'ወርሃዊ፣ የሩብ ዓመት ወይም ዓመታዊ ትንተና በመምረጥ ለህትመት (PDF) ወይም ለExcel (CSV) የተዘጋጀ ሪፖርት ያውጡ።'
              : 'Select any monthly, quarterly, YTD, or annual period to generate an executive appraisal report, print to PDF, or export CSV.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => onChangeScope({ type: 'ytd' })}
              className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                scope.type === 'ytd'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              YTD
            </button>
            <button
              type="button"
              onClick={() => onChangeScope({ type: 'annual' })}
              className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
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
                className={`min-h-[36px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
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
            value={scope.type === 'month' ? String(scope.monthIndex) : ''}
            onChange={(e) => {
              if (e.target.value !== '') {
                onChangeScope({ type: 'month', monthIndex: Number(e.target.value) });
              }
            }}
            className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">{lang === 'am' ? 'ወርሃዊ ሪፖርት...' : 'Monthly Report...'}</option>
            {fiscalMonths.map((m) => (
              <option key={m.index} value={m.index}>
                {lang === 'am' ? m.fullAm : m.fullEn}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>{lang === 'am' ? 'Excel (CSV) አውርድ' : 'Download CSV'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{lang === 'am' ? 'ሪፖርት አትም / PDF' : 'Print / Save PDF'}</span>
          </button>
        </div>
      </div>

      {/* Formal Report Sheet */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 print:border-slate-200 bg-white dark:bg-slate-900 print:bg-white p-6 sm:p-8 space-y-8">
        {/* Report Document Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 print:text-blue-700">
              {lang === 'am'
                ? 'የሰራተኛ የKPI አፈጻጸም ምዘና እና ትንተና ሪፖርት'
                : 'Personal Employee KPI Performance Appraisal Report'}
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white print:text-slate-900">
              {profile.employeeName}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 print:text-slate-600">
              <span>{profile.roleTitle}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{profile.employeeId}</span>
              <span className="mx-2" aria-hidden="true">·</span>
              <span>{profile.branchName}</span>
            </p>
          </div>

          <div className="sm:text-right text-xs text-slate-600 dark:text-slate-400 print:text-slate-600 space-y-1">
            <div>
              <span className="text-slate-400 dark:text-slate-500">
                {lang === 'am' ? 'የበጀት ዓመት፦ ' : 'Fiscal Year: '}
              </span>
              <strong className="font-semibold text-slate-900 dark:text-white print:text-slate-900">
                {profile.fiscalYearLabel}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">
                {lang === 'am' ? 'የሪፖርት ወቅት፦ ' : 'Report Horizon: '}
              </span>
              <strong className="font-semibold text-slate-900 dark:text-white print:text-slate-900">
                {summary.scopeLabel}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">
                {lang === 'am' ? 'ሪፖርት የተዘጋጀበት ቀን፦ ' : 'Generated Date: '}
              </span>
              <span className="font-mono text-slate-800 dark:text-slate-200 print:text-slate-800">
                {new Date().toISOString().slice(0, 10)}
              </span>
            </div>
          </div>
        </div>

        {/* Executive Summary & Score Banner */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-center border-b border-slate-200 dark:border-slate-800 print:border-slate-200 pb-6">
          <div className="lg:col-span-4 flex items-baseline gap-4">
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-500">
                {lang === 'am' ? 'አጠቃላይ የምዘና ውጤት' : 'Weighted Appraisal Score'}
              </div>
              <div className="mt-1 font-mono text-4xl font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                {summary.normalizedScorePct.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-400 print:text-blue-700">
                {lang === 'am'
                  ? `ደረጃ ${summary.overallGrade.code} · ${summary.overallGrade.labelAm}`
                  : `Grade ${summary.overallGrade.code} · ${summary.overallGrade.labelEn}`}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
              {lang === 'am'
                ? 'አጠቃላይ የትንተና ማጠቃለያ (Executive Summary)'
                : 'Executive Performance Summary'}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-700">
              {executiveSummaryText}
            </p>
          </div>
        </div>

        {/* 1. Historical Cumulative Progress Trend Line Chart */}
        <CumulativeTrendChart
          profile={profile}
          kpis={kpis}
          logs={logs}
          scope={scope}
          scopeLabel={summary.scopeLabel}
        />

        {/* 2. Comprehensive Analytical Table */}
        <div className="print-break-avoid">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900 mb-3">
            {lang === 'am'
              ? '2. ዝርዝር የእቅድ፣ ክንውን እና የቀሪ ወራት ትንተና ሰንጠረዥ'
              : '2. Complete Plan vs. Actual & Run-Rate Analysis'}
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 bg-slate-50 dark:bg-slate-800/70 print:bg-slate-50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-600">
                  <th className="py-2.5 pl-4 pr-2">{lang === 'am' ? 'መለኪያ (KPI)' : 'KPI'}</th>
                  <th className="px-2 py-2.5 text-right">{lang === 'am' ? 'ክብደት' : 'Wt%'}</th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'የቅርንጫፍ እቅድ' : 'Branch Plan'}
                  </th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'የእኔ እቅድ' : 'Period Plan'}
                  </th>
                  <th className="px-2 py-2.5 text-right">{lang === 'am' ? 'ክንውን' : 'Actual'}</th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'አፈጻጸም %' : 'Achv %'}
                  </th>
                  <th className="px-2 py-2.5 text-right">{lang === 'am' ? 'ነጥብ' : 'Points'}</th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'ዓመታዊ ቀሪ (Gap)' : 'Annual Gap'}
                  </th>
                  <th className="py-2.5 pl-2 pr-4">
                    {lang === 'am' ? 'ሁኔታ' : 'Appraisal'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100 text-xs">
                {summary.rows.map((r: KpiEvaluatedRow) => (
                  <tr key={r.kpi.id}>
                    <td className="py-3 pl-4 pr-2">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                        {r.kpi.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                        {r.kpi.code} · {getCategoryLabel(r.kpi.category, lang, categories)} ·{' '}
                        {lang === 'am'
                          ? `ለቅርንጫፉ የተበረከተ ${r.branchActualContributionPct.toFixed(2)}%`
                          : `Branch contrib: ${r.branchActualContributionPct.toFixed(2)}%`}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600">
                      {r.kpi.weight}%
                    </td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600 whitespace-nowrap">
                      {formatKpiValue(r.branchAnnualTarget, r.kpi.unit, true)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                      {formatKpiValue(r.periodTarget, r.kpi.unit, true)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                      {r.hasActualData ? formatKpiValue(r.periodActual, r.kpi.unit, true) : '—'}
                    </td>
                    <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900 whitespace-nowrap">
                      {r.hasActualData ? `${r.achievementPct.toFixed(1)}%` : '0.0%'}
                    </td>
                    <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                      {r.weightedScore.toFixed(2)}
                    </td>
                    <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 print:text-slate-700 whitespace-nowrap">
                      {r.annualRemainingGap > 0
                        ? formatKpiValue(r.annualRemainingGap, r.kpi.unit, true)
                        : lang === 'am'
                          ? 'ተሳክቷል'
                          : 'Met'}
                    </td>
                    <td className="py-3 pl-2 pr-4 whitespace-nowrap">
                      <StatusIndicator status={r.status} lang={lang} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 print:border-slate-200 bg-slate-50 dark:bg-slate-800/80 print:bg-slate-50 font-semibold text-xs text-slate-900 dark:text-white print:text-slate-900">
                  <td className="py-3 pl-4 pr-2">
                    {lang === 'am'
                      ? 'ጠቅላላ ድምር / አማካይ ውጤት'
                      : 'Total / Portfolio Weighted Score'}
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">
                    {summary.totalWeight}%
                  </td>
                  <td colSpan={3} />
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400 print:text-blue-700">
                    {summary.normalizedScorePct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                    {summary.totalWeightedPoints.toFixed(2)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
            {lang === 'am'
              ? '* ማስታወሻ፦ የእያንዳንዱ KPI ከፍተኛ የክብደት ነጥብ ስሌት እስከ 120% ጣሪያ (Cap) ድረስ ተሰልቷል።'
              : '* Note: Individual KPI weighted points are capped at 120% of assigned KPI weight per standard appraisal policy.'}
          </p>
        </div>

        {/* Daily & Weekly Execution Pace Breakdown (for Monthly & YTD Horizons) */}
        {showPaceInReport && (
          <DailyWeeklyPaceSection
            profile={profile}
            kpis={kpis}
            logs={logs}
            categories={categories}
            targetMonthIndex={paceMonthIdx}
            workingDaysPerMonth={activeFy.workingDaysPerMonth}
            elapsedWorkingDays={activeFy.elapsedWorkingDaysInMonth}
            compactForReport
          />
        )}

        {/* Year-over-Year (YoY) Multi-Fiscal-Year Comparison Section */}
        {yoyComparison && (
          <div className="border-t border-slate-200 dark:border-slate-800 print:border-slate-200 pt-7 print-break-avoid">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
                    {lang === 'am'
                      ? 'የበጀት ዓመታት ንጽጽር ትንተና (Year-over-Year Comparison)'
                      : 'Year-over-Year (YoY) Multi-Fiscal-Year Comparison'}
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {lang === 'am'
                    ? `${yoyComparison.currentYearLabel} ከ ${yoyComparison.priorYearLabel} ተመሳሳይ የምዘና ወቅት ጋር ሲነጻጸር`
                    : `Apples-to-apples horizon comparison: ${yoyComparison.currentYearLabel} vs. ${yoyComparison.priorYearLabel}`}
                </p>
              </div>

              {otherFiscalYears.length > 1 && (
                <div className="no-print flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    {lang === 'am' ? 'ማነጻጸሪያ ዓመት፦' : 'Compare vs:'}
                  </span>
                  <select
                    value={compareFyId}
                    onChange={(e) => setCompareFyId(e.target.value)}
                    className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer"
                  >
                    {otherFiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.fiscalYearLabel}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* YoY Summary Strip */}
            <div className="mb-4 grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800 print:border-slate-100 py-3.5 sm:grid-cols-4">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {yoyComparison.priorYearLabel}
                </div>
                <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-700 dark:text-slate-200 print:text-slate-700">
                  {yoyComparison.priorScorePct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {yoyComparison.currentYearLabel}
                </div>
                <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-blue-700 dark:text-blue-400 print:text-blue-700">
                  {yoyComparison.currentScorePct.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {lang === 'am' ? 'የአጠቃላይ ነጥብ ልዩነት' : 'YoY Portfolio Delta'}
                </div>
                <div
                  className={`mt-0.5 inline-flex items-center gap-1 font-mono text-base font-bold tabular-nums ${
                    yoyComparison.scoreDeltaPts >= 0
                      ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                      : 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                  }`}
                >
                  {yoyComparison.scoreDeltaPts >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {yoyComparison.scoreDeltaPts >= 0 ? '+' : ''}
                    {yoyComparison.scoreDeltaPts.toFixed(1)} pts
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {lang === 'am' ? 'የተዛመዱ መለኪያዎች' : 'Matched KPIs'}
                </div>
                <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-800 dark:text-slate-100 print:text-slate-800">
                  {yoyComparison.matchedCount} / {yoyComparison.rows.length}
                </div>
              </div>
            </div>

            {/* Per-KPI YoY Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 bg-slate-50 dark:bg-slate-800/70 print:bg-slate-50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-600">
                    <th className="py-2.5 pl-4 pr-2">{lang === 'am' ? 'መለኪያ (KPI)' : 'KPI'}</th>
                    <th className="px-2.5 py-2.5 text-right">
                      {lang === 'am' ? 'የቀድሞ ዓመት ክንውን' : 'Prior Actual'}
                    </th>
                    <th className="px-2.5 py-2.5 text-right">
                      {lang === 'am' ? 'የዘንድሮ ክንውን' : 'Current Actual'}
                    </th>
                    <th className="px-2.5 py-2.5 text-right">
                      {lang === 'am' ? 'የመጠን እድገት (YoY)' : 'YoY Growth'}
                    </th>
                    <th className="px-2.5 py-2.5 text-right">
                      {lang === 'am' ? 'የቀድሞ አፈጻጸም %' : 'Prior Achv %'}
                    </th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">
                      {lang === 'am' ? 'የዘንድሮ አፈጻጸም %' : 'Current Achv %'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100 text-xs">
                  {yoyComparison.rows.map((yr) => (
                    <tr key={yr.currentKpi.id}>
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                          {yr.currentKpi.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {yr.currentKpi.code}
                          {!yr.priorKpi && (
                            <span>
                              {' '}
                              · {lang === 'am' ? 'አዲስ KPI' : 'New KPI this year'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600 whitespace-nowrap">
                        {yr.priorKpi && yr.priorHasData
                          ? formatKpiValue(yr.priorActual, yr.priorKpi.unit, true)
                          : '—'}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                        {yr.currentHasData
                          ? formatKpiValue(yr.currentActual, yr.currentKpi.unit, true)
                          : '—'}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                        {yr.yoyGrowthPct !== null ? (
                          <span
                            className={
                              yr.yoyGrowthPct >= 0
                                ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                                : 'text-red-700 dark:text-red-400 print:text-red-700'
                            }
                          >
                            {yr.yoyGrowthPct >= 0 ? '+' : ''}
                            {yr.yoyGrowthPct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600 whitespace-nowrap">
                        {yr.priorKpi && yr.priorHasData ? `${yr.priorAchPct.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 pl-2.5 pr-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900 whitespace-nowrap">
                        {yr.currentHasData ? `${yr.currentAchPct.toFixed(1)}%` : '0.0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Diagnostic Insights: Strengths & Run-Rate Action Plan */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 print-break-avoid">
          {/* Strengths */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
              {lang === 'am'
                ? 'ጠንካራ አፈጻጸም የታየባቸው (≥90%)'
                : 'Strong Performing Indicators (≥90%)'}
            </h3>
            {topStrengths.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'በተመረጠው ወቅት ከ90% በላይ የደረሰ መለኪያ ገና አልተመዘገበም።'
                  : 'No KPIs have reached ≥90% in the selected period yet.'}
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100">
                {topStrengths.map((item) => (
                  <div key={item.kpi.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                        {item.kpi.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                        {item.achievementPct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                      {lang === 'am'
                        ? `ክንውን፦ ${formatKpiValue(item.periodActual, item.kpi.unit)} (ከ ${formatKpiValue(
                            item.periodTarget,
                            item.kpi.unit
                          )} እቅድ)`
                        : `Actual: ${formatKpiValue(item.periodActual, item.kpi.unit)} vs ${formatKpiValue(
                            item.periodTarget,
                            item.kpi.unit
                          )} target`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Priority Focus & Required Monthly Run-Rate */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
              {lang === 'am'
                ? `ትኩረት የሚሹ እና የቀሪ ${remainingMonthsCount} ወራት ወርሃዊ ግብ`
                : `Priority Gaps & Required Run-Rate (${remainingMonthsCount} Months Left)`}
            </h3>
            {priorityGaps.length === 0 ? (
              <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {lang === 'am'
                  ? 'እንኳን ደስ አለዎት! ሁሉም የKPI መለኪያዎች ከ90% በላይ በጥሩ አፈጻጸም ላይ ይገኛሉ።'
                  : 'All active KPIs are performing at 90% or above target.'}
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100">
                {priorityGaps.map((item) => (
                  <div key={item.kpi.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                        {item.kpi.name}
                      </span>
                      <span className="font-mono font-bold tabular-nums text-amber-700 dark:text-amber-400 print:text-amber-700">
                        {item.achievementPct.toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400 print:text-slate-600">
                      {item.requiredMonthlyRunRate !== null && item.annualRemainingGap > 0 ? (
                        lang === 'am' ? (
                          <>
                            ዓመታዊ እቅዱን ለማሳካት በቀሪ ወራት በየወሩ በአማካይ{' '}
                            <strong className="font-mono text-slate-900 dark:text-white print:text-slate-900">
                              {formatKpiValue(item.requiredMonthlyRunRate, item.kpi.unit)}
                            </strong>{' '}
                            ማከናወን ያስፈልጋል።
                          </>
                        ) : (
                          <>
                            Requires{' '}
                            <strong className="font-mono text-slate-900 dark:text-white print:text-slate-900">
                              {formatKpiValue(item.requiredMonthlyRunRate, item.kpi.unit)}/mo
                            </strong>{' '}
                            across remaining months to close annual gap.
                          </>
                        )
                      ) : lang === 'am' ? (
                        `የወቅቱ ልዩነት፦ ${formatKpiValue(Math.abs(item.variance), item.kpi.unit)}`
                      ) : (
                        `Period gap: ${formatKpiValue(Math.abs(item.variance), item.kpi.unit)}`
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Formal Print-Only Signature Footer */}
        <div className="hidden print:grid grid-cols-2 gap-12 pt-10 border-t border-slate-300 text-xs text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">
              {lang === 'am' ? 'የሰራተኛው ስም እና ፊርማ፦' : 'Employee Name & Signature:'}
            </p>
            <div className="mt-8 border-b border-slate-400 pb-1">{profile.employeeName}</div>
          </div>
          <div>
            <p className="font-semibold text-slate-900">
              {lang === 'am' ? 'የቅርብ ኃላፊ / ስራ አስኪያጅ ፊርማ፦' : 'Branch Manager / Supervisor Review:'}
            </p>
            <div className="mt-8 border-b border-slate-400 pb-1">&nbsp;</div>
          </div>
        </div>

        <div className="no-print flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{lang === 'am' ? 'በCSV አውርድ' : 'Export CSV'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrintReport}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>{lang === 'am' ? 'አትም / Save as PDF' : 'Print / Save PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
