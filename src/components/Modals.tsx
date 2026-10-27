import React, { useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  CopyPlus,
  Download,
  Lock,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import {
  ActualLogEntry,
  AppDatabasePayload,
  EmployeeProfile,
  FiscalCalendarType,
  FiscalYearWorkspace,
  KpiItem,
  Language,
  SecuritySettings,
  ThemeMode,
} from '../types/kpi';
import {
  cloneFiscalYearWithGrowth,
  normalizeDatabasePayload,
} from '../storage/offlineDb';
import { formatKpiValue, getFiscalMonths } from '../utils/i18n';

// ============================================================================
// 1. Log Actual Performance Modal
// ============================================================================

interface LogActualModalProps {
  isOpen: boolean;
  profile: EmployeeProfile;
  kpis: KpiItem[];
  initialKpiId?: string;
  initialMonthIndex?: number;
  onClose: () => void;
  onAddLog: (entry: Omit<ActualLogEntry, 'id' | 'createdAt'>) => void;
}

export const LogActualModal: React.FC<LogActualModalProps> = ({
  isOpen,
  profile,
  kpis,
  initialKpiId,
  initialMonthIndex,
  onClose,
  onAddLog,
}) => {
  const lang = profile.language;
  const fiscalMonths = getFiscalMonths(profile.calendarType);

  const [kpiId, setKpiId] = useState<string>(initialKpiId || kpis[0]?.id || '');
  const [monthIndex, setMonthIndex] = useState<number>(
    initialMonthIndex !== undefined ? initialMonthIndex : profile.activeMonthIndex
  );
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState<string>('');
  const [note, setNote] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setKpiId(initialKpiId || kpis[0]?.id || '');
      setMonthIndex(
        initialMonthIndex !== undefined ? initialMonthIndex : profile.activeMonthIndex
      );
      setValue('');
      setNote('');
    }
  }, [isOpen, initialKpiId, initialMonthIndex, kpis, profile.activeMonthIndex]);

  if (!isOpen) return null;

  const selectedKpi = kpis.find((k) => k.id === kpiId) || kpis[0];
  const monthTarget = selectedKpi ? selectedKpi.monthlyTargets[monthIndex] ?? 0 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKpi) return;
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return;

    onAddLog({
      kpiId: selectedKpi.id,
      monthIndex,
      date,
      value: numeric,
      note: note.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200 dark:bg-slate-700 sm:hidden" />
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === 'am' ? 'አዲስ ክንውን መዝግብ (Log Actual)' : 'Record Actual Performance'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {kpis.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? 'ክንውን ከመመዝገብዎ በፊት እባክዎ የቅርንጫፍ እና የግል KPI እቅድ ያስገቡ።'
              : 'Please create at least one KPI in Branch Plan before logging actuals.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የKPI መለኪያ ይምረጡ' : 'Select KPI Indicator'}
              </label>
              <select
                value={selectedKpi?.id || ''}
                onChange={(e) => setKpiId(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              >
                {kpis.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.code} — {k.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'የበጀት ወር' : 'Fiscal Month'}
                </label>
                <select
                  value={monthIndex}
                  onChange={(e) => setMonthIndex(Number(e.target.value))}
                  className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                >
                  {fiscalMonths.map((m) => (
                    <option key={m.index} value={m.index}>
                      {lang === 'am' ? m.fullAm : m.fullEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'ቀን' : 'Activity Date'}
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'የተከናወነው መጠን (Actual Value)' : 'Actual Achieved Value'}
                </label>
                {selectedKpi && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {lang === 'am' ? 'የወሩ እቅድ፦ ' : 'Month Target: '}
                    {formatKpiValue(monthTarget, selectedKpi.unit)}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 font-mono text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                />
                {selectedKpi && (
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                    {selectedKpi.unit}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'ማስታወሻ / መግለጫ (አማራጭ)' : 'Note / Reference (Optional)'}
              </label>
              <input
                type="text"
                placeholder={
                  lang === 'am'
                    ? 'ምሳሌ፦ ከአዲስ ነጋዴ ደንበኛ የተገኘ ተቀማጭ...'
                    : 'e.g., Corporate deposit mobilized...'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1 w-full min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
              >
                {lang === 'am' ? 'ይቅር' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="min-h-[44px] rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 cursor-pointer"
              >
                {lang === 'am' ? 'ክንውን አስቀምጥ' : 'Save Actual'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 2. Employee Profile, Offline PIN Lock & Backup Modal
// ============================================================================

interface ProfileBackupModalProps {
  isOpen: boolean;
  profile: EmployeeProfile;
  security: SecuritySettings;
  onClose: () => void;
  onUpdateProfile: (profile: EmployeeProfile) => void;
  onUpdateSecurity: (security: SecuritySettings) => void;
  onExportBackup: () => void;
  onImportBackup: (data: AppDatabasePayload) => void;
  onResetSample: () => void;
  onClearAllEmpty: () => void;
}

export const ProfileBackupModal: React.FC<ProfileBackupModalProps> = ({
  isOpen,
  profile,
  security,
  onClose,
  onUpdateProfile,
  onUpdateSecurity,
  onExportBackup,
  onImportBackup,
  onResetSample,
  onClearAllEmpty,
}) => {
  const [draft, setDraft] = useState<EmployeeProfile>(profile);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'sample' | 'empty' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // PIN management state
  const [pinMode, setPinMode] = useState<'idle' | 'setup' | 'change' | 'disable'>('idle');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinFeedback, setPinFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  React.useEffect(() => {
    if (isOpen) {
      setDraft(profile);
      setImportError(null);
      setConfirmAction(null);
      setPinMode('idle');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinFeedback(null);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const lang = draft.language;
  const fiscalMonths = getFiscalMonths(draft.calendarType);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(draft);
    onClose();
  };

  const resetPinInputs = () => {
    setPinMode('idle');
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
  };

  const handleApplyPinAction = () => {
    setPinFeedback(null);
    if (pinMode === 'setup') {
      if (!/^\d{4}$/.test(newPinInput)) {
        setPinFeedback({
          type: 'err',
          text:
            lang === 'am'
              ? 'እባክዎ ባለ 4 አሃዝ ቁጥር ብቻ ያስገቡ (ምሳሌ፦ 2580)።'
              : 'PIN must be exactly 4 numeric digits.',
        });
        return;
      }
      if (newPinInput !== confirmPinInput) {
        setPinFeedback({
          type: 'err',
          text:
            lang === 'am'
              ? 'ሁለቱ የPIN ቁጥሮች አይመሳሰሉም።'
              : 'New PIN and confirmation do not match.',
        });
        return;
      }
      onUpdateSecurity({ pinEnabled: true, pinCode: newPinInput });
      resetPinInputs();
      setPinFeedback({
        type: 'ok',
        text:
          lang === 'am'
            ? 'ባለ 4 አሃዝ የPIN መቆለፊያ በተሳካ ሁኔታ ተዘጋጅቷል።'
            : '4-digit offline PIN lock enabled.',
      });
      return;
    }

    if (pinMode === 'change') {
      if (currentPinInput !== security.pinCode) {
        setPinFeedback({
          type: 'err',
          text: lang === 'am' ? 'የአሁኑ PIN ትክክል አይደለም።' : 'Current PIN is incorrect.',
        });
        return;
      }
      if (!/^\d{4}$/.test(newPinInput) || newPinInput !== confirmPinInput) {
        setPinFeedback({
          type: 'err',
          text:
            lang === 'am'
              ? 'አዲሱ PIN ባለ 4 አሃዝ መሆን እና መመሳሰል አለበት።'
              : 'New PIN must be 4 matching digits.',
        });
        return;
      }
      onUpdateSecurity({ pinEnabled: true, pinCode: newPinInput });
      resetPinInputs();
      setPinFeedback({
        type: 'ok',
        text: lang === 'am' ? 'የPIN ቁጥር ተቀይሯል።' : 'PIN updated successfully.',
      });
      return;
    }

    if (pinMode === 'disable') {
      if (currentPinInput !== security.pinCode) {
        setPinFeedback({
          type: 'err',
          text: lang === 'am' ? 'የአሁኑ PIN ትክክል አይደለም።' : 'Current PIN is incorrect.',
        });
        return;
      }
      onUpdateSecurity({ pinEnabled: false, pinCode: '' });
      resetPinInputs();
      setPinFeedback({
        type: 'ok',
        text: lang === 'am' ? 'የPIN መቆለፊያ ተነስቷል።' : 'PIN lock disabled.',
      });
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppDatabasePayload>;
        if (!parsed || !parsed.profile) {
          setImportError(
            lang === 'am' ? 'ፋይሉ ትክክለኛ የKPI Backup አይደለም።' : 'Invalid backup file format.'
          );
          return;
        }
        const normalized = normalizeDatabasePayload(parsed);
        onImportBackup(normalized);
        onClose();
      } catch {
        setImportError(lang === 'am' ? 'ፋይሉን ማንበብ አልተቻለም።' : 'Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {lang === 'am'
              ? 'የሰራተኛ መገለጫ፣ የPIN ደህንነት እና ዳታ'
              : 'Employee Profile, PIN Lock & Offline Data'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የሰራተኛ ሙሉ ስም' : 'Employee Name'}
              </label>
              <input
                type="text"
                required
                value={draft.employeeName}
                onChange={(e) => setDraft({ ...draft, employeeName: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የሰራተኛ መለያ (ID)' : 'Employee ID'}
              </label>
              <input
                type="text"
                value={draft.employeeId}
                onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የስራ መደብ (Role)' : 'Job Title / Role'}
              </label>
              <input
                type="text"
                value={draft.roleTitle}
                onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የቅርንጫፍ ስም (Branch)' : 'Branch Name'}
              </label>
              <input
                type="text"
                required
                value={draft.branchName}
                onChange={(e) => setDraft({ ...draft, branchName: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የአሁኑ በጀት ዓመት ስም' : 'Active Fiscal Year'}
              </label>
              <input
                type="text"
                required
                value={draft.fiscalYearLabel}
                onChange={(e) => setDraft({ ...draft, fiscalYearLabel: e.target.value })}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-blue-600 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የበጀት ዘመን አቆጣጠር' : 'Fiscal Calendar'}
              </label>
              <select
                value={draft.calendarType}
                onChange={(e) =>
                  setDraft({ ...draft, calendarType: e.target.value as FiscalCalendarType })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                <option value="july_june">ሐምሌ – ሰኔ (July – June)</option>
                <option value="jan_dec">ጥር – ታኅሣሥ (Jan – Dec)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የአሁኑ ወር (ለYTD ስሌት)' : 'Current Active Month'}
              </label>
              <select
                value={draft.activeMonthIndex}
                onChange={(e) =>
                  setDraft({ ...draft, activeMonthIndex: Number(e.target.value) })
                }
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              >
                {fiscalMonths.map((m) => (
                  <option key={m.index} value={m.index}>
                    {lang === 'am' ? m.fullAm : m.fullEn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የአፕ ቋንቋ (Language)' : 'Interface Language'}
              </label>
              <div className="mt-1.5 inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                {(['am', 'en'] as Language[]).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setDraft({ ...draft, language: l })}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      draft.language === l
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {l === 'am' ? 'አማርኛ' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የገጽታ ቀለም (Theme)' : 'Appearance Theme'}
              </label>
              <div className="mt-1.5 inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
                {(['light', 'dark'] as ThemeMode[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDraft({ ...draft, theme: t })}
                    className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      draft.theme === t
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {t === 'light'
                      ? lang === 'am'
                        ? 'ብሩህ (Light)'
                        : 'Light'
                      : lang === 'am'
                        ? 'ጨለማ (Dark)'
                        : 'Dark'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Item #6: Offline 4-Digit PIN Lock Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {security.pinEnabled ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lock className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                )}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    {lang === 'am'
                      ? 'የግል የሚስጥር ቁጥር መቆለፊያ (Offline 4-Digit PIN)'
                      : 'Local 4-Digit Privacy PIN Lock'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {security.pinEnabled
                      ? lang === 'am'
                        ? 'ነቅቷል — አፑ ሲከፈት ባለ 4 አሃዝ PIN ይጠይቃል።'
                        : 'Active — App requires your 4-digit PIN when opened or locked.'
                      : lang === 'am'
                        ? 'አልነቃም — የግል KPI መረጃዎን በPIN ለመቆለፍ ያስጀምሩ።'
                        : 'Not enabled — Protect your personal KPI scorecard on shared devices.'}
                  </p>
                </div>
              </div>

              {pinMode === 'idle' && (
                <div className="flex items-center gap-2">
                  {!security.pinEnabled ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPinFeedback(null);
                        setPinMode('setup');
                      }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 cursor-pointer"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>{lang === 'am' ? 'PIN አዘጋጅ' : 'Enable PIN'}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setPinFeedback(null);
                          setPinMode('change');
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 cursor-pointer"
                      >
                        <span>{lang === 'am' ? 'PIN ቀይር' : 'Change PIN'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPinFeedback(null);
                          setPinMode('disable');
                        }}
                        className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-red-700 dark:text-red-400 hover:bg-red-50 cursor-pointer"
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        <span>{lang === 'am' ? 'አጥፋ' : 'Disable'}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {pinMode !== 'idle' && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-3.5 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {(pinMode === 'change' || pinMode === 'disable') && (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {lang === 'am' ? 'የአሁኑ PIN' : 'Current PIN'}
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="••••"
                        value={currentPinInput}
                        onChange={(e) =>
                          setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                        }
                        className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-sm tracking-widest text-slate-900 dark:text-white"
                      />
                    </div>
                  )}

                  {(pinMode === 'setup' || pinMode === 'change') && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {lang === 'am' ? 'አዲስ 4-አሃዝ PIN' : 'New 4-Digit PIN'}
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="••••"
                          value={newPinInput}
                          onChange={(e) =>
                            setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                          }
                          className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-sm tracking-widest text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {lang === 'am' ? 'PIN ደግመው ያረጋግጡ' : 'Confirm PIN'}
                        </label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="••••"
                          value={confirmPinInput}
                          onChange={(e) =>
                            setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))
                          }
                          className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-sm tracking-widest text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={resetPinInputs}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {lang === 'am' ? 'ተው' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyPinAction}
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                  >
                    {pinMode === 'disable'
                      ? lang === 'am'
                        ? 'PIN አጥፋ'
                        : 'Confirm Disable'
                      : lang === 'am'
                        ? 'PIN አጽድቅ'
                        : 'Save PIN'}
                  </button>
                </div>
              </div>
            )}

            {pinFeedback && (
              <p
                className={`text-xs font-medium ${
                  pinFeedback.type === 'ok'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {pinFeedback.text}
              </p>
            )}
          </div>

          {/* Offline Backup & Restore Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? 'ኦፍላይን መጠባበቂያ (Backup & Restore — All Fiscal Years)'
                : 'Offline Local Backup & Reset (All Fiscal Years)'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'ሁሉም የበጀት ዓመታት፣ ዘርፎች እና ክንውኖች ያለ ኢንተርኔት በስልክዎ/ኮምፒውተርዎ IndexedDB ውስጥ ይቀመጣሉ።'
                : 'All fiscal years, custom KPI categories, and logs are saved locally via IndexedDB.'}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onExportBackup}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'Backup አውርድ (.json)' : 'Export Backup'}</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'Backup መልስ (Restore)' : 'Import Backup'}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileImport}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => setConfirmAction('sample')}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'ናሙና ዳታ መልስ' : 'Load Sample Data'}</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmAction('empty')}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-50 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'ባዶ አድርግ (Start Fresh)' : 'Clear All KPIs'}</span>
              </button>
            </div>

            {importError && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{importError}</p>
            )}

            {confirmAction && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-3 text-xs text-amber-900 dark:text-amber-200">
                <span>
                  {confirmAction === 'empty'
                    ? lang === 'am'
                      ? 'ሁሉም KPIs እና ክንውኖች ተሰርዘው ከባዶ ይጀምር?'
                      : 'Clear all KPIs and actual entries to start from a blank slate?'
                    : lang === 'am'
                      ? 'ወደ መጀመሪያው የናሙና እቅድ (2018 + 2019 ዓ.ም) ይመለስ?'
                      : 'Replace current data with default sample fiscal years?'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmAction === 'empty') onClearAllEmpty();
                      else onResetSample();
                      setConfirmAction(null);
                      onClose();
                    }}
                    className="rounded-md bg-slate-900 dark:bg-blue-600 px-3 py-1 text-xs font-semibold text-white cursor-pointer"
                  >
                    {lang === 'am' ? 'አዎ ቀጥል' : 'Confirm'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {lang === 'am' ? 'ተው' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              {lang === 'am' ? 'ዝጋ' : 'Close'}
            </button>
            <button
              type="submit"
              className="min-h-[42px] rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 cursor-pointer"
            >
              {lang === 'am' ? 'መገለጫ አስቀምጥ' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// 3. Item #4: Multi-Fiscal-Year Archive & Rollover Modal
// ============================================================================

interface FiscalYearModalProps {
  isOpen: boolean;
  lang: Language;
  activeFiscalYearId: string;
  fiscalYears: FiscalYearWorkspace[];
  onClose: () => void;
  onSelectFiscalYear: (fyId: string) => void;
  onCreateFiscalYear: (newFy: FiscalYearWorkspace, switchImmediately: boolean) => void;
  onToggleArchiveFiscalYear: (fyId: string) => void;
  onDeleteFiscalYear: (fyId: string) => void;
}

export const FiscalYearModal: React.FC<FiscalYearModalProps> = ({
  isOpen,
  lang,
  activeFiscalYearId,
  fiscalYears,
  onClose,
  onSelectFiscalYear,
  onCreateFiscalYear,
  onToggleArchiveFiscalYear,
  onDeleteFiscalYear,
}) => {
  const [creationMode, setCreationMode] = useState<'clone' | 'blank'>('clone');
  const [newYearLabel, setNewYearLabel] = useState('2020 ዓ.ም (2027/28 FY)');
  const [sourceFyId, setSourceFyId] = useState(activeFiscalYearId);
  const [growthPct, setGrowthPct] = useState('15');
  const [calendarType, setCalendarType] = useState<FiscalCalendarType>('july_june');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSourceFyId(activeFiscalYearId);
      setConfirmDeleteId(null);
    }
  }, [isOpen, activeFiscalYearId]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYearLabel.trim()) return;

    if (creationMode === 'clone') {
      const source =
        fiscalYears.find((f) => f.id === sourceFyId) || fiscalYears[0];
      if (!source) return;
      const pct = Number(growthPct) || 0;
      const cloned = cloneFiscalYearWithGrowth(source, newYearLabel, pct);
      onCreateFiscalYear(cloned, true);
      onClose();
      return;
    }

    const blankFy: FiscalYearWorkspace = {
      id: `fy-${Date.now()}`,
      fiscalYearLabel: newYearLabel.trim(),
      calendarType,
      activeMonthIndex: 0,
      workingDaysPerMonth: 26,
      elapsedWorkingDaysInMonth: 1,
      isArchived: false,
      kpis: [],
      actualLogs: [],
    };
    onCreateFiscalYear(blankFy, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? 'የበጀት ዓመታት ማህደር እና አዲስ ዓመት ማሸጋገሪያ'
                : 'Multi-Fiscal-Year Workspaces & Rollover'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {lang === 'am'
                ? 'የቀድሞ የበጀት ዓመታትን ይመልከቱ፣ ያወዳድሩ ወይም የKPI መዋቅርን ከእድገት መቶኛ (%) ጋር ወደ አዲስ ዓመት ያሸጋግሩ።'
                : 'Switch between fiscal years for YoY history or clone an existing KPI structure with a % target growth bump.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stored Fiscal Years List */}
        <div className="mt-4 space-y-2.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            {lang === 'am'
              ? `የተቀመጡ የበጀት ዓመታት (${fiscalYears.length})`
              : `Saved Fiscal Year Workspaces (${fiscalYears.length})`}
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800">
            {fiscalYears.map((fy) => {
              const isActive = fy.id === activeFiscalYearId;
              return (
                <div
                  key={fy.id}
                  className={`flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between ${
                    isActive ? 'bg-blue-50/50 dark:bg-blue-950/25' : ''
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {fy.fiscalYearLabel}
                      </span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{lang === 'am' ? 'ንቁ ዓመት' : 'Active'}</span>
                        </span>
                      )}
                      {fy.isArchived && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <Archive className="h-3 w-3" />
                          <span>{lang === 'am' ? 'ማህደር (Archived)' : 'Archived'}</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                      <span>{fy.kpis.length} KPIs</span>
                      <span className="mx-1.5">·</span>
                      <span>
                        {fy.actualLogs.length} {lang === 'am' ? 'ክንውኖች' : 'logs'}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className="font-sans">
                        {fy.calendarType === 'july_june' ? 'ሐምሌ–ሰኔ (Jul–Jun)' : 'ጥር–ታኅሣሥ (Jan–Dec)'}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectFiscalYear(fy.id);
                          onClose();
                        }}
                        className="min-h-[36px] rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                      >
                        {lang === 'am' ? 'ወደዚህ ዓመት ቀይር' : 'Switch to Year'}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onToggleArchiveFiscalYear(fy.id)}
                      className="min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      {fy.isArchived
                        ? lang === 'am'
                          ? 'ከማህደር አውጣ'
                          : 'Unarchive'
                        : lang === 'am'
                          ? 'ወደ ማህደር ክተት'
                          : 'Archive'}
                    </button>

                    {fiscalYears.length > 1 && (
                      <>
                        {confirmDeleteId === fy.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteFiscalYear(fy.id);
                                setConfirmDeleteId(null);
                              }}
                              className="min-h-[34px] rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                            >
                              {lang === 'am' ? 'ሰርዝ' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                            >
                              {lang === 'am' ? 'ተው' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(fy.id)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
                            title={lang === 'am' ? 'ሰርዝ' : 'Delete Fiscal Year'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create / Clone New Fiscal Year Form */}
        <form
          onSubmit={handleCreate}
          className="mt-6 border-t border-slate-200 dark:border-slate-800 pt-5 space-y-4"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {lang === 'am'
                ? 'አዲስ የበጀት ዓመት ፍጠር / ከቀድሞ ዓመት አሸጋግር'
                : 'Create or Rollover New Fiscal Year'}
            </h3>

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1">
              <button
                type="button"
                onClick={() => setCreationMode('clone')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                  creationMode === 'clone'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <CopyPlus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'ከቀድሞ ዓመት ኮፒ (% እድገት)' : 'Clone with % Growth'}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreationMode('blank')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold cursor-pointer ${
                  creationMode === 'blank'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{lang === 'am' ? 'ከባዶ ጀምር' : 'Blank Year'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የአዲሱ በጀት ዓመት ስም' : 'New Fiscal Year Label'}
              </label>
              <input
                type="text"
                required
                placeholder="2020 ዓ.ም (2027/28 FY)"
                value={newYearLabel}
                onChange={(e) => setNewYearLabel(e.target.value)}
                className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            {creationMode === 'clone' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'መነሻ የሚሆን ዓመት' : 'Source Fiscal Year'}
                  </label>
                  <select
                    value={sourceFyId}
                    onChange={(e) => setSourceFyId(e.target.value)}
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                  >
                    {fiscalYears.map((fy) => (
                      <option key={fy.id} value={fy.id}>
                        {fy.fiscalYearLabel} ({fy.kpis.length} KPIs)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የእቅድ ጭማሪ (% Growth)' : 'Target Growth Bump (%)'}
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={growthPct}
                      onChange={(e) => setGrowthPct(e.target.value)}
                      className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs font-bold text-slate-900 dark:text-white"
                    />
                    <span className="font-mono text-xs font-semibold text-slate-500">%</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'የበጀት ዘመን አቆጣጠር' : 'Fiscal Calendar'}
                </label>
                <select
                  value={calendarType}
                  onChange={(e) => setCalendarType(e.target.value as FiscalCalendarType)}
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
                >
                  <option value="july_june">ሐምሌ – ሰኔ (July – June)</option>
                  <option value="jan_dec">ጥር – ታኅሣሥ (Jan – Dec)</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {lang === 'am' ? 'ዝጋ' : 'Close'}
            </button>
            <button
              type="submit"
              className="min-h-[42px] rounded-xl bg-slate-900 dark:bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-500 cursor-pointer"
            >
              {creationMode === 'clone'
                ? lang === 'am'
                  ? 'ኮፒ አድርገህ አዲስ ዓመት ጀምር'
                  : 'Clone & Open New Year'
                : lang === 'am'
                  ? 'ባዶ በጀት ዓመት ፍጠር'
                  : 'Create Blank Year'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
