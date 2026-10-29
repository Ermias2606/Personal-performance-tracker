import React, { useEffect, useState } from 'react';
import { CalendarDays, Plus, Trash2, X } from 'lucide-react';
import {
  EmployeeProfile,
  FiscalYearWorkspace,
  HolidayEntry,
  Language,
  MonthWorkingConfig,
} from '../types/kpi';
import {
  ETHIOPIAN_MONTH_NAMES,
  ethiopianToGregorianIso,
  formatEthiopianDate,
  getEffectiveMonthWorkingConfig,
  gregorianIsoToEthiopian,
  PRESET_ETHIOPIAN_PUBLIC_HOLIDAYS,
} from '../utils/ethiopianCalendar';
import { getFiscalMonths } from '../utils/i18n';

interface EthiopianDateInputProps {
  valueIso: string;
  onChangeIso: (nextIso: string) => void;
  lang: Language;
  label?: string;
}

export const EthiopianDateInput: React.FC<EthiopianDateInputProps> = ({
  valueIso,
  onChangeIso,
  lang,
  label,
}) => {
  const [mode, setMode] = useState<'eth' | 'greg'>(lang === 'am' ? 'eth' : 'greg');
  const eth = gregorianIsoToEthiopian(valueIso);
  const maxDaysInMonth = eth.month === 13 ? (eth.year % 4 === 3 ? 6 : 5) : 30;

  const handleEthChange = (nextYear: number, nextMonth: number, nextDay: number) => {
    const iso = ethiopianToGregorianIso(nextYear, nextMonth, nextDay);
    onChangeIso(iso);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {label}
          </span>
        ) : (
          <span />
        )}
        <div className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setMode('eth')}
            className={`rounded px-2 py-0.5 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'eth'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'am' ? 'ዓ.ም (ኢትዮ)' : 'Ethiopian (ዓ.ም)'}
          </button>
          <button
            type="button"
            onClick={() => setMode('greg')}
            className={`rounded px-2 py-0.5 font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              mode === 'greg'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Gregorian
          </button>
        </div>
      </div>

      {mode === 'eth' ? (
        <div className="grid grid-cols-12 gap-1.5">
          <select
            aria-label={lang === 'am' ? 'የኢትዮጵያ ወር' : 'Ethiopian Month'}
            value={eth.month}
            onChange={(e) => handleEthChange(eth.year, Number(e.target.value), eth.day)}
            className="col-span-5 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
          >
            {ETHIOPIAN_MONTH_NAMES.map((m) => (
              <option key={m.month} value={m.month}>
                {lang === 'am' ? m.am : `${m.en} (${m.am})`}
              </option>
            ))}
          </select>

          <select
            aria-label={lang === 'am' ? 'ቀን' : 'Ethiopian Day'}
            value={Math.min(eth.day, maxDaysInMonth)}
            onChange={(e) => handleEthChange(eth.year, eth.month, Number(e.target.value))}
            className="col-span-3 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1.5 font-mono text-xs tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
          >
            {Array.from({ length: maxDaysInMonth }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={2010}
            max={2035}
            aria-label={lang === 'am' ? 'ዓመተ ምሕረት' : 'Ethiopian Year'}
            value={eth.year}
            onChange={(e) =>
              handleEthChange(Number(e.target.value) || eth.year, eth.month, eth.day)
            }
            className="col-span-4 min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
          />
        </div>
      ) : (
        <input
          type="date"
          value={valueIso}
          onChange={(e) => {
            if (e.target.value) onChangeIso(e.target.value);
          }}
          className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 font-mono text-xs tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
        />
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{formatEthiopianDate(valueIso, lang)}</span>
        <span className="font-mono tabular-nums">{valueIso}</span>
      </div>
    </div>
  );
};

interface WorkingCalendarModalProps {
  isOpen: boolean;
  profile: EmployeeProfile;
  activeFy: FiscalYearWorkspace;
  initialMonthIndex: number;
  onClose: () => void;
  onSaveMonthWorkingConfig: (monthIndex: number, config: MonthWorkingConfig) => void;
}

export const WorkingCalendarModal: React.FC<WorkingCalendarModalProps> = ({
  isOpen,
  profile,
  activeFy,
  initialMonthIndex,
  onClose,
  onSaveMonthWorkingConfig,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(initialMonthIndex);
  const [baseWorkingDays, setBaseWorkingDays] = useState<number>(26);
  const [elapsedWorkingDays, setElapsedWorkingDays] = useState<number>(20);
  const [holidays, setHolidays] = useState<HolidayEntry[]>([]);

  const [entryType, setEntryType] = useState<'public_holiday' | 'personal_leave'>(
    'public_holiday'
  );
  const [entryName, setEntryName] = useState<string>('');
  const [entryDateIso, setEntryDateIso] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );

  useEffect(() => {
    if (isOpen) {
      setSelectedMonthIdx(initialMonthIndex);
    }
  }, [isOpen, initialMonthIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const eff = getEffectiveMonthWorkingConfig(activeFy, selectedMonthIdx);
    setBaseWorkingDays(eff.baseWorkingDays);
    setElapsedWorkingDays(eff.elapsedWorkingDays);
    setHolidays(eff.holidays);
  }, [isOpen, activeFy, selectedMonthIdx]);

  if (!isOpen) return null;

  const netWorkingDays = Math.max(1, baseWorkingDays - holidays.length);
  const clampedElapsed = Math.max(0, Math.min(netWorkingDays, elapsedWorkingDays));
  const remainingDays = Math.max(0, netWorkingDays - clampedElapsed);
  const monthMeta = fiscalMonths[selectedMonthIdx] || fiscalMonths[0];

  // Infer Ethiopian year from active fiscal year label (e.g. "2019 ዓ.ም") or today
  const yearMatch = activeFy.fiscalYearLabel.match(/20\d{2}/);
  const inferredEthYear = yearMatch
    ? Number(yearMatch[0])
    : gregorianIsoToEthiopian(new Date().toISOString().slice(0, 10)).year;

  const handleAddCustomEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle =
      entryName.trim() ||
      (entryType === 'public_holiday'
        ? lang === 'am'
          ? 'ሕዝባዊ በዓል'
          : 'Public Holiday'
        : lang === 'am'
          ? 'የግል ፈቃድ ቀን'
          : 'Personal Leave Day');

    const newItem: HolidayEntry = {
      id: `hol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: entryDateIso,
      nameAm: cleanTitle,
      nameEn: cleanTitle,
      type: entryType,
    };

    setHolidays((prev) => [...prev, newItem]);
    setEntryName('');
  };

  const handleAddPresetHoliday = (presetId: string) => {
    const preset = PRESET_ETHIOPIAN_PUBLIC_HOLIDAYS.find((p) => p.id === presetId);
    if (!preset) return;
    const iso = ethiopianToGregorianIso(inferredEthYear, preset.ethMonth, preset.ethDay);
    if (holidays.some((h) => h.date === iso && h.nameEn === preset.nameEn)) {
      return;
    }
    setHolidays((prev) => [
      ...prev,
      {
        id: `preset-${preset.id}-${Date.now()}`,
        date: iso,
        nameAm: preset.nameAm,
        nameEn: preset.nameEn,
        type: 'public_holiday',
      },
    ]);
  };

  const handleRemoveHoliday = (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSave = () => {
    onSaveMonthWorkingConfig(selectedMonthIdx, {
      baseWorkingDays,
      elapsedWorkingDays: clampedElapsed,
      holidays,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የስራ ቀናት፣ በዓላት እና የኢትዮጵያ ቀን መቁጠሪያ (ዓ.ም)'
                  : 'Holiday-Aware Working Calendar & Ethiopian Dates (ዓ.ም)'}
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'ሕዝባዊ በዓላትን እና የግል ፈቃድ ቀናትን ሲቀንሱ ዕለታዊ እና ሳምንታዊ የKPI ፍጥነት (Pace) በራሱ ይስተካከላል።'
                : 'Deduct public holidays and personal leave days so your required daily & weekly KPI pace reflects true branch floor days.'}
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

        <div className="mt-5 space-y-6">
          {/* Month Selector + Base Working Days */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የበጀት ወር ይምረጡ' : 'Target Fiscal Month'}
              </label>
              <select
                value={selectedMonthIdx}
                onChange={(e) => setSelectedMonthIdx(Number(e.target.value))}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              >
                {fiscalMonths.map((m) => (
                  <option key={m.index} value={m.index}>
                    {lang === 'am' ? m.fullAm : m.fullEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'መደበኛ የስራ ቀናት' : 'Base Working Days'}
                </label>
                <div className="inline-flex gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBaseWorkingDays(26)}
                    className={`font-mono underline cursor-pointer ${
                      baseWorkingDays === 26
                        ? 'font-bold text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    26d
                  </button>
                  <span className="text-slate-300">/</span>
                  <button
                    type="button"
                    onClick={() => setBaseWorkingDays(22)}
                    className={`font-mono underline cursor-pointer ${
                      baseWorkingDays === 22
                        ? 'font-bold text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 hover:text-slate-700'
                    }`}
                  >
                    22d
                  </button>
                </div>
              </div>
              <input
                type="number"
                min={1}
                max={31}
                value={baseWorkingDays}
                onChange={(e) =>
                  setBaseWorkingDays(Math.max(1, Math.min(31, Number(e.target.value) || 26)))
                }
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'ያለፉ የስራ ቀናት' : 'Elapsed Floor Days'}
              </label>
              <input
                type="number"
                min={0}
                max={netWorkingDays}
                value={clampedElapsed}
                onChange={(e) =>
                  setElapsedWorkingDays(
                    Math.max(0, Math.min(netWorkingDays, Number(e.target.value) || 0))
                  )
                }
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Net Floor Days Calculation Readout */}
          <div className="grid grid-cols-2 gap-4 border-y border-slate-200 dark:border-slate-800 py-3.5 sm:grid-cols-4 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'መደበኛ ቀናት' : 'Base Month Days'}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-900 dark:text-white">
                {baseWorkingDays}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'በዓላት እና ፈቃድ' : 'Holidays & Leave'}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-amber-700 dark:text-amber-400">
                -{holidays.length}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'የተጣራ የስራ ቀናት' : 'Net Working Days'}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-blue-700 dark:text-blue-400">
                {netWorkingDays}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">
                {lang === 'am' ? 'ቀሪ የስራ ቀናት' : 'Remaining Days'}
              </div>
              <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                {remainingDays}
              </div>
            </div>
          </div>

          {/* Quick Ethiopian Public Holiday Presets */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {lang === 'am'
                ? 'ዋና ዋና የኢትዮጵያ ሕዝባዊ በዓላትን በአንድ ክሊክ ያክሉ፦'
                : 'Quick-add Ethiopian bank & public holidays:'}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_ETHIOPIAN_PUBLIC_HOLIDAYS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAddPresetHoliday(preset.id)}
                  className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  <Plus className="h-3 w-3 shrink-0" />
                  <span>{lang === 'am' ? preset.nameAm : preset.nameEn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Holiday / Personal Leave Form with Ethiopian Date Picker */}
          <form
            onSubmit={handleAddCustomEntry}
            className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {lang === 'am'
                ? `ለ${monthMeta.fullAm} በዓል ወይም የግል ፈቃድ መዝግብ`
                : `Add Holiday or Personal Leave for ${monthMeta.fullEn}`}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-start">
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'ዓይነት' : 'Day Type'}
                </label>
                <select
                  value={entryType}
                  onChange={(e) =>
                    setEntryType(e.target.value as 'public_holiday' | 'personal_leave')
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                >
                  <option value="public_holiday">
                    {lang === 'am' ? 'ሕዝባዊ በዓል' : 'Public Holiday'}
                  </option>
                  <option value="personal_leave">
                    {lang === 'am' ? 'የግል ፈቃድ / ስልጠና' : 'Personal Leave'}
                  </option>
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'ምክንያት / የበዓል ስም' : 'Holiday / Leave Label'}
                </label>
                <input
                  type="text"
                  value={entryName}
                  onChange={(e) => setEntryName(e.target.value)}
                  placeholder={
                    lang === 'am' ? 'ምሳሌ፦ ዓመታዊ እረፍት / ኢድ...' : 'e.g. Annual Leave / Eid...'
                  }
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="sm:col-span-5">
                <EthiopianDateInput
                  valueIso={entryDateIso}
                  onChangeIso={setEntryDateIso}
                  lang={lang}
                  label={lang === 'am' ? 'ቀን (ዓ.ም / Gregorian)' : 'Date (ዓ.ም / Gregorian)'}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'ቀን ቀንስ / ጨምር' : 'Add Deducted Day'}</span>
              </button>
            </div>
          </form>

          {/* Configured Non-Working Days List */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {lang === 'am'
                ? `በ${monthMeta.fullAm} የተመዘገቡ በዓላት እና ፈቃዶች (${holidays.length})`
                : `Deducted Non-Working Days in ${monthMeta.fullEn} (${holidays.length})`}
            </div>

            {holidays.length === 0 ? (
              <p className="py-3 text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'ለዚህ ወር የተቀነሰ በዓል ወይም የግል ፈቃድ የለም።'
                  : 'No public holidays or personal leave days deducted for this month.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {holidays.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {lang === 'am' ? h.nameAm : h.nameEn}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{formatEthiopianDate(h.date, lang)}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{h.date}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>
                          {h.type === 'public_holiday'
                            ? lang === 'am'
                              ? 'ሕዝባዊ በዓል'
                              : 'Public Holiday'
                            : lang === 'am'
                              ? 'የግል ፈቃድ'
                              : 'Personal Leave'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveHoliday(h.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      title={lang === 'am' ? 'ሰርዝ' : 'Remove'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              {lang === 'am' ? 'ይቅር' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="min-h-[42px] rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {lang === 'am' ? 'የወሩን የስራ ቀናት አስቀምጥ' : 'Save Working Calendar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
