import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  Check,
  Copy,
  Download,
  Edit3,
  FileCheck,
  FileSpreadsheet,
  History,
  Printer,
  RotateCcw,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  AppraisalNarrative,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategoryDef,
  PeriodScope,
  QuarterKey,
} from '../types/kpi';
import {
  buildFormattedProgressSummaryText,
  computeUpToDateAndAnnualReport,
  computeYoYComparison,
  generateDeterministicAppraisalDraft,
  getStatusLabel,
  KpiEvaluatedRow,
  PortfolioSummary,
  UpToDateAnnualKpiRow,
} from '../utils/analytics';
import {
  formatEthiopianDate,
  getEffectiveMonthWorkingConfig,
} from '../utils/ethiopianCalendar';
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
  onSaveAppraisalNarrative: (narrative: AppraisalNarrative) => void;
  onOpenWorkingCalendar?: (monthIndex: number) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  profile,
  activeFy,
  allFiscalYears,
  categories,
  summary,
  scope,
  onChangeScope,
  onSaveAppraisalNarrative,
  onOpenWorkingCalendar,
}) => {
  const lang = profile.language;
  const kpis = activeFy.kpis;
  const logs = activeFy.actualLogs;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const remainingMonthsCount = Math.max(0, 12 - (profile.activeMonthIndex + 1));
  const todayIso = new Date().toISOString().slice(0, 10);

  // Auto Up-To-Date (Pro-Rated As-Of Date) Mode + Cutoff Date Picker
  const [isAutoUpToDateMode, setIsAutoUpToDateMode] = useState<boolean>(true);
  const [asOfDateIso, setAsOfDateIso] = useState<string>(todayIso);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);

  // Master Ledger Matrix View ('quarterly' | 'monthly_12') & Print visibility
  const [ledgerViewMode, setLedgerViewMode] = useState<'quarterly' | 'monthly_12'>(
    'quarterly'
  );
  const [includeLedgerInPrint, setIncludeLedgerInPrint] = useState<boolean>(true);

  const upToDateReport = useMemo(
    () =>
      computeUpToDateAndAnnualReport(
        activeFy,
        profile,
        categories,
        asOfDateIso
      ),
    [activeFy, profile, categories, asOfDateIso]
  );

  const utdRowMap = useMemo(() => {
    const map = new Map<string, UpToDateAnnualKpiRow>();
    for (const r of upToDateReport.rows) {
      map.set(r.kpi.id, r);
    }
    return map;
  }, [upToDateReport.rows]);

  const emptyNarrative: AppraisalNarrative = {
    keyAchievements: '',
    varianceExplanations: '',
    nextPeriodCommitments: '',
    supervisorComments: '',
  };

  const [narrativeDraft, setNarrativeDraft] = useState<AppraisalNarrative>(
    activeFy.appraisalNarrative || emptyNarrative
  );
  const [isEditingNarrative, setIsEditingNarrative] = useState<boolean>(false);
  const [narrativeSavedNotice, setNarrativeSavedNotice] = useState<boolean>(false);

  useEffect(() => {
    setNarrativeDraft(
      activeFy.appraisalNarrative || {
        keyAchievements: '',
        varianceExplanations: '',
        nextPeriodCommitments: '',
        supervisorComments: '',
      }
    );
  }, [activeFy.id, activeFy.appraisalNarrative]);

  const handleAutoDraftNarrative = () => {
    const generated = generateDeterministicAppraisalDraft(
      summary,
      activeFy.prospects || [],
      lang
    );
    const merged: AppraisalNarrative = {
      ...generated,
      supervisorComments: narrativeDraft.supervisorComments || '',
      updatedAt: new Date().toISOString(),
    };
    setNarrativeDraft(merged);
    onSaveAppraisalNarrative(merged);
    setIsEditingNarrative(false);
    setNarrativeSavedNotice(true);
    window.setTimeout(() => setNarrativeSavedNotice(false), 2200);
  };

  const handleSaveNarrativeClick = () => {
    const updated: AppraisalNarrative = {
      ...narrativeDraft,
      updatedAt: new Date().toISOString(),
    };
    onSaveAppraisalNarrative(updated);
    setIsEditingNarrative(false);
    setNarrativeSavedNotice(true);
    window.setTimeout(() => setNarrativeSavedNotice(false), 2200);
  };

  const handleCopySummaryText = async () => {
    const text = buildFormattedProgressSummaryText(
      upToDateReport,
      profile,
      categories,
      lang
    );
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedSummary(true);
    window.setTimeout(() => setCopiedSummary(false), 2200);
  };

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

  const activeHorizonLabel = isAutoUpToDateMode
    ? lang === 'am'
      ? `ወቅታዊ ፕሮ-ሬትድ እስከ ${asOfDateIso} (${upToDateReport.asOfMonthLabelAm} ቀን ${upToDateReport.elapsedWorkingDaysInMonth}/${upToDateReport.netWorkingDaysInMonth})`
      : `Auto Up-To-Date as of ${asOfDateIso} (${upToDateReport.asOfMonthLabelEn} WD ${upToDateReport.elapsedWorkingDaysInMonth}/${upToDateReport.netWorkingDaysInMonth})`
    : summary.scopeLabel;

  const activeScorePct = isAutoUpToDateMode
    ? upToDateReport.upToDateScorePct
    : summary.normalizedScorePct;
  const activeWeightedPoints = isAutoUpToDateMode
    ? upToDateReport.upToDateWeightedPoints
    : summary.totalWeightedPoints;
  const activeGrade = isAutoUpToDateMode
    ? upToDateReport.upToDateGrade
    : summary.overallGrade;

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
            `የወቅቱ እቅድ (${activeHorizonLabel})`,
            'የወቅቱ ክንውን (Actual)',
            'የወቅቱ ልዩነት (Variance)',
            'የወቅቱ አፈጻጸም (%)',
            'የወቅቱ ነጥብ (Weighted Score)',
            'ዓመታዊ ድምር ክንውን',
            'ዓመታዊ አፈጻጸም (%)',
            'የዓመቱ ያለፈ የስራ ጊዜ (%)',
            'ዓመታዊ ቀሪ እቅድ (Gap)',
            'የዓመት መጨረሻ ትንበያ (%)',
            ...(yoyComparison
              ? [
                  `የቀድሞ ዓመት ክንውን (${yoyComparison.priorYearLabel})`,
                  'ዓመታዊ እድገት YoY (%)',
                ]
              : []),
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
            `Evaluated Plan (${activeHorizonLabel})`,
            'Evaluated Actual',
            'Evaluated Variance',
            'Evaluated Achievement (%)',
            'Evaluated Weighted Points',
            'Cumulative Annual Actual',
            'Annual Progress (%)',
            'Fiscal Year Time Elapsed (%)',
            'Annual Remaining Gap',
            'Year-End Forecast (%)',
            ...(yoyComparison
              ? [
                  `Prior Year Actual (${yoyComparison.priorYearLabel})`,
                  'YoY Growth (%)',
                ]
              : []),
            'Required Monthly Run-Rate',
            'Appraisal Status',
          ];

    const csvRows = summary.rows.map((r) => {
      const utd = utdRowMap.get(r.kpi.id);
      const yoyRow = yoyComparison?.rows.find((yr) => yr.currentKpi.id === r.kpi.id);
      const evalPlan = isAutoUpToDateMode ? (utd?.upToDatePlan ?? r.periodTarget) : r.periodTarget;
      const evalActual = isAutoUpToDateMode ? (utd?.upToDateActual ?? r.periodActual) : r.periodActual;
      const evalVar = isAutoUpToDateMode ? (utd?.upToDateVariance ?? r.variance) : r.variance;
      const evalAchv = isAutoUpToDateMode ? (utd?.upToDateAchvPct ?? r.achievementPct) : r.achievementPct;
      const evalPts = isAutoUpToDateMode ? (utd?.upToDatePoints ?? r.weightedScore) : r.weightedScore;
      const evalStatus = isAutoUpToDateMode ? (utd?.upToDateStatus ?? r.status) : r.status;

      return [
        r.kpi.code,
        r.kpi.name,
        getCategoryLabel(r.kpi.category, lang, categories),
        r.kpi.unit,
        r.kpi.weight,
        r.branchAnnualTarget,
        r.personalAnnualTarget,
        Number(evalPlan.toFixed(2)),
        Number(evalActual.toFixed(2)),
        Number(evalVar.toFixed(2)),
        Number(evalAchv.toFixed(2)),
        Number(evalPts.toFixed(2)),
        Number((utd?.annualActual ?? r.annualActualYtd).toFixed(2)),
        Number((utd?.annualCompletionPct ?? r.annualAchievementPct).toFixed(2)),
        Number(upToDateReport.fiscalYearElapsedPct.toFixed(2)),
        Number((utd?.annualRemainingGap ?? r.annualRemainingGap).toFixed(2)),
        Number((utd?.projectedAnnualAchvPct ?? r.annualAchievementPct).toFixed(2)),
        ...(yoyComparison
          ? [
              yoyRow && yoyRow.priorHasData ? Number(yoyRow.priorActual.toFixed(2)) : '',
              yoyRow && yoyRow.yoyGrowthPct !== null
                ? Number(yoyRow.yoyGrowthPct.toFixed(2))
                : '',
            ]
          : []),
        r.requiredMonthlyRunRate !== null ? Number(r.requiredMonthlyRunRate.toFixed(2)) : '',
        getStatusLabel(evalStatus, lang),
      ];
    });

    const dateStr = isAutoUpToDateMode ? asOfDateIso : todayIso;
    exportReportAsCsv(headers, csvRows, `kpi-up-to-date-annual-report-${dateStr}.csv`);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const executiveSummaryText =
    lang === 'am'
      ? `በ${activeHorizonLabel} የምዘና ወቅት ${profile.employeeName} ከተቀመጡት ${summary.rows.length} የKPI መለኪያዎች ውስጥ አጠቃላይ ${activeScorePct.toFixed(
          1
        )}% (${activeWeightedPoints.toFixed(1)} ከ ${
          summary.totalWeight
        } ነጥብ — "${activeGrade.labelAm}") አስመዝግበዋል። ከሙሉ ዓመታዊ እቅድ አንጻር እስካሁን የዓመቱ ${upToDateReport.fiscalYearElapsedPct.toFixed(
          1
        )}% የስራ ጊዜ ያለፈ ሲሆን፣ አጠቃላይ ዓመታዊ ክንውን ${upToDateReport.annualCompletionScorePct.toFixed(
          1
        )}% (${upToDateReport.annualScheduleDeltaPts >= 0 ? '+' : ''}${upToDateReport.annualScheduleDeltaPts.toFixed(
          1
        )}% ከዓመታዊ የጊዜ ሂደት አንጻር) ደርሷል፤ በአሁኑ ፍጥነት እና በፓይፕላይን ላይ በመመስረት የዓመት መጨረሻ ትንበያው ${upToDateReport.projectedYearEndScorePct.toFixed(
          1
        )}% (ደረጃ ${upToDateReport.projectedYearEndGrade.code}) ነው።${
          yoyComparison
            ? ` ከ${yoyComparison.priorYearLabel} ተመሳሳይ ወቅት (${yoyComparison.priorScorePct.toFixed(
                1
              )}%) ጋር ሲነጻጸር የ${yoyComparison.scoreDeltaPts >= 0 ? '+' : ''}${yoyComparison.scoreDeltaPts.toFixed(
                1
              )} ነጥብ ለውጥ አሳይቷል።`
            : ''
        }`
      : `For ${activeHorizonLabel}, ${profile.employeeName} achieved a weighted KPI score of ${activeScorePct.toFixed(
          1
        )}% (${activeWeightedPoints.toFixed(1)} of ${
          summary.totalWeight
        } points — "${activeGrade.labelEn}"). Against the full annual contract, ${upToDateReport.annualCompletionScorePct.toFixed(
          1
        )}% of annual weighted plan is completed with ${upToDateReport.fiscalYearElapsedPct.toFixed(
          1
        )}% of the fiscal year elapsed (${
          upToDateReport.annualScheduleDeltaPts >= 0 ? '+' : ''
        }${upToDateReport.annualScheduleDeltaPts.toFixed(
          1
        )} pts vs. annual schedule), projecting a year-end landing of ${upToDateReport.projectedYearEndScorePct.toFixed(
          1
        )}% (Grade ${upToDateReport.projectedYearEndGrade.code}).${
          yoyComparison
            ? ` Compared against ${yoyComparison.priorYearLabel} (${yoyComparison.priorScorePct.toFixed(
                1
              )}%), portfolio performance shifted by ${
                yoyComparison.scoreDeltaPts >= 0 ? '+' : ''
              }${yoyComparison.scoreDeltaPts.toFixed(1)} pts.`
            : ''
        }`;

  const showPaceInReport =
    isAutoUpToDateMode || scope.type === 'month' || scope.type === 'ytd';
  const paceMonthIdx = isAutoUpToDateMode
    ? upToDateReport.asOfMonthIndex
    : scope.type === 'month'
      ? scope.monthIndex
      : activeFy.activeMonthIndex;
  const effectivePaceConfig = getEffectiveMonthWorkingConfig(activeFy, paceMonthIdx);

  return (
    <div className="space-y-6">
      {/* Interactive Report Controls (Hidden in Print) */}
      <div className="no-print space-y-3 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {lang === 'am'
                ? '4. ወቅታዊ (Up-To-Date) እና ዓመታዊ የአፈጻጸም ትንተና ሪፖርት'
                : '4. Auto Up-To-Date & Annual KPI Progress Report'}
            </h1>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {lang === 'am'
                ? 'እስከ ዛሬ ቀን ድረስ ያለውን የስራ ቀናት ፕሮ-ሬትድ እቅድ ከክንውን (%) እና ከሙሉ ዓመታዊ እቅድ ሂደት ጋር በአንድ ሪፖርት ያወዳድሩ።'
                : 'Automatically pro-rates up-to-date plan by elapsed working days alongside full annual completion %, year-end forecast, PDF print, and CSV export.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsAutoUpToDateMode(true);
                  onChangeScope({ type: 'ytd' });
                }}
                className={`min-h-[36px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isAutoUpToDateMode
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {lang === 'am' ? 'እስከ ዛሬ (Auto UTD)' : 'Auto Up-To-Date'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAutoUpToDateMode(false);
                  onChangeScope({ type: 'ytd' });
                }}
                className={`min-h-[36px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !isAutoUpToDateMode && scope.type === 'ytd'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                YTD
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAutoUpToDateMode(false);
                  onChangeScope({ type: 'annual' });
                }}
                className={`min-h-[36px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  !isAutoUpToDateMode && scope.type === 'annual'
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
                  onClick={() => {
                    setIsAutoUpToDateMode(false);
                    onChangeScope({ type: 'quarter', quarter: q });
                  }}
                  className={`min-h-[36px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    !isAutoUpToDateMode && scope.type === 'quarter' && scope.quarter === q
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>

            <select
              value={!isAutoUpToDateMode && scope.type === 'month' ? String(scope.monthIndex) : ''}
              onChange={(e) => {
                if (e.target.value !== '') {
                  setIsAutoUpToDateMode(false);
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
              onClick={handleCopySummaryText}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title={
                lang === 'am'
                  ? 'ለTelegram / WhatsApp / Email የተዘጋጀ ጽሑፍ ቅዳ'
                  : 'Copy formatted text brief for Telegram, WhatsApp, or Email'
              }
            >
              {copiedSummary ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              )}
              <span>
                {copiedSummary
                  ? lang === 'am'
                    ? 'ተቀድቷል!'
                    : 'Copied!'
                  : lang === 'am'
                    ? 'ማጠቃለያ ቅዳ'
                    : 'Copy Summary'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>{lang === 'am' ? 'Excel (CSV)' : 'Download CSV'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'ሪፖርት አትም / PDF' : 'Print / Save PDF'}</span>
            </button>
          </div>
        </div>

        {/* Live As-Of Date Calendar Sync Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-700 dark:text-slate-300">
            <CalendarClock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {lang === 'am' ? 'ወቅታዊ የማስያ ቀን (As-Of Date)፦' : 'Auto Pro-Rated As-Of Date:'}
            </span>
            <input
              type="date"
              aria-label={lang === 'am' ? 'የሪፖርት መቁረጫ ቀን' : 'Report As-Of Date'}
              value={asOfDateIso}
              onChange={(e) => {
                if (e.target.value) {
                  setAsOfDateIso(e.target.value);
                  setIsAutoUpToDateMode(true);
                }
              }}
              className="min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
            />
            {asOfDateIso !== todayIso && (
              <button
                type="button"
                onClick={() => {
                  setAsOfDateIso(todayIso);
                  setIsAutoUpToDateMode(true);
                }}
                className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>{lang === 'am' ? 'ወደ ዛሬ መልስ' : 'Sync Today'}</span>
              </button>
            )}
            <span className="text-slate-400 dark:text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {formatEthiopianDate(asOfDateIso, lang)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400 font-mono tabular-nums">
            <span>
              {lang === 'am'
                ? `${upToDateReport.asOfMonthLabelAm} የስራ ቀን ${upToDateReport.elapsedWorkingDaysInMonth}/${upToDateReport.netWorkingDaysInMonth} (${upToDateReport.monthElapsedPct.toFixed(0)}%)`
                : `${upToDateReport.asOfMonthLabelEn} WD ${upToDateReport.elapsedWorkingDaysInMonth}/${upToDateReport.netWorkingDaysInMonth} (${upToDateReport.monthElapsedPct.toFixed(0)}%)`}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {lang === 'am'
                ? `የበጀት ዓመቱ ${upToDateReport.fiscalYearElapsedPct.toFixed(1)}% አልፏል`
                : `${upToDateReport.fiscalYearElapsedPct.toFixed(1)}% of FY Elapsed`}
            </span>
          </div>
        </div>
      </div>

      {/* Formal Report Sheet */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 print:border-slate-200 bg-white dark:bg-slate-900 print:bg-white p-6 sm:p-8 space-y-8">
        {/* Report Document Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 print:text-blue-700">
              {lang === 'am'
                ? 'የሰራተኛ ወቅታዊ (Up-To-Date) እና ዓመታዊ የKPI አፈጻጸም ምዘና ሪፖርት'
                : 'Employee Up-To-Date & Annual KPI Performance Appraisal Report'}
            </p>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white print:text-slate-900">
              {profile.employeeName}
            </h2>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 print:text-slate-600">
              <span>{profile.roleTitle}</span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              <span>{profile.employeeId}</span>
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
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
                {activeHorizonLabel}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">
                {lang === 'am' ? 'ሪፖርት የተዘጋጀበት ቀን፦ ' : 'Generated Date: '}
              </span>
              <span className="font-mono tabular-nums text-slate-800 dark:text-slate-200 print:text-slate-800">
                {todayIso}
              </span>
              <span className="mx-1.5 text-slate-300 dark:text-slate-600" aria-hidden="true">
                ·
              </span>
              <span className="text-slate-700 dark:text-slate-300 print:text-slate-700">
                {formatEthiopianDate(todayIso, lang)}
              </span>
            </div>
          </div>
        </div>

        {/* Dual-Horizon KPI Scoreboard Strip (Up-To-Date % + Annual Progress % + Year-End Forecast %) */}
        <div className="space-y-5 border-b border-slate-200 dark:border-slate-800 print:border-slate-200 pb-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 print:divide-slate-200">
            {/* Metric 1: Evaluated / Auto Up-To-Date Score */}
            <div className="pt-2 sm:pt-0 sm:pr-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-500">
                {isAutoUpToDateMode
                  ? lang === 'am'
                    ? 'ወቅታዊ ፕሮ-ሬትድ ውጤት (Up-To-Date)'
                    : 'Auto Up-To-Date Score'
                  : lang === 'am'
                    ? 'የተመረጠው ወቅት ውጤት'
                    : 'Selected Horizon Score'}
              </div>
              <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                {activeScorePct.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs font-semibold text-blue-700 dark:text-blue-400 print:text-blue-700">
                {lang === 'am'
                  ? `ደረጃ ${activeGrade.code} · ${activeWeightedPoints.toFixed(1)}/${summary.totalWeight} ነጥብ`
                  : `Grade ${activeGrade.code} · ${activeWeightedPoints.toFixed(1)}/${summary.totalWeight} pts`}
              </div>
            </div>

            {/* Metric 2: Full Annual Contract Completion % vs Elapsed Clock */}
            <div className="pt-4 sm:pt-0 sm:px-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-500">
                {lang === 'am'
                  ? 'ከሙሉ ዓመታዊ እቅድ ክንውን (Annual %)'
                  : 'Full Annual Plan Progress'}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                  {upToDateReport.annualCompletionScorePct.toFixed(1)}%
                </span>
                <span
                  className={`inline-flex items-center gap-0.5 font-mono text-xs font-semibold tabular-nums ${
                    upToDateReport.annualScheduleDeltaPts >= 0
                      ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                      : 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                  }`}
                >
                  {upToDateReport.annualScheduleDeltaPts >= 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>
                    {upToDateReport.annualScheduleDeltaPts >= 0 ? '+' : ''}
                    {upToDateReport.annualScheduleDeltaPts.toFixed(1)}%
                  </span>
                </span>
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="h-1.5 w-full overflow-hidden rounded-xs bg-slate-100 dark:bg-slate-800 print:bg-slate-200">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500"
                    style={{
                      width: `${Math.min(100, Math.max(2, upToDateReport.annualCompletionScorePct))}%`,
                    }}
                  />
                </div>
                <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {lang === 'am'
                    ? `የዓመቱ የጊዜ ሂደት፦ ${upToDateReport.fiscalYearElapsedPct.toFixed(1)}% አልፏል`
                    : `vs. ${upToDateReport.fiscalYearElapsedPct.toFixed(1)}% of FY elapsed`}
                </div>
              </div>
            </div>

            {/* Metric 3: Year-End Landing Forecast */}
            <div className="pt-4 sm:pt-0 sm:px-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-500">
                {lang === 'am'
                  ? 'የዓመት መጨረሻ ትንበያ (Year-End Forecast)'
                  : 'Projected Year-End Landing'}
              </div>
              <div className="mt-1 font-mono text-3xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                {upToDateReport.projectedYearEndScorePct.toFixed(1)}%
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-300 print:text-slate-600">
                {lang === 'am'
                  ? `ትንበያ ደረጃ ${upToDateReport.projectedYearEndGrade.code} · ከወቅታዊ ፍጥነት + ፓይፕላይን`
                  : `Forecast Grade ${upToDateReport.projectedYearEndGrade.code} · Velocity + Pipeline`}
              </div>
            </div>

            {/* Metric 4: Working Day & Portfolio Health Count */}
            <div className="pt-4 sm:pt-0 sm:pl-5">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-500">
                {lang === 'am' ? 'የKPI አፈጻጸም ስርጭት' : 'KPI Pace Distribution'}
              </div>
              <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                {isAutoUpToDateMode
                  ? upToDateReport.exceedingUpToDateCount
                  : summary.exceedingCount}{' '}
                / {summary.rows.length}
              </div>
              <div className="mt-1 text-xs text-slate-600 dark:text-slate-400 print:text-slate-600">
                {lang === 'am'
                  ? `≥100% የደረሱ · ${
                      isAutoUpToDateMode
                        ? upToDateReport.attentionUpToDateCount
                        : summary.atRiskCount + summary.criticalCount
                    } ትኩረት የሚሹ`
                  : `≥100% on pace · ${
                      isAutoUpToDateMode
                        ? upToDateReport.attentionUpToDateCount
                        : summary.atRiskCount + summary.criticalCount
                    } need focus`}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 print:border-slate-100 pt-4">
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
          scopeLabel={activeHorizonLabel}
        />

        {/* 2. Unified Dual-Horizon Table: Auto Up-To-Date Progress (%) + Full Annual Progress (%) */}
        <div className="print-break-avoid">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
              {lang === 'am'
                ? '2. ወቅታዊ (Up-To-Date %) እና ሙሉ ዓመታዊ (Annual %) የእቅድና ክንውን ትንተና ሰንጠረዥ'
                : '2. Unified Up-To-Date Plan vs. Actual (%) & Full Annual Progress Matrix'}
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 print:text-slate-500">
              {isAutoUpToDateMode
                ? lang === 'am'
                  ? `ፕሮ-ሬትድ እስከ ${asOfDateIso} · የዓመቱ ${upToDateReport.fiscalYearElapsedPct.toFixed(1)}% አልፏል`
                  : `Pro-rated through ${asOfDateIso} · ${upToDateReport.fiscalYearElapsedPct.toFixed(1)}% FY elapsed`
                : summary.scopeLabel}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 bg-slate-50 dark:bg-slate-800/70 print:bg-slate-50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-600">
                  <th className="py-2.5 pl-4 pr-2">{lang === 'am' ? 'መለኪያ (KPI)' : 'KPI'}</th>
                  <th className="px-2 py-2.5 text-right">{lang === 'am' ? 'ክብደት' : 'Wt%'}</th>
                  <th className="px-2 py-2.5 text-right">
                    {isAutoUpToDateMode
                      ? lang === 'am'
                        ? 'እቅድ (እስከ ዛሬ)'
                        : 'UTD Plan'
                      : lang === 'am'
                        ? 'የጊዜው እቅድ'
                        : 'Period Plan'}
                  </th>
                  <th className="px-2 py-2.5 text-right">
                    {isAutoUpToDateMode
                      ? lang === 'am'
                        ? 'ክንውን (እስከ ዛሬ)'
                        : 'UTD Actual'
                      : lang === 'am'
                        ? 'ክንውን'
                        : 'Actual'}
                  </th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'ልዩነት' : 'Variance'}
                  </th>
                  <th className="px-2 py-2.5 text-right">
                    {isAutoUpToDateMode
                      ? lang === 'am'
                        ? 'ወቅታዊ %'
                        : 'UTD %'
                      : lang === 'am'
                        ? 'አፈጻጸም %'
                        : 'Achv %'}
                  </th>
                  <th className="px-2 py-2.5 text-right">{lang === 'am' ? 'ነጥብ' : 'Pts'}</th>
                  <th className="px-2 py-2.5 text-right border-l border-slate-200 dark:border-slate-700 print:border-slate-200">
                    {lang === 'am' ? 'ዓመታዊ እቅድ' : 'Annual Plan'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right">
                    {lang === 'am' ? 'ዓመታዊ ክንውን %' : 'Annual Progress %'}
                  </th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'ዓመታዊ ቀሪ' : 'Annual Gap'}
                  </th>
                  <th className="px-2 py-2.5 text-right">
                    {lang === 'am' ? 'ትንበያ %' : 'Forecast %'}
                  </th>
                  <th className="py-2.5 pl-2 pr-4">
                    {lang === 'am' ? 'ሁኔታ' : 'Appraisal'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100 text-xs">
                {summary.rows.map((r: KpiEvaluatedRow) => {
                  const utd = utdRowMap.get(r.kpi.id);
                  const evalPlan = isAutoUpToDateMode
                    ? (utd?.upToDatePlan ?? r.periodTarget)
                    : r.periodTarget;
                  const evalActual = isAutoUpToDateMode
                    ? (utd?.upToDateActual ?? r.periodActual)
                    : r.periodActual;
                  const evalHasData = isAutoUpToDateMode
                    ? (utd?.hasUpToDateData ?? r.hasActualData)
                    : r.hasActualData;
                  const evalVariance = isAutoUpToDateMode
                    ? (utd?.upToDateVariance ?? r.variance)
                    : r.variance;
                  const evalAchvPct = isAutoUpToDateMode
                    ? (utd?.upToDateAchvPct ?? r.achievementPct)
                    : r.achievementPct;
                  const evalPoints = isAutoUpToDateMode
                    ? (utd?.upToDatePoints ?? r.weightedScore)
                    : r.weightedScore;
                  const evalStatus = isAutoUpToDateMode
                    ? (utd?.upToDateStatus ?? r.status)
                    : r.status;

                  const annualPct = utd?.annualCompletionPct ?? r.annualAchievementPct;
                  const annualDelta = utd?.annualScheduleDeltaPct ?? 0;
                  const annualGap = utd?.annualRemainingGap ?? r.annualRemainingGap;
                  const forecastPct = utd?.projectedAnnualAchvPct ?? r.annualAchievementPct;

                  return (
                    <tr
                      key={r.kpi.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 pl-4 pr-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                          {r.kpi.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 print:text-slate-500">
                          {r.kpi.code} · {getCategoryLabel(r.kpi.category, lang, categories)} ·{' '}
                          {lang === 'am'
                            ? `የቅርንጫፍ ድርሻ ${r.branchSharePct.toFixed(1)}%`
                            : `Branch share ${r.branchSharePct.toFixed(1)}%`}
                        </div>
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600">
                        {r.kpi.weight}%
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 print:text-slate-700 whitespace-nowrap">
                        {formatKpiValue(evalPlan, r.kpi.unit, true)}
                      </td>
                      <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                        {evalHasData ? formatKpiValue(evalActual, r.kpi.unit, true) : '—'}
                      </td>
                      <td
                        className={`px-2 py-3 text-right font-mono tabular-nums whitespace-nowrap ${
                          !evalHasData
                            ? 'text-slate-400'
                            : evalVariance >= 0
                              ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                              : 'text-red-700 dark:text-red-400 print:text-red-700'
                        }`}
                      >
                        {evalHasData
                          ? `${evalVariance >= 0 ? '+' : '-'}${formatKpiValue(
                              Math.abs(evalVariance),
                              r.kpi.unit,
                              true
                            )}`
                          : '—'}
                      </td>
                      <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900 whitespace-nowrap">
                        {evalHasData ? `${evalAchvPct.toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="px-2 py-3 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                        {evalPoints.toFixed(2)}
                      </td>

                      {/* Annual Horizon Columns */}
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 print:text-slate-700 whitespace-nowrap border-l border-slate-100 dark:border-slate-800 print:border-slate-200">
                        {formatKpiValue(r.personalAnnualTarget, r.kpi.unit, true)}
                      </td>
                      <td className="px-2.5 py-3 text-right whitespace-nowrap">
                        <div className="font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                          {annualPct.toFixed(1)}%
                        </div>
                        <div className="mt-1 ml-auto h-1 w-16 overflow-hidden rounded-xs bg-slate-100 dark:bg-slate-800 print:bg-slate-200">
                          <div
                            className={`h-full ${
                              annualDelta >= 0
                                ? 'bg-emerald-600 dark:bg-emerald-400'
                                : 'bg-amber-500 dark:bg-amber-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, annualPct))}%` }}
                          />
                        </div>
                        {r.kpi.aggregation === 'sum' && (
                          <div
                            className={`mt-0.5 font-mono text-[10px] tabular-nums ${
                              annualDelta >= 0
                                ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                                : 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                            }`}
                          >
                            {annualDelta >= 0 ? '+' : ''}
                            {annualDelta.toFixed(1)}% {lang === 'am' ? 'ከጊዜ' : 'vs yr'}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 print:text-slate-700 whitespace-nowrap">
                        {annualGap > 0
                          ? formatKpiValue(annualGap, r.kpi.unit, true)
                          : lang === 'am'
                            ? 'ተሳክቷል'
                            : 'Met'}
                      </td>
                      <td
                        className={`px-2 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                          forecastPct >= 100
                            ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                            : forecastPct >= 85
                              ? 'text-blue-700 dark:text-blue-400 print:text-blue-700'
                              : 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                        }`}
                      >
                        {forecastPct.toFixed(1)}%
                      </td>
                      <td className="py-3 pl-2 pr-4 whitespace-nowrap">
                        <StatusIndicator status={evalStatus} lang={lang} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-slate-700 print:border-slate-200 bg-slate-50 dark:bg-slate-800/80 print:bg-slate-50 font-semibold text-xs text-slate-900 dark:text-white print:text-slate-900">
                  <td className="py-3 pl-4 pr-2">
                    {lang === 'am'
                      ? 'ጠቅላላ ድምር / ክብደት ያለው ውጤት'
                      : 'Portfolio Weighted Totals'}
                  </td>
                  <td className="px-2 py-3 text-right font-mono tabular-nums">
                    {summary.totalWeight}%
                  </td>
                  <td colSpan={3} />
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400 print:text-blue-700">
                    {activeScorePct.toFixed(1)}%
                  </td>
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                    {activeWeightedPoints.toFixed(2)}
                  </td>
                  <td className="border-l border-slate-200 dark:border-slate-700 print:border-slate-200" />
                  <td className="px-2.5 py-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900">
                    {upToDateReport.annualCompletionScorePct.toFixed(1)}%
                  </td>
                  <td />
                  <td className="px-2 py-3 text-right font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                    {upToDateReport.projectedYearEndScorePct.toFixed(1)}%
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
            {lang === 'am'
              ? '* ማስታወሻ፦ ወቅታዊ (UTD) ፕሮ-ሬትድ እቅድ የተጠናቀቁ ወራትን እቅድ + የአሁኑን ወር እቅድ በተጠናቀቁ የስራ ቀናት ድርሻ በማባዛት ይሰላል። የእያንዳንዱ KPI ነጥብ እስከ 120% ጣሪያ (Cap) ይታسبል።'
              : '* Note: Auto Up-To-Date (UTD) Plan = Completed Months Plan + (Current Month Plan × Elapsed Working Days / Net Working Days). Individual KPI points cap at 120% of weight.'}
          </p>
        </div>

        {/* 3. Category Weighted Point & Annual Progress Breakdown */}
        <div className="border-t border-slate-200 dark:border-slate-800 print:border-slate-200 pt-7 print-break-avoid">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900 mb-3">
            {lang === 'am'
              ? '3. በKPI ዘርፍ የክብደት ነጥብ እና ዓመታዊ አፈጻጸም ትንተና (Category Percentage Analysis)'
              : '3. Category Weighted Score & Annual Completion Breakdown'}
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 bg-slate-50 dark:bg-slate-800/70 print:bg-slate-50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-600">
                  <th className="py-2.5 pl-4 pr-2">
                    {lang === 'am' ? 'የKPI ዘርፍ (Category)' : 'KPI Category'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right">
                    {lang === 'am' ? 'መለኪያዎች' : 'KPIs'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right">
                    {lang === 'am' ? 'የክብደት ድርሻ' : 'Weight %'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right">
                    {lang === 'am' ? 'ወቅታዊ አፈጻጸም %' : 'Up-To-Date %'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right">
                    {lang === 'am' ? 'የተገኘ ወቅታዊ ነጥብ' : 'UTD Points Earned'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right">
                    {lang === 'am' ? 'ዓመታዊ ክንውን %' : 'Annual Progress %'}
                  </th>
                  <th className="py-2.5 pl-2.5 pr-4 text-right">
                    {lang === 'am' ? 'የዓመት መጨረሻ ትንበያ ነጥብ' : 'Projected FY Points'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100 text-xs">
                {upToDateReport.categoryBreakdowns.map((cat) => (
                  <tr key={cat.category}>
                    <td className="py-2.5 pl-4 pr-2 font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                      {getCategoryLabel(cat.category, lang, categories)}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600">
                      {cat.kpiCount}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 print:text-slate-700">
                      {cat.weightSum}%
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400 print:text-blue-700">
                      {cat.upToDateAchvPct.toFixed(1)}%
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 print:text-slate-900">
                      {cat.upToDateEarnedPoints.toFixed(2)} / {cat.weightSum}
                    </td>
                    <td className="px-2.5 py-2.5 text-right font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200 print:text-slate-800">
                      {cat.annualCompletionPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-2.5 pr-4 text-right font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                      {cat.projectedEarnedPoints.toFixed(2)} / {cat.weightSum}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Quarterly (Q1–Q4) & 12-Month Master Progress Ledger */}
        <div
          className={`border-t border-slate-200 dark:border-slate-800 print:border-slate-200 pt-7 print-break-avoid ${
            includeLedgerInPrint ? '' : 'no-print'
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
            <div className="flex items-center gap-2">
              <Table2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
                  {lang === 'am'
                    ? '4. የሩብ ዓመት (Q1–Q4)፣ ወርሃዊ እና ዓመታዊ ማጠቃለያ ማትሪክስ'
                    : '4. Quarterly (Q1–Q4), 12-Month & Annual Master Progress Ledger'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-500">
                  {lang === 'am'
                    ? 'የእያንዳንዱን KPI የሩብ ዓመት ወይም የ12 ወራት አፈጻጸም (%) ከወቅታዊ እና ዓመታዊ ግብ ጋር ያሳያል።'
                    : 'Tracks percentage progress across every quarter or all 12 fiscal months alongside Up-To-Date and Full Annual completion.'}
                </p>
              </div>
            </div>

            <div className="no-print flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLedgerInPrint}
                  onChange={(e) => setIncludeLedgerInPrint(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>{lang === 'am' ? 'በPDF ህትመት አካትት' : 'Include in PDF'}</span>
              </label>

              <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('quarterly')}
                  className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    ledgerViewMode === 'quarterly'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? 'Q1–Q4 + ዓመታዊ' : 'Q1–Q4 + Annual'}
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerViewMode('monthly_12')}
                  className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    ledgerViewMode === 'monthly_12'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {lang === 'am' ? '12 ወራት + ዓመታዊ' : '12 Months + Annual'}
                </button>
              </div>
            </div>
          </div>

          {ledgerViewMode === 'quarterly' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 bg-slate-50 dark:bg-slate-800/70 print:bg-slate-50 text-[11px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-600">
                    <th className="py-2.5 pl-4 pr-2">{lang === 'am' ? 'መለኪያ (KPI)' : 'KPI'}</th>
                    {QUARTERS.map((q) => (
                      <th key={q} className="px-2.5 py-2.5 text-right">
                        {q} ({lang === 'am' ? 'ክንውን / %' : 'Actual / %'})
                      </th>
                    ))}
                    <th className="px-2.5 py-2.5 text-right border-l border-slate-200 dark:border-slate-700 print:border-slate-200">
                      {lang === 'am' ? 'ወቅታዊ (UTD %)' : 'Up-To-Date %'}
                    </th>
                    <th className="py-2.5 pl-2.5 pr-4 text-right">
                      {lang === 'am' ? 'ዓመታዊ ክንውን %' : 'Full Annual %'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100 text-xs">
                  {upToDateReport.rows.map((row) => (
                    <tr key={row.kpi.id}>
                      <td className="py-2.5 pl-4 pr-2">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                          {row.kpi.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {row.kpi.code} · {lang === 'am' ? 'ዓመታዊ እቅድ፦ ' : 'Annual Plan: '}
                          {formatKpiValue(row.annualPlan, row.kpi.unit, true)}
                        </div>
                      </td>
                      {QUARTERS.map((q) => {
                        const cell = row.quarterlyBreakdown[q];
                        return (
                          <td
                            key={q}
                            className="px-2.5 py-2.5 text-right font-mono tabular-nums whitespace-nowrap"
                          >
                            <div className="font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900">
                              {cell.hasData
                                ? formatKpiValue(cell.actual, row.kpi.unit, true)
                                : '—'}
                            </div>
                            <div
                              className={`text-[10px] ${
                                !cell.hasData
                                  ? 'text-slate-400'
                                  : cell.achvPct >= 100
                                    ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700 font-semibold'
                                    : cell.achvPct >= 85
                                      ? 'text-blue-700 dark:text-blue-400 print:text-blue-700'
                                      : 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                              }`}
                            >
                              {cell.hasData
                                ? `${cell.achvPct.toFixed(1)}% of ${formatKpiValue(
                                    cell.plan,
                                    row.kpi.unit,
                                    true
                                  )}`
                                : `Plan ${formatKpiValue(cell.plan, row.kpi.unit, true)}`}
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-2.5 py-2.5 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400 print:text-blue-700 border-l border-slate-100 dark:border-slate-800 print:border-slate-200 whitespace-nowrap">
                        {row.hasUpToDateData ? `${row.upToDateAchvPct.toFixed(1)}%` : '0.0%'}
                      </td>
                      <td className="py-2.5 pl-2.5 pr-4 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900 whitespace-nowrap">
                        <div>{row.annualCompletionPct.toFixed(1)}%</div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          {formatKpiValue(row.annualActual, row.kpi.unit, true)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-200">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 bg-slate-50 dark:bg-slate-800/70 print:bg-slate-50 text-[10px] font-semibold text-slate-600 dark:text-slate-300 print:text-slate-600">
                    <th className="py-2 pl-3 pr-2">{lang === 'am' ? 'KPI' : 'KPI'}</th>
                    {fiscalMonths.map((m) => (
                      <th
                        key={m.index}
                        className={`px-1.5 py-2 text-right whitespace-nowrap ${
                          m.index === upToDateReport.asOfMonthIndex
                            ? 'text-blue-700 dark:text-blue-400'
                            : ''
                        }`}
                      >
                        {lang === 'am' ? m.shortAm : m.shortEn}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right border-l border-slate-200 dark:border-slate-700">
                      UTD %
                    </th>
                    <th className="py-2 pl-2 pr-3 text-right">
                      {lang === 'am' ? 'ዓመታዊ %' : 'Annual %'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-100 text-[11px]">
                  {upToDateReport.rows.map((row) => (
                    <tr key={row.kpi.id}>
                      <td className="py-2 pl-3 pr-2 font-semibold text-slate-900 dark:text-slate-100 print:text-slate-900 whitespace-nowrap">
                        {row.kpi.code}
                      </td>
                      {row.monthlyBreakdown.map((cell) => (
                        <td
                          key={cell.monthIndex}
                          className="px-1.5 py-2 text-right font-mono tabular-nums whitespace-nowrap"
                          title={`${
                            lang === 'am'
                              ? fiscalMonths[cell.monthIndex]?.fullAm
                              : fiscalMonths[cell.monthIndex]?.fullEn
                          }: ${formatKpiValue(cell.actual, row.kpi.unit, true)} / ${formatKpiValue(
                            cell.plan,
                            row.kpi.unit,
                            true
                          )}`}
                        >
                          {cell.hasData ? (
                            <span
                              className={
                                cell.achvPct >= 100
                                  ? 'font-semibold text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                                  : cell.achvPct >= 85
                                    ? 'text-slate-800 dark:text-slate-200 print:text-slate-800'
                                    : 'text-amber-700 dark:text-amber-400 print:text-amber-700'
                              }
                            >
                              {cell.achvPct.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400 border-l border-slate-100 dark:border-slate-800 whitespace-nowrap">
                        {row.upToDateAchvPct.toFixed(1)}%
                      </td>
                      <td className="py-2 pl-2 pr-3 text-right font-mono font-bold tabular-nums text-slate-900 dark:text-white print:text-slate-900 whitespace-nowrap">
                        {row.annualCompletionPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Daily & Weekly Execution Pace Breakdown (for Auto UTD, Monthly & YTD Horizons) */}
        {showPaceInReport && (
          <DailyWeeklyPaceSection
            profile={profile}
            kpis={kpis}
            logs={logs}
            categories={categories}
            targetMonthIndex={paceMonthIdx}
            workingDaysPerMonth={
              isAutoUpToDateMode
                ? upToDateReport.netWorkingDaysInMonth
                : effectivePaceConfig.netWorkingDays
            }
            elapsedWorkingDays={
              isAutoUpToDateMode
                ? upToDateReport.elapsedWorkingDaysInMonth
                : effectivePaceConfig.elapsedWorkingDays
            }
            holidayDeductedCount={
              isAutoUpToDateMode
                ? upToDateReport.holidayDeductedCount
                : effectivePaceConfig.holidays.length
            }
            onOpenWorkingCalendar={onOpenWorkingCalendar}
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

        {/* Appraisal Self-Assessment & Supervisor Review Narrative */}
        <div className="border-t border-slate-200 dark:border-slate-800 print:border-slate-200 pt-7 print-break-avoid">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
                {lang === 'am'
                  ? 'የሰራተኛ ግለ-ግምገማ እና የኃላፊ አስተያየት (Self-Assessment & Review Narrative)'
                  : 'Appraisal Self-Assessment & Supervisor Review Narrative'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 print:text-slate-500">
                {lang === 'am'
                  ? 'ዋና ስኬቶችን፣ የልዩነት ምክንያቶችን እና የቀጣይ ወቅት ቃል ኪዳኖችን ለምዘና ሰነድ ያዘጋጁ።'
                  : 'Document key accomplishments, variance context, next-period commitments, and supervisor review notes for the formal appraisal record.'}
              </p>
            </div>

            <div className="no-print flex flex-wrap items-center gap-2">
              {narrativeSavedNotice && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                  <Check className="h-3.5 w-3.5" />
                  <span>{lang === 'am' ? 'ተቀምጧል' : 'Saved locally'}</span>
                </span>
              )}

              <button
                type="button"
                onClick={handleAutoDraftNarrative}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <FileCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>
                  {lang === 'am'
                    ? 'ከስኮርካርድ ረቂቅ አዘጋጅ'
                    : 'Auto-Draft from Scorecard'}
                </span>
              </button>

              {!isEditingNarrative ? (
                <button
                  type="button"
                  onClick={() => setIsEditingNarrative(true)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{lang === 'am' ? 'አስተካክል' : 'Edit Narrative'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveNarrativeClick}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{lang === 'am' ? 'አስቀምጥ' : 'Save Narrative'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Interactive Editor (Screen Only when Editing) */}
          {isEditingNarrative && (
            <div className="no-print grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {lang === 'am'
                    ? '1. ዋና ዋና የተመዘገቡ ስኬቶች (Key Achievements)'
                    : '1. Key Achievements & Highlights'}
                </label>
                <textarea
                  rows={4}
                  value={narrativeDraft.keyAchievements}
                  onChange={(e) =>
                    setNarrativeDraft((prev) => ({
                      ...prev,
                      keyAchievements: e.target.value,
                    }))
                  }
                  placeholder={
                    lang === 'am'
                      ? 'በዚህ የምዘና ወቅት የተመዘገቡ ዋና ስኬቶችን ይጻፉ...'
                      : 'Summarize top KPI wins, major client conversions, and branch contributions...'
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {lang === 'am'
                    ? '2. የአፈጻጸም ልዩነት ምክንያቶች (Variance Context & Challenges)'
                    : '2. Variance Explanations & Operational Context'}
                </label>
                <textarea
                  rows={4}
                  value={narrativeDraft.varianceExplanations}
                  onChange={(e) =>
                    setNarrativeDraft((prev) => ({
                      ...prev,
                      varianceExplanations: e.target.value,
                    }))
                  }
                  placeholder={
                    lang === 'am'
                      ? 'ከእቅድ በታች የሆኑ መለኪያዎች ካሉ ምክንያታቸውን እና የተወሰዱ እርምጃዎችን ይግለጹ...'
                      : 'Note market factors, settlement timing, or operational context behind any KPI gaps...'
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {lang === 'am'
                    ? '3. የቀጣይ ወቅት የትኩረት አቅጣጫዎች (Next-Period Commitments)'
                    : '3. Next-Period Execution Commitments'}
                </label>
                <textarea
                  rows={4}
                  value={narrativeDraft.nextPeriodCommitments}
                  onChange={(e) =>
                    setNarrativeDraft((prev) => ({
                      ...prev,
                      nextPeriodCommitments: e.target.value,
                    }))
                  }
                  placeholder={
                    lang === 'am'
                      ? 'በቀጣይ ወር/ሩብ ዓመት የሚከናወኑ ዋና ተግባራትን ይዘርዝሩ...'
                      : 'Outline specific run-rate targets, prospect conversions, and follow-up actions...'
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                  {lang === 'am'
                    ? '4. የቅርብ ኃላፊ / ስራ አስኪያጅ አስተያየት (Supervisor Review Notes)'
                    : '4. Branch Manager / Supervisor Review Notes'}
                </label>
                <textarea
                  rows={4}
                  value={narrativeDraft.supervisorComments}
                  onChange={(e) =>
                    setNarrativeDraft((prev) => ({
                      ...prev,
                      supervisorComments: e.target.value,
                    }))
                  }
                  placeholder={
                    lang === 'am'
                      ? 'በግምገማ ወቅት የቅርብ ኃላፊዎ የሚሰጡትን አስተያየት እዚህ መመዝገብ ይችላሉ...'
                      : 'Optional space to record coaching feedback or supervisor comments during 1-on-1 review...'
                  }
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-3 py-2 text-xs leading-relaxed text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="md:col-span-2 flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNarrativeDraft(activeFy.appraisalNarrative || emptyNarrative);
                    setIsEditingNarrative(false);
                  }}
                  className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  {lang === 'am' ? 'ተው' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveNarrativeClick}
                  className="min-h-[38px] rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  {lang === 'am' ? 'ግለ-ግምገማ አስቀምጥ' : 'Save Narrative'}
                </button>
              </div>
            </div>
          )}

          {/* Clean Printable Prose Grid (Visible on screen when not editing, and ALWAYS visible in Print/PDF) */}
          <div
            className={`${
              isEditingNarrative ? 'hidden print:grid' : 'grid'
            } grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2 print:grid-cols-2 border-t border-slate-100 dark:border-slate-800 print:border-slate-200 pt-5`}
          >
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                {lang === 'am'
                  ? '1. ዋና ዋና የተመዘገቡ ስኬቶች'
                  : '1. Key Achievements & Highlights'}
              </h4>
              <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-700">
                {narrativeDraft.keyAchievements.trim() ||
                  (lang === 'am'
                    ? 'ገና አልተሞላም — «ከስኮርካርድ ረቂቅ አዘጋጅ» የሚለውን ይጫኑ።'
                    : 'Not yet recorded — click "Auto-Draft from Scorecard" or "Edit Narrative" to add.')}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                {lang === 'am'
                  ? '2. የአፈጻጸም ልዩነት ምክንያቶች እና ተግዳሮቶች'
                  : '2. Variance Explanations & Operational Context'}
              </h4>
              <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-700">
                {narrativeDraft.varianceExplanations.trim() ||
                  (lang === 'am'
                    ? 'የተመዘገበ የልዩነት ማብራሪያ የለም።'
                    : 'No variance notes recorded for this appraisal horizon.')}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 print:border-slate-200 pt-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                {lang === 'am'
                  ? '3. የቀጣይ ወቅት የትኩረት አቅጣጫዎች እና ቃል ኪዳኖች'
                  : '3. Next-Period Execution Commitments'}
              </h4>
              <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-700">
                {narrativeDraft.nextPeriodCommitments.trim() ||
                  (lang === 'am'
                    ? 'የቀጣይ ወቅት የትኩረት ነጥቦች ገና አልተመዘገቡም።'
                    : 'No next-period commitments recorded yet.')}
              </p>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 print:border-slate-200 pt-4">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white print:text-slate-900">
                {lang === 'am'
                  ? '4. የቅርብ ኃላፊ / ስራ አስኪያጅ አስተያየት'
                  : '4. Branch Manager / Supervisor Review Notes'}
              </h4>
              {narrativeDraft.supervisorComments.trim() ? (
                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300 print:text-slate-700">
                  {narrativeDraft.supervisorComments}
                </p>
              ) : (
                <div className="mt-2 space-y-3">
                  <p className="no-print text-xs text-slate-400 dark:text-slate-500">
                    {lang === 'am'
                      ? 'በግምገማ ውይይት ወቅት ለሚሞላ የኃላፊ አስተያየት ክፍት ቦታ (በPDF ህትመት ላይ መስመር ይወጣል)።'
                      : 'Reserved for supervisor review feedback (lined space appears automatically when printed to PDF).'}
                  </p>
                  <div className="hidden print:block space-y-4 pt-2">
                    <div className="border-b border-dashed border-slate-300" />
                    <div className="border-b border-dashed border-slate-300" />
                  </div>
                </div>
              )}
            </div>
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
