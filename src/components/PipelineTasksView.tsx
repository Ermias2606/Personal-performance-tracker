import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ListTodo,
  Plus,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import {
  ActionTaskItem,
  ActualLogEntry,
  EmployeeProfile,
  KpiCategoryDef,
  KpiItem,
  ProspectItem,
  ProspectStage,
  TaskPriority,
} from '../types/kpi';
import { getKpiMonthActualInfo } from '../utils/analytics';
import { formatEthiopianDate } from '../utils/ethiopianCalendar';
import { formatKpiValue, getCategoryLabel, getFiscalMonths } from '../utils/i18n';
import { PipelineFunnelIcon } from './BrandIcons';
import { EthiopianDateInput } from './WorkingCalendarModal';

interface PipelineTasksViewProps {
  profile: EmployeeProfile;
  kpis: KpiItem[];
  logs: ActualLogEntry[];
  categories: KpiCategoryDef[];
  prospects: ProspectItem[];
  actionTasks: ActionTaskItem[];
  initialKpiId?: string | null;
  onSaveProspect: (item: ProspectItem) => void;
  onDeleteProspect: (prospectId: string) => void;
  onConvertProspectToActual: (prospectId: string) => void;
  onSaveTask: (task: ActionTaskItem) => void;
  onDeleteTask: (taskId: string) => void;
}

const STAGE_DEFAULT_PROBABILITY: Record<ProspectStage, number> = {
  lead: 25,
  follow_up: 50,
  committed: 80,
  won: 100,
  lost: 0,
};

