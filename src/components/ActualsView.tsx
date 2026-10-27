import React, { useMemo, useState } from 'react';
import { Calendar, Plus, Trash2 } from 'lucide-react';
import {
  ActualLogEntry,
  EmployeeProfile,
  KpiCategoryDef,
  KpiItem,
  QuarterKey,
} from '../types/kpi';
import {
  computeAchievementPct,
  getKpiMonthActualInfo,
} from '../utils/analytics';
import {
  formatKpiValue,
  getCategoryLabel,
  getFiscalMonths,
  QUARTER_MONTH_INDICES,
  QUARTERS,
} from '../utils/i18n';

interface ActualsViewProps {
  profile: EmployeeProfile;
  kpis: KpiItem[];
  categories: KpiCategoryDef[];
  logs: ActualLogEntry[];
  onSetMonthlyActualTotal: (kpiId: string, monthIndex: number, targetTotal: number) => void;
  onClearMonthlyActual: (kpiId: string, monthIndex: number) => void;
  onDeleteLog: (logId: string) => void;
  onOpenLogModal: (kpiId?: string, monthIndex?: number) => void;
}

export const ActualsView: React.FC<ActualsViewProps> = ({
  profile,
  kpis,
  categories,
  logs,
  onSetMonthlyActualTotal,
  onClearMonthlyActual,
  onDeleteLog,
  onOpenLogModal,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const defaultQuarter = fiscalMonths[profile.activeMonthIndex]?.quarter || 'Q1';

  const [mode, setMode] = useState<'sheet' | 'logs'>('sheet');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>(defaultQuarter);
  const [filterKpiId, setFilterKpiId] = useState<string>('all');
  const [filterMonthIdx, setFilterMonthIdx] = useState<string>('all');
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState<string | null>(null);

  const quarterMonthIndices = QUARTER_MONTH_INDICES[selectedQuarter];

  const filteredLogs = useMemo(() => {
    return [...logs]
      .filter((entry) => {
        if (filterKpiId !== 'all' && entry.kpiId !== filterKpiId) return false;
        if (filterMonthIdx !== 'all' && entry.monthIndex !== Number(filterMonthIdx)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [logs, filterKpiId, filterMonthIdx]);

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'am'
              ? '3. ክንውን መመዝገቢያ (Actual Performance Input)'
              : '3. Actual Performance Input & Activity Log'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? 'ወርሃዊ ክንውንዎን በቀጥታ በሰንጠረዥ ውስጥ ይጻፉ ወይም የዕለት/ሳምንት ስራዎን በዝርዝር ይመዝግቡ።'
              : 'Enter monthly actual figures directly in the matrix or log individual daily/weekly achievements.'}
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
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'am' ? 'አዲስ ክንውን መዝግብ' : 'Log Actual Entry'}</span>
          </button>
        </div>
      </div>

      {mode === 'sheet' ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'ወርሃዊ እቅድ እና ክንውን ቀጥታ ማስገቢያ ሰንጠረዥ'
                  : 'Direct Monthly Plan vs. Actual Spreadsheet'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'በእያንዳንዱ ወር ሳጥን ውስጥ ትክክለኛውን ክንውን (Actual) በቀጥታ ይጻፉ፤ ወዲያውኑ በመሳሪያዎ ላይ ይቀመጣል።'
                  : 'Type actual figures directly into any month cell — automatically saved offline.'}
              </p>
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800 p-1 self-start sm:self-auto">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setSelectedQuarter(q)}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedQuarter === q
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3 min-w-[210px]">
                    {lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}
                  </th>
                  {quarterMonthIndices.map((mIdx) => {
                    const meta = fiscalMonths[mIdx];
                    return (
                      <th key={mIdx} className="px-3 py-3 min-w-[180px]">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {lang === 'am' ? meta.fullAm : meta.fullEn}
                        </div>
                        <div className="text-[10px] font-normal text-slate-500 dark:text-slate-400">
                          {lang === 'am' ? 'እቅድ ከላይ · ክንውን ከታች' : 'Plan top · Actual input below'}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {kpis.map((kpi) => (
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
                    </td>

                    {quarterMonthIndices.map((mIdx) => {
                      const mTarget = kpi.monthlyTargets[mIdx] ?? 0;
                      const mInfo = getKpiMonthActualInfo(kpi.id, mIdx, logs);
                      const achPct = computeAchievementPct(
                        kpi,
                        mTarget,
                        mInfo.value,
                        mInfo.hasData
                      );

                      return (
                        <td key={mIdx} className="px-3 py-4 align-top">
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                            <span>
                              {lang === 'am' ? 'እቅድ፦ ' : 'Plan: '}
                              <strong className="font-mono text-slate-700 dark:text-slate-200 tabular-nums">
                                {formatKpiValue(mTarget, kpi.unit, true)}
                              </strong>
                            </span>
                            {mInfo.hasData && (
                              <span
                                className={`font-mono font-bold tabular-nums ${
                                  achPct >= 100
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : achPct >= 85
                                      ? 'text-blue-700 dark:text-blue-400'
                                      : achPct >= 70
                                        ? 'text-amber-700 dark:text-amber-400'
                                        : 'text-red-700 dark:text-red-400'
                                }`}
                              >
                                {achPct.toFixed(0)}%
                              </span>
                            )}
                          </div>

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
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የተመዘገቡ የዕለት እና ወርሃዊ ክንውኖች ዝርዝር'
                  : 'Recorded Performance Entries'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'በየቀኑ ወይም በየሳምንቱ የሚያከናውኗቸውን ስራዎች ከማስታወሻ ጋር እዚህ መከታተል ይችላሉ።'
                  : 'Chronological audit trail of logged actual achievements across KPIs.'}
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
                    <th className="px-3 py-3 text-right">{lang === 'am' ? 'መጠን / ውጤት' : 'Recorded Value'}</th>
                    <th className="px-3 py-3">{lang === 'am' ? 'ማብራሪያ / ማስታወሻ' : 'Note / Reference'}</th>
                    <th className="py-3 pl-3 pr-5 text-right">{lang === 'am' ? 'አጥፋ' : 'Remove'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {filteredLogs.map((entry) => {
                    const kpi = kpis.find((k) => k.id === entry.kpiId);
                    const monthMeta = fiscalMonths[entry.monthIndex];
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
