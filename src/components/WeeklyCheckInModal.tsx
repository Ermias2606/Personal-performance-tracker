import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, ClipboardCheck, Flame, X } from 'lucide-react';
import {
  ActualLogEntry,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiItem,
  WeeklyCheckInSettings,
} from '../types/kpi';
import {
  computeAchievementPct,
  computeWeeklyConsistency,
  getKpiMonthActualInfo,
} from '../utils/analytics';
import {
  formatEthiopianDate,
  getEffectiveMonthWorkingConfig,
} from '../utils/ethiopianCalendar';
import { formatKpiValue, getFiscalMonths } from '../utils/i18n';
import { roundForKpiUnit } from '../utils/planCascade';
import { EthiopianDateInput } from './WorkingCalendarModal';

interface WeeklyCheckInModalProps {
  isOpen: boolean;
  profile: EmployeeProfile;
  activeFy: FiscalYearWorkspace;
  kpis: KpiItem[];
  logs: ActualLogEntry[];
  checkInSettings: WeeklyCheckInSettings;
  onClose: () => void;
  onBatchAddLogs: (entries: Omit<ActualLogEntry, 'id' | 'createdAt'>[]) => void;
  onUpdateCheckInSettings: (next: WeeklyCheckInSettings) => void;
}

export const WeeklyCheckInModal: React.FC<WeeklyCheckInModalProps> = ({
  isOpen,
  profile,
  activeFy,
  kpis,
  logs,
  checkInSettings,
  onClose,
  onBatchAddLogs,
  onUpdateCheckInSettings,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);
  const [monthIndex, setMonthIndex] = useState<number>(profile.activeMonthIndex);
  const [dateIso, setDateIso] = useState<string>(new Date().toISOString().slice(0, 10));
  const [valuesMap, setValuesMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [notifStatusMsg, setNotifStatusMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setMonthIndex(profile.activeMonthIndex);
      setDateIso(new Date().toISOString().slice(0, 10));
      setValuesMap({});
      setNotesMap({});
      setNotifStatusMsg('');
    }
  }, [isOpen, profile.activeMonthIndex]);

  const consistency = useMemo(
    () => computeWeeklyConsistency(kpis, logs, profile.activeMonthIndex, checkInSettings),
    [kpis, logs, profile.activeMonthIndex, checkInSettings]
  );

  const orderedKpis = useMemo(() => {
    const missingIds = new Set(consistency.missingKpis.map((k) => k.id));
    return [...kpis].sort((a, b) => {
      const aMissing = missingIds.has(a.id) ? 0 : 1;
      const bMissing = missingIds.has(b.id) ? 0 : 1;
      return aMissing - bMissing;
    });
  }, [kpis, consistency.missingKpis]);

  if (!isOpen) return null;

  const missingSet = new Set(consistency.missingKpis.map((k) => k.id));
  const netMonthConfig = getEffectiveMonthWorkingConfig(activeFy, monthIndex);
  const netWorkingDays = Math.max(1, netMonthConfig.netWorkingDays);
  const effectiveWeeksInMonth = Math.max(1, netWorkingDays / 6);

  const filledCount = Object.values(valuesMap).filter(
    (v) => v.trim() !== '' && !Number.isNaN(Number(v))
  ).length;

  const handleRequestBrowserReminder = async () => {
    const nextEnabled = !checkInSettings.reminderEnabled;
    if (nextEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            setNotifStatusMsg(
              lang === 'am'
                ? 'የብራውዘር ማስታወሻ ፈቃድ ተሰጥቷል።'
                : 'Browser notification reminders enabled.'
            );
          }
        }
      } catch {
        // Ignore iframe notification permission restrictions gracefully
      }
    }
    onUpdateCheckInSettings({
      ...checkInSettings,
      reminderEnabled: nextEnabled,
    });
  };

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    const entries: Omit<ActualLogEntry, 'id' | 'createdAt'>[] = [];
    for (const kpi of kpis) {
      const rawVal = valuesMap[kpi.id];
      if (!rawVal || rawVal.trim() === '') continue;
      const num = Number(rawVal);
      if (Number.isNaN(num)) continue;
      entries.push({
        kpiId: kpi.id,
        monthIndex,
        date: dateIso,
        value: num,
        note:
          (notesMap[kpi.id] || '').trim() ||
          (lang === 'am' ? 'ሳምንታዊ የKPI ክትትል ምዝገባ' : 'Weekly KPI check-in entry'),
      });
    }

    if (entries.length > 0) {
      onBatchAddLogs(entries);
    }
    onUpdateCheckInSettings({
      ...checkInSettings,
      lastCheckInAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'ፈጣን ሳምንታዊ የKPI ክንውን መመዝገቢያ (Weekly Batch Check-In)'
                  : 'Rapid Weekly KPI Check-In & Consistency Tracker'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatEthiopianDate(dateIso, lang)}</span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span>
                {lang === 'am'
                  ? `በዚህ ሳምንት የተመዘገቡ፦ ${consistency.updatedCount}/${consistency.totalKpis} KPIs`
                  : `Updated this week: ${consistency.updatedCount}/${consistency.totalKpis} KPIs`}
              </span>
              <span className="mx-1.5" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                <Flame className="h-3.5 w-3.5" />
                <span>
                  {lang === 'am'
                    ? `${consistency.streakWeeks} ተከታታይ ሳምንታት ልምድ`
                    : `${consistency.streakWeeks}-week logging streak`}
                </span>
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmitBatch} className="mt-5 space-y-5">
          {/* Date, Fiscal Month & Weekly Reminder Cadence */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-start border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የበጀት ወር' : 'Fiscal Month'}
              </label>
              <select
                value={monthIndex}
                onChange={(e) => setMonthIndex(Number(e.target.value))}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              >
                {fiscalMonths.map((m) => (
                  <option key={m.index} value={m.index}>
                    {lang === 'am' ? m.fullAm : m.fullEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-5">
              <EthiopianDateInput
                valueIso={dateIso}
                onChangeIso={setDateIso}
                lang={lang}
                label={lang === 'am' ? 'የምዝገባ ቀን' : 'Check-In Date'}
              />
            </div>

            <div className="sm:col-span-4 space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'ሳምንታዊ ማስታወሻ ቀን' : 'Weekly Reminder Day'}
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={checkInSettings.reminderDay}
                  onChange={(e) =>
                    onUpdateCheckInSettings({
                      ...checkInSettings,
                      reminderDay: e.target.value as WeeklyCheckInSettings['reminderDay'],
                    })
                  }
                  className="min-h-[40px] flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="friday">{lang === 'am' ? 'አርብ (Friday)' : 'Every Friday'}</option>
                  <option value="saturday">
                    {lang === 'am' ? 'ቅዳሜ (Saturday)' : 'Every Saturday'}
                  </option>
                  <option value="monday">{lang === 'am' ? 'ሰኞ (Monday)' : 'Every Monday'}</option>
                </select>

                <button
                  type="button"
                  onClick={handleRequestBrowserReminder}
                  className={`inline-flex min-h-[40px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    checkInSettings.reminderEnabled
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>{checkInSettings.reminderEnabled ? 'On' : 'Off'}</span>
                </button>
              </div>
              {notifStatusMsg && (
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  {notifStatusMsg}
                </p>
              )}
            </div>
          </div>

          {/* Batch Entry Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-3">{lang === 'am' ? 'የKPI መለኪያ' : 'KPI Indicator'}</th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">
                    {lang === 'am' ? 'ሳምንታዊ እቅድ' : 'Weekly Plan'}
                  </th>
                  <th className="px-2.5 py-2.5 text-right whitespace-nowrap">
                    {lang === 'am' ? 'እስካሁን / ወርሃዊ እቅድ' : 'MTD / Month Target'}
                  </th>
                  <th className="px-2.5 py-2.5 w-36">
                    {lang === 'am' ? 'አዲስ ክንውን (+)' : 'Add Value (+)'}
                  </th>
                  <th className="py-2.5 pl-2.5">
                    {lang === 'am' ? 'አጭር ማስታወሻ' : 'Quick Note'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {orderedKpis.map((kpi) => {
                  const mTarget = kpi.monthlyTargets[monthIndex] ?? 0;
                  const mActual = getKpiMonthActualInfo(kpi.id, monthIndex, logs);
                  const isMissingThisWeek = missingSet.has(kpi.id);
                  const isRate =
                    kpi.aggregation === 'average' || kpi.direction === 'lower_better';
                  const weeklyTarget =
                    mTarget <= 0
                      ? 0
                      : isRate
                        ? mTarget
                        : roundForKpiUnit(mTarget / effectiveWeeksInMonth, kpi.unit);

                  const currPct = computeAchievementPct(
                    kpi,
                    mTarget,
                    mActual.value,
                    mActual.hasData
                  );

                  const rawTyped = valuesMap[kpi.id];
                  const typedVal =
                    rawTyped && rawTyped.trim() !== '' && !Number.isNaN(Number(rawTyped))
                      ? Number(rawTyped)
                      : null;
                  const projectedTotal =
                    typedVal !== null ? mActual.value + typedVal : mActual.value;
                  const projectedPct =
                    typedVal !== null
                      ? computeAchievementPct(kpi, mTarget, projectedTotal, true)
                      : currPct;

                  return (
                    <tr key={kpi.id}>
                      <td className="py-3 pr-3 max-w-[215px]">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {kpi.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                          <span className="font-mono text-slate-500">{kpi.code}</span>
                          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                            ·
                          </span>
                          {isMissingThisWeek ? (
                            <span className="font-semibold text-amber-700 dark:text-amber-400">
                              {lang === 'am' ? 'በዚህ ሳምንት አልተሞላም' : 'Pending this week'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>{lang === 'am' ? 'ተመዝግቧል' : 'Logged this week'}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-2.5 py-3 text-right whitespace-nowrap">
                        {weeklyTarget > 0 ? (
                          <div>
                            <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                              {formatKpiValue(weeklyTarget, kpi.unit, true)}
                            </div>
                            {!isRate && (
                              <button
                                type="button"
                                onClick={() =>
                                  setValuesMap((prev) => ({
                                    ...prev,
                                    [kpi.id]: String(weeklyTarget),
                                  }))
                                }
                                className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              >
                                {lang === 'am' ? '+ ሙላ' : '+ Use Plan'}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-2.5 py-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div>
                          <strong className="text-slate-900 dark:text-white">
                            {formatKpiValue(mActual.value, kpi.unit, true)}
                          </strong>{' '}
                          / {formatKpiValue(mTarget, kpi.unit, true)}
                        </div>
                        {mTarget > 0 && (
                          <div className="mt-0.5 text-[10px]">
                            {typedVal !== null ? (
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {currPct.toFixed(0)}% → {projectedPct.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">
                                {currPct.toFixed(0)}% {lang === 'am' ? 'ክንውን' : 'MTD'}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-2.5 py-3">
                        <input
                          type="number"
                          step="any"
                          placeholder={`0 ${kpi.unit}`}
                          value={valuesMap[kpi.id] || ''}
                          onChange={(e) =>
                            setValuesMap((prev) => ({ ...prev, [kpi.id]: e.target.value }))
                          }
                          className="w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                        />
                      </td>

                      <td className="py-3 pl-2.5">
                        <input
                          type="text"
                          placeholder={lang === 'am' ? 'የሳምንቱ ስራ ማስታወሻ...' : 'Weekly note...'}
                          value={notesMap[kpi.id] || ''}
                          onChange={(e) =>
                            setNotesMap((prev) => ({ ...prev, [kpi.id]: e.target.value }))
                          }
                          className="w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {filledCount > 0
                ? lang === 'am'
                  ? `${filledCount} የKPI ክንውኖች በአንድ ጊዜ ይመዘገባሉ`
                  : `${filledCount} KPI entries ready to save`
                : lang === 'am'
                  ? 'ቁጥር የሞሉባቸው መለኪያዎች ብቻ ይመዘገባሉ'
                  : 'Only KPIs with a numeric value entered will be logged'}
            </span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                {lang === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="min-h-[42px] rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                {lang === 'am'
                  ? `ሳምንታዊ ክንውን አስቀምጥ (${filledCount})`
                  : `Save Weekly Check-In (${filledCount})`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