export const PipelineTasksView: React.FC<PipelineTasksViewProps> = ({
  profile,
  kpis,
  logs,
  categories,
  prospects,
  actionTasks,
  initialKpiId,
  onSaveProspect,
  onDeleteProspect,
  onConvertProspectToActual,
  onSaveTask,
  onDeleteTask,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(profile.activeMonthIndex);
  const [stageFilter, setStageFilter] = useState<'active' | 'all' | 'won'>('active');
  const [kpiFilter, setKpiFilter] = useState<string>(initialKpiId || 'all');

  // New Prospect Form State
  const [showAddProspect, setShowAddProspect] = useState<boolean>(false);
  const volumeKpis = useMemo(
    () => kpis.filter((k) => k.direction === 'higher_better'),
    [kpis]
  );
  const [pClientName, setPClientName] = useState('');
  const [pKpiId, setPKpiId] = useState<string>(
    initialKpiId || volumeKpis[0]?.id || kpis[0]?.id || ''
  );
  const [pValue, setPValue] = useState('');
  const [pStage, setPStage] = useState<ProspectStage>('follow_up');
  const [pTargetDate, setPTargetDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [pNote, setPNote] = useState('');

  // New Action Task Form State
  const [tTitle, setTTitle] = useState('');
  const [tKpiId, setTKpiId] = useState<string>('');
  const [tPriority, setTPriority] = useState<TaskPriority>('high');
  const [tDueDate, setTDueDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [taskFilter, setTaskFilter] = useState<'open' | 'completed' | 'all'>('open');

  const monthMeta = fiscalMonths[selectedMonthIdx] || fiscalMonths[0];

  // Per-KPI Remaining Monthly Gap vs Weighted Pipeline Coverage
  const coverageRows = useMemo(() => {
    return volumeKpis.map((kpi) => {
      const monthTarget = kpi.monthlyTargets[selectedMonthIdx] ?? 0;
      const actualInfo = getKpiMonthActualInfo(kpi.id, selectedMonthIdx, logs);
      const remainingGap = Math.max(0, monthTarget - actualInfo.value);

      const activeLeads = prospects.filter(
        (p) =>
          p.kpiId === kpi.id &&
          p.monthIndex === selectedMonthIdx &&
          p.stage !== 'won' &&
          p.stage !== 'lost'
      );

      const rawPipeline = activeLeads.reduce((s, p) => s + p.expectedValue, 0);
      const weightedPipeline = activeLeads.reduce(
        (s, p) => s + (p.expectedValue * p.probabilityPct) / 100,
        0
      );

      const coveragePct =
        remainingGap > 0
          ? (weightedPipeline / remainingGap) * 100
          : monthTarget > 0
            ? 100
            : 0;

      const uncoveredGap = Math.max(0, remainingGap - weightedPipeline);

      return {
        kpi,
        monthTarget,
        monthActual: actualInfo.value,
        remainingGap,
        leadCount: activeLeads.length,
        rawPipeline,
        weightedPipeline,
        coveragePct,
        uncoveredGap,
      };
    });
  }, [volumeKpis, selectedMonthIdx, logs, prospects]);

  const filteredProspects = useMemo(() => {
    return prospects
      .filter((p) => p.monthIndex === selectedMonthIdx)
      .filter((p) => (kpiFilter === 'all' ? true : p.kpiId === kpiFilter))
      .filter((p) => {
        if (stageFilter === 'active') return p.stage !== 'won' && p.stage !== 'lost';
        if (stageFilter === 'won') return p.stage === 'won';
        return true;
      })
      .sort((a, b) => b.probabilityPct - a.probabilityPct || b.createdAt - a.createdAt);
  }, [prospects, selectedMonthIdx, kpiFilter, stageFilter]);

  const filteredTasks = useMemo(() => {
    const priorityRank: Record<TaskPriority, number> = { high: 0, medium: 1, normal: 2 };
    return [...actionTasks]
      .filter((t) => {
        if (taskFilter === 'open') return !t.completed;
        if (taskFilter === 'completed') return t.completed;
        return true;
      })
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return priorityRank[a.priority] - priorityRank[b.priority];
      });
  }, [actionTasks, taskFilter]);

  const activeLeadsInMonth = prospects.filter(
    (p) => p.monthIndex === selectedMonthIdx && p.stage !== 'won' && p.stage !== 'lost'
  );
  const wonLeadsInMonth = prospects.filter(
    (p) => p.monthIndex === selectedMonthIdx && p.stage === 'won'
  );
  const openTasksCount = actionTasks.filter((t) => !t.completed).length;
  const highPriorityOpenCount = actionTasks.filter(
    (t) => !t.completed && t.priority === 'high'
  ).length;
  const coveredKpiCount = coverageRows.filter(
    (r) => r.remainingGap === 0 || r.coveragePct >= 80
  ).length;

  const handleCreateProspect = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = Number(pValue);
    if (!pClientName.trim() || !pKpiId || Number.isNaN(numericVal) || numericVal <= 0) return;

    const newProspect: ProspectItem = {
      id: `pros-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kpiId: pKpiId,
      monthIndex: selectedMonthIdx,
      clientName: pClientName.trim(),
      contactNote: pNote.trim(),
      expectedValue: numericVal,
      probabilityPct: STAGE_DEFAULT_PROBABILITY[pStage],
      stage: pStage,
      targetDate: pTargetDate,
      createdAt: Date.now(),
    };

    onSaveProspect(newProspect);
    setPClientName('');
    setPValue('');
    setPNote('');
    setShowAddProspect(false);
  };

  const handleStageChange = (item: ProspectItem, nextStage: ProspectStage) => {
    onSaveProspect({
      ...item,
      stage: nextStage,
      probabilityPct: STAGE_DEFAULT_PROBABILITY[nextStage],
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim()) return;
    onSaveTask({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kpiId: tKpiId || undefined,
      title: tTitle.trim(),
      dueDate: tDueDate,
      priority: tPriority,
      completed: false,
      createdAt: Date.now(),
    });
    setTTitle('');
  };

  const getStageLabel = (stage: ProspectStage) => {
    const map: Record<ProspectStage, { am: string; en: string }> = {
      lead: { am: 'አዲስ ጥቆማ (25%)', en: 'Initial Lead (25%)' },
      follow_up: { am: 'በክትትል ላይ (50%)', en: 'In Follow-Up (50%)' },
      committed: { am: 'ቃል የተገባ (80%)', en: 'Committed (80%)' },
      won: { am: 'ተሳክቷል (100%)', en: 'Won / Closed (100%)' },
      lost: { am: 'አልተሳካም (0%)', en: 'Lost / Deferred' },
    };
    return map[stage][lang];
  };

  return (
    <div className="space-y-8">
      {/* Page Header & Month Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <PipelineFunnelIcon className="h-6 w-6 shrink-0" />
            <h1
              className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
              style={{ textWrap: 'balance' }}
            >
              {lang === 'am'
                ? 'የደንበኞች ፓይፕላይን እና የKPI ተግባራት ዝርዝር'
                : 'KPI Prospect Pipeline & Personal Action Tasks'}
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? 'ተስፋ ሰጪ ደንበኞችን (Prospects) ከወርሃዊ ቀሪ የKPI ክፍተት (Gap) አንጻር ይከታተሉ፤ ሲሳኩ በአንድ ክሊክ ወደ ክንውን ይቀይሩ።'
              : 'Track prospective client deals against your remaining monthly KPI gaps and convert won leads directly into actual logs.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            aria-label={lang === 'am' ? 'የበጀት ወር ይምረጡ' : 'Select Fiscal Month'}
            value={selectedMonthIdx}
            onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
            className="min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden cursor-pointer"
          >
            {fiscalMonths.map((m) => (
              <option key={m.index} value={m.index}>
                {lang === 'am' ? m.fullAm : m.fullEn}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowAddProspect((prev) => !prev)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'am' ? 'አዲስ ደንበኛ (Prospect) መዝግብ' : 'Add Prospect Lead'}</span>
          </button>
        </div>
      </div>

      {/* 4-Column Pipeline & Execution Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? `ንቁ ደንበኞች (${monthMeta.shortAm})`
              : `Active Month Leads (${monthMeta.shortEn})`}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {activeLeadsInMonth.length}
            </span>
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              {activeLeadsInMonth.filter((p) => p.stage === 'committed').length}{' '}
              {lang === 'am' ? 'ቃል የተገቡ (80%)' : 'committed (80%)'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? 'በክትትል እና በድርድር ላይ ያሉ ደንበኞች'
              : 'Prospective deals currently in follow-up'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'የKPI ክፍተት ሽፋን (Gap Coverage)' : 'KPIs Covered by Pipeline'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {coveredKpiCount}
              <span className="text-lg font-normal text-slate-400">/{coverageRows.length}</span>
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {lang === 'am' ? '≥80% የተሸፈኑ' : '≥80% covered'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? 'በእድል ክብደት (Weighted) ቀሪ ግባቸው የተሸፈነ'
              : 'Target gaps backed by weighted leads'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'ያልተጠናቀቁ የስራ ተግባራት' : 'Open Action Tasks'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {openTasksCount}
            </span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {highPriorityOpenCount} {lang === 'am' ? 'ከፍተኛ ቅድሚያ' : 'high priority'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {actionTasks.filter((t) => t.completed).length}{' '}
            {lang === 'am' ? 'ተግባራት ተጠናቅቀዋል' : 'tasks completed'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {lang === 'am' ? 'ወደ ክንውን የተቀየሩ (Won)' : 'Closed & Converted Leads'}
          </p>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="font-mono text-3xl font-bold tabular-nums text-slate-900 dark:text-white">
              {wonLeadsInMonth.length}
            </span>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              {wonLeadsInMonth.filter((w) => Boolean(w.convertedLogId)).length}{' '}
              {lang === 'am' ? 'ተመዝግበዋል' : 'logged'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? 'በቀጥታ ወደ ወርሃዊ ክንውን የተሸጋገሩ'
              : 'Converted into official KPI actuals'}
          </p>
        </div>
      </div>

      {/* Add Prospect Collapsible Panel */}
      {showAddProspect && (
        <form
          onSubmit={handleCreateProspect}
          className="rounded-xl border border-blue-200 dark:border-blue-900/70 bg-white dark:bg-slate-900 p-6 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? `አዲስ ተስፋ ሰጪ ደንበኛ (Prospect) መዝግብ — ${monthMeta.fullAm}`
                : `New Prospect Lead for ${monthMeta.fullEn}`}
            </h2>
            <button
              type="button"
              onClick={() => setShowAddProspect(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
            >
              {lang === 'am' ? 'ዝጋ' : 'Close'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-start">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የደንበኛ / ድርጅት ስም' : 'Client / Organization Name'}
              </label>
              <input
                type="text"
                required
                value={pClientName}
                onChange={(e) => setPClientName(e.target.value)}
                placeholder={
                  lang === 'am'
                    ? 'ምሳሌ፦ ዘመን ትሬዲንግ ኃ/የተ/የግ/ማ...'
                    : 'e.g., Zemen Import & Export PLC...'
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የKPI መለኪያ' : 'Linked KPI'}
              </label>
              <select
                value={pKpiId}
                onChange={(e) => setPKpiId(e.target.value)}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              >
                {(volumeKpis.length > 0 ? volumeKpis : kpis).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code} — {k.name} ({k.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የሚጠበቅ መጠን' : 'Expected Value'}
              </label>
              <input
                type="number"
                step="any"
                min="0"
                required
                value={pValue}
                onChange={(e) => setPValue(e.target.value)}
                placeholder="0"
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የድርድር ደረጃ (Stage)' : 'Pipeline Stage'}
              </label>
              <select
                value={pStage}
                onChange={(e) => setPStage(e.target.value as ProspectStage)}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              >
                <option value="lead">{getStageLabel('lead')}</option>
                <option value="follow_up">{getStageLabel('follow_up')}</option>
                <option value="committed">{getStageLabel('committed')}</option>
              </select>
            </div>

            <div className="sm:col-span-5">
              <EthiopianDateInput
                valueIso={pTargetDate}
                onChangeIso={setPTargetDate}
                lang={lang}
                label={lang === 'am' ? 'የሚጠናቀቅበት ቀን' : 'Expected Closing Date'}
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የክትትል ማስታወሻ' : 'Follow-Up / Contact Note'}
              </label>
              <input
                type="text"
                value={pNote}
                onChange={(e) => setPNote(e.target.value)}
                placeholder={
                  lang === 'am' ? 'ስልክ / ቀጣይ እርምጃ...' : 'Contact person / next step...'
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAddProspect(false)}
              className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {lang === 'am' ? 'ይቅር' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="min-h-[40px] rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {lang === 'am' ? 'ወደ ፓይፕላይን አስገባ' : 'Save Prospect'}
            </button>
          </div>
        </form>
      )}

      {/* Section 1: Remaining Monthly Gap vs Weighted Pipeline Coverage Matrix */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 p-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === 'am'
              ? `1. የወሩ ቀሪ የKPI ግብ ከፓይፕላይን ሽፋን ጋር (${monthMeta.fullAm})`
              : `1. Remaining Monthly KPI Gap vs. Weighted Pipeline Coverage (${monthMeta.fullEn})`}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'am'
              ? 'በእጅዎ ያሉ ተስፋ ሰጪ ደንበኞች (Weighted by Probability %) የወሩን ቀሪ ክፍተት ለመሙላት በቂ መሆናቸውን ያረጋግጡ።'
              : 'Evaluates whether your active probability-weighted prospects are sufficient to close each KPI’s remaining monthly gap.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <th className="py-3 pl-5 pr-3">{lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'ወርሃዊ እቅድ' : 'Month Target'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'እስካሁን ክንውን' : 'MTD Actual'}</th>
                <th className="px-3 py-3 text-right">{lang === 'am' ? 'ቀሪ ክፍተት (Gap)' : 'Remaining Gap'}</th>
                <th className="px-3 py-3 text-right">
                  {lang === 'am' ? 'ጠቅላላ ፓይፕላይን' : 'Raw Pipeline'}
                </th>
                <th className="px-3 py-3 text-right">
                  {lang === 'am' ? 'ክብደት ያለው ፓይፕላይን' : 'Weighted Pipeline'}
                </th>
                <th className="py-3 pl-3 pr-5">{lang === 'am' ? 'የሽፋን ሁኔታ' : 'Gap Coverage'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {coverageRows.map((row) => (
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
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>
                        {row.leadCount} {lang === 'am' ? 'ደንበኞች' : 'leads'}
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatKpiValue(row.monthTarget, row.kpi.unit, true)}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                    {formatKpiValue(row.monthActual, row.kpi.unit, true)}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono font-semibold tabular-nums text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {row.remainingGap > 0
                      ? formatKpiValue(row.remainingGap, row.kpi.unit, true)
                      : lang === 'am'
                        ? 'ተሳክቷል'
                        : '0 (Met)'}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {row.rawPipeline > 0
                      ? formatKpiValue(row.rawPipeline, row.kpi.unit, true)
                      : '—'}
                  </td>

                  <td className="px-3 py-3.5 text-right font-mono font-bold tabular-nums text-blue-700 dark:text-blue-400 whitespace-nowrap">
                    {row.weightedPipeline > 0
                      ? formatKpiValue(row.weightedPipeline, row.kpi.unit, true)
                      : '—'}
                  </td>

                  <td className="py-3.5 pl-3 pr-5 whitespace-nowrap">
                    {row.remainingGap <= 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>{lang === 'am' ? 'ወርሃዊ እቅድ ተሳክቷል' : 'Target Already Met'}</span>
                      </span>
                    ) : row.coveragePct >= 100 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {lang === 'am'
                            ? `ሙሉ ሽፋን (${row.coveragePct.toFixed(0)}%)`
                            : `Fully Covered (${row.coveragePct.toFixed(0)}%)`}
                        </span>
                      </span>
                    ) : row.coveragePct > 0 ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {lang === 'am'
                            ? `${row.coveragePct.toFixed(0)}% ሽፋን · ቀሪ ${formatKpiValue(row.uncoveredGap, row.kpi.unit, true)}`
                            : `${row.coveragePct.toFixed(0)}% covered · Need ${formatKpiValue(row.uncoveredGap, row.kpi.unit, true)}`}
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                        <span>
                          {lang === 'am' ? 'ፓይፕላይን አልተመዘገበም' : 'No active leads logged'}
                        </span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column Split: Prospect Pipeline (7 cols) + Personal Action Checklist (5 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left: Client & Deal Prospect Queue */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? `2. የተስፋ ሰጪ ደንበኞች ዝርዝር (${monthMeta.shortAm})`
                  : `2. Prospect Pipeline Queue (${monthMeta.shortEn})`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'ደንበኛው ሲሳካ "ወደ ክንውን ቀይር" በመጫን በቀጥታ ወደ Actuals ያስገቡ'
                  : 'Click "Convert to Actual" when a deal closes to post it directly to Actuals'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={kpiFilter}
                onChange={(e) => setKpiFilter(e.target.value)}
                className="min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="all">{lang === 'am' ? 'ሁሉም KPIs' : 'All KPIs'}</option>
                {volumeKpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code}
                  </option>
                ))}
              </select>

              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
                {(
                  [
                    { key: 'active', am: 'ንቁ', en: 'Active' },
                    { key: 'won', am: 'የተሳኩ', en: 'Won' },
                    { key: 'all', am: 'ሁሉም', en: 'All' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStageFilter(tab.key)}
                    className={`rounded-md px-2.5 py-1 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      stageFilter === tab.key
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'am' ? tab.am : tab.en}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'በዚህ ወር እና ማጣሪያ የተመዘገበ ደንበኛ (Prospect) የለም።'
                  : 'No prospects recorded for this month and filter.'}
              </p>
              <button
                type="button"
                onClick={() => setShowAddProspect(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:border-blue-600 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'የመጀመሪያውን ደንበኛ መዝግብ' : 'Add First Prospect'}</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProspects.map((item) => {
                const kpi = kpis.find((k) => k.id === item.kpiId);
                const weightedVal = (item.expectedValue * item.probabilityPct) / 100;
                return (
                  <div key={item.id} className="p-5 space-y-2.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.clientName}
                        </div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {kpi ? `${kpi.code} · ${kpi.name}` : item.kpiId}
                          </span>
                          <span className="mx-1.5" aria-hidden="true">·</span>
                          <span>
                            {lang === 'am' ? 'ቀጠሮ፦ ' : 'Target: '}
                            {formatEthiopianDate(item.targetDate, lang, false)}
                          </span>
                        </div>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white">
                          {kpi
                            ? formatKpiValue(item.expectedValue, kpi.unit)
                            : item.expectedValue.toLocaleString()}
                        </div>
                        {item.stage !== 'won' && item.stage !== 'lost' && kpi && (
                          <div className="font-mono text-[11px] tabular-nums text-blue-700 dark:text-blue-400">
                            {lang === 'am' ? 'ክብደት ያለው፦ ' : 'Weighted: '}
                            {formatKpiValue(weightedVal, kpi.unit, true)} ({item.probabilityPct}%)
                          </div>
                        )}
                      </div>
                    </div>

                    {item.contactNote && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {item.contactNote}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <select
                        aria-label={lang === 'am' ? 'የደንበኛ ደረጃ' : 'Prospect Stage'}
                        value={item.stage}
                        onChange={(e) =>
                          handleStageChange(item, e.target.value as ProspectStage)
                        }
                        className="min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                      >
                        <option value="lead">{getStageLabel('lead')}</option>
                        <option value="follow_up">{getStageLabel('follow_up')}</option>
                        <option value="committed">{getStageLabel('committed')}</option>
                        <option value="won">{getStageLabel('won')}</option>
                        <option value="lost">{getStageLabel('lost')}</option>
                      </select>

                      <div className="flex items-center gap-2">
                        {item.convertedLogId ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>
                              {lang === 'am' ? 'ወደ ክንውን ተመዝግቧል' : 'Converted to Actual'}
                            </span>
                          </span>
                        ) : (
                          item.stage !== 'lost' && (
                            <button
                              type="button"
                              onClick={() => onConvertProspectToActual(item.id)}
                              className="inline-flex min-h-[34px] items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              <span>
                                {lang === 'am' ? 'ወደ ክንውን ቀይር' : 'Convert to Actual'}
                              </span>
                            </button>
                          )
                        )}

                        <button
                          type="button"
                          onClick={() => onDeleteProspect(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors cursor-pointer"
                          title={lang === 'am' ? 'ሰርዝ' : 'Delete'}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Personal KPI Action Checklist */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am' ? '3. የግል የድርጊት መርሐ-ግብር' : '3. Personal Action Checklist'}
              </h2>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs">
              {(
                [
                  { key: 'open', am: 'ቀሪ', en: 'Open' },
                  { key: 'completed', am: 'የተጠናቀቁ', en: 'Done' },
                  { key: 'all', am: 'ሁሉም', en: 'All' },
                ] as const
              ).map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setTaskFilter(f.key)}
                  className={`rounded-md px-2 py-1 font-semibold transition-colors cursor-pointer ${
                    taskFilter === f.key
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lang === 'am' ? f.am : f.en}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Add Task Form */}
          <form
            onSubmit={handleCreateTask}
            className="border-b border-slate-100 dark:border-slate-800 p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-800/30"
          >
            <input
              type="text"
              value={tTitle}
              onChange={(e) => setTTitle(e.target.value)}
              placeholder={
                lang === 'am'
                  ? 'አዲስ የዕለት/ሳምንት ተግባር ይጻፉ...'
                  : 'Add concrete KPI follow-up action...'
              }
              className="w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
            />
            <div className="grid grid-cols-12 gap-2">
              <select
                value={tKpiId}
                onChange={(e) => setTKpiId(e.target.value)}
                className="col-span-5 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="">{lang === 'am' ? 'አጠቃላይ ተግባር' : 'General KPI Task'}</option>
                {kpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code}
                  </option>
                ))}
              </select>

              <select
                value={tPriority}
                onChange={(e) => setTPriority(e.target.value as TaskPriority)}
                className="col-span-4 min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-slate-700 dark:text-slate-200"
              >
                <option value="high">{lang === 'am' ? 'ከፍተኛ ቅድሚያ' : 'High Priority'}</option>
                <option value="medium">{lang === 'am' ? 'መካከለኛ' : 'Medium'}</option>
                <option value="normal">{lang === 'am' ? 'መደበኛ' : 'Normal'}</option>
              </select>

              <button
                type="submit"
                className="col-span-3 inline-flex min-h-[36px] items-center justify-center gap-1 rounded-lg bg-slate-900 dark:bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'ጨምር' : 'Add'}</span>
              </button>
            </div>
            <div className="pt-0.5">
              <input
                type="date"
                aria-label={lang === 'am' ? 'የማጠናቀቂያ ቀን' : 'Task Due Date'}
                value={tDueDate}
                onChange={(e) => {
                  if (e.target.value) setTDueDate(e.target.value);
                }}
                className="w-full min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300"
              />
            </div>
          </form>

          {filteredTasks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'ምንም ተግባር በዚህ ዝርዝር ውስጥ የለም።'
                : 'No tasks in this view.'}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTasks.map((task) => {
                const kpi = task.kpiId ? kpis.find((k) => k.id === task.kpiId) : undefined;
                return (
                  <div
                    key={task.id}
                    className="flex items-start justify-between gap-3 p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onSaveTask({
                          ...task,
                          completed: !task.completed,
                          completedAt: !task.completed ? Date.now() : undefined,
                        })
                      }
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer ${
                        task.completed
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                      }`}
                      aria-label={lang === 'am' ? 'ተግባር አጠናቅቅ' : 'Toggle task complete'}
                    >
                      {task.completed && <Check className="h-3.5 w-3.5" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium leading-relaxed ${
                          task.completed
                            ? 'line-through text-slate-400 dark:text-slate-500'
                            : 'text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {kpi && <span className="font-mono font-semibold">{kpi.code}</span>}
                        {kpi && <span aria-hidden="true">·</span>}
                        <span
                          className={
                            task.priority === 'high'
                              ? 'font-semibold text-amber-700 dark:text-amber-400'
                              : task.priority === 'medium'
                                ? 'font-medium text-blue-700 dark:text-blue-400'
                                : ''
                          }
                        >
                          {task.priority === 'high'
                            ? lang === 'am'
                              ? 'ከፍተኛ ቅድሚያ'
                              : 'High Priority'
                            : task.priority === 'medium'
                              ? lang === 'am'
                                ? 'መካከለኛ'
                                : 'Medium'
                              : lang === 'am'
                                ? 'መደበኛ'
                                : 'Normal'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{formatEthiopianDate(task.dueDate, lang, false)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTask(task.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                      title={lang === 'am' ? 'ሰርዝ' : 'Delete task'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
