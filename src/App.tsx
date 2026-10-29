import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  BarChart3,
  Building2,
  CalendarCheck2,
  CalendarRange,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Globe,
  Home,
  ListTodo,
  Lock,
  Moon,
  SlidersHorizontal,
  Sun,
  Target,
} from 'lucide-react';
import {
  ActionTaskItem,
  ActiveTab,
  ActualLogEntry,
  AppDatabasePayload,
  AppPageRoute,
  AppraisalNarrative,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategoryDef,
  KpiItem,
  MonthWorkingConfig,
  PeriodScope,
  ProspectItem,
  SecuritySettings,
  WeeklyCheckInSettings,
} from './types/kpi';
import {
  createEmptyData,
  createSeedData,
  exportDatabaseAsJson,
  loadAppDatabase,
  saveAppDatabase,
} from './storage/offlineDb';
import { computeYoYComparison, evaluatePortfolio } from './utils/analytics';
import { getFiscalMonths, UI_TEXT } from './utils/i18n';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { LandingPage } from './components/LandingPage';
import { InstallPage } from './components/InstallPage';
import { OverviewView } from './components/OverviewView';
import { BranchPlanView } from './components/BranchPlanView';
import { PersonalPlanView } from './components/PersonalPlanView';
import { ActualsView } from './components/ActualsView';
import { PipelineTasksView } from './components/PipelineTasksView';
import { ReportsView } from './components/ReportsView';
import {
  FiscalYearModal,
  LogActualModal,
  ProfileBackupModal,
} from './components/Modals';
import { WorkingCalendarModal } from './components/WorkingCalendarModal';
import { WeeklyCheckInModal } from './components/WeeklyCheckInModal';
import { PinLockScreen } from './components/PinLockScreen';
import { BiqatBrandMark } from './components/BrandIcons';
import { SEOHead } from './components/SEOHead';

function pathnameToPage(pathname: string): AppPageRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  switch (clean) {
    case '/overview':
      return 'overview';
    case '/branch-plan':
      return 'branch';
    case '/my-plan':
      return 'personal';
    case '/actuals':
      return 'actuals';
    case '/pipeline':
      return 'pipeline';
    case '/reports':
      return 'reports';
    case '/install':
      return 'install';
    default:
      return 'landing';
  }
}

function pageToPathname(page: AppPageRoute): string {
  switch (page) {
    case 'overview':
      return '/overview';
    case 'branch':
      return '/branch-plan';
    case 'personal':
      return '/my-plan';
    case 'actuals':
      return '/actuals';
    case 'pipeline':
      return '/pipeline';
    case 'reports':
      return '/reports';
    case 'install':
      return '/install';
    case 'landing':
    default:
      return '/';
  }
}

export default function App() {
  const prefersReducedMotion = useReducedMotion();
  const [db, setDb] = useState<AppDatabasePayload | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<AppPageRoute>(() =>
    typeof window !== 'undefined' ? pathnameToPage(window.location.pathname) : 'landing'
  );
  const [focusedKpiId, setFocusedKpiId] = useState<string | null>(null);
  const [pipelineFilterKpiId, setPipelineFilterKpiId] = useState<string | null>(null);
  const [scope, setScope] = useState<PeriodScope>({ type: 'ytd' });

  const [logModalState, setLogModalState] = useState<{
    open: boolean;
    kpiId?: string;
    monthIndex?: number;
  }>({ open: false });

  const [workingCalendarState, setWorkingCalendarState] = useState<{
    open: boolean;
    monthIndex: number;
  }>({ open: false, monthIndex: 0 });

  const [isWeeklyCheckInOpen, setIsWeeklyCheckInOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isFiscalYearModalOpen, setIsFiscalYearModalOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    loadAppDatabase().then((loaded) => {
      if (mounted) {
        setDb(loaded);
        if (loaded.security.pinEnabled && loaded.security.pinCode.length === 4) {
          setIsLocked(true);
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Sync Tailwind v4 class-based dark mode with root <html> element
  useEffect(() => {
    if (!db) return;
    document.documentElement.classList.toggle('dark', db.profile.theme === 'dark');
  }, [db?.profile.theme]);

  const persistUpdate = useCallback((updater: (prev: AppDatabasePayload) => AppDatabasePayload) => {
    setDb((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void saveAppDatabase(next);
      return next;
    });
  }, []);

  // Helper to update the currently active FiscalYearWorkspace cleanly
  const updateActiveWorkspace = useCallback(
    (
      prev: AppDatabasePayload,
      wsUpdater: (ws: FiscalYearWorkspace) => FiscalYearWorkspace
    ): AppDatabasePayload => {
      const targetId = prev.activeFiscalYearId || prev.fiscalYears[0]?.id;
      const nextFiscalYears = prev.fiscalYears.map((fy) =>
        fy.id === targetId ? wsUpdater(fy) : fy
      );
      const updatedActive =
        nextFiscalYears.find((fy) => fy.id === targetId) || nextFiscalYears[0];
      return {
        ...prev,
        fiscalYears: nextFiscalYears,
        profile: updatedActive
          ? {
              ...prev.profile,
              fiscalYearLabel: updatedActive.fiscalYearLabel,
              calendarType: updatedActive.calendarType,
              activeMonthIndex: updatedActive.activeMonthIndex,
            }
          : prev.profile,
        kpis: updatedActive ? updatedActive.kpis : prev.kpis,
        actualLogs: updatedActive ? updatedActive.actualLogs : prev.actualLogs,
      };
    },
    []
  );

  // Sync browser Back/Forward history navigation across multi-page routes
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(pathnameToPage(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigatePage = useCallback((page: AppPageRoute, kpiId?: string) => {
    if (kpiId) setFocusedKpiId(kpiId);
    setCurrentPage(page);
    const nextPath = pageToPathname(page);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState({ page }, '', nextPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleNavigateTab = useCallback(
    (tab: ActiveTab, kpiId?: string) => {
      handleNavigatePage(tab, kpiId);
    },
    [handleNavigatePage]
  );

  const handleSaveKpi = useCallback(
    (kpi: KpiItem) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => {
          const exists = ws.kpis.some((item) => item.id === kpi.id);
          const nextKpis = exists
            ? ws.kpis.map((item) => (item.id === kpi.id ? kpi : item))
            : [...ws.kpis, kpi];
          return { ...ws, kpis: nextKpis };
        })
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleUpdateKpis = useCallback(
    (nextKpis: KpiItem[]) => {
      persistUpdate((prev) => updateActiveWorkspace(prev, (ws) => ({ ...ws, kpis: nextKpis })));
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleDeleteKpi = useCallback(
    (kpiId: string) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          kpis: ws.kpis.filter((k) => k.id !== kpiId),
          actualLogs: ws.actualLogs.filter((l) => l.kpiId !== kpiId),
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleSaveCategory = useCallback(
    (cat: KpiCategoryDef) => {
      persistUpdate((prev) => {
        const exists = prev.categories.some((c) => c.id === cat.id);
        const nextCategories = exists
          ? prev.categories.map((c) => (c.id === cat.id ? cat : c))
          : [...prev.categories, cat];
        return { ...prev, categories: nextCategories };
      });
    },
    [persistUpdate]
  );

  const handleDeleteCategory = useCallback(
    (catId: string, fallbackCatId: string) => {
      persistUpdate((prev) => {
        const target = prev.categories.find((c) => c.id === catId);
        if (!target || target.isSystem) return prev;
        const nextCategories = prev.categories.filter((c) => c.id !== catId);
        const safeFallback = fallbackCatId || nextCategories[0]?.id || 'financial';
        const nextFiscalYears = prev.fiscalYears.map((fy) => ({
          ...fy,
          kpis: fy.kpis.map((k) =>
            k.category === catId ? { ...k, category: safeFallback } : k
          ),
        }));
        const activeFy =
          nextFiscalYears.find((f) => f.id === prev.activeFiscalYearId) || nextFiscalYears[0];
        return {
          ...prev,
          categories: nextCategories,
          fiscalYears: nextFiscalYears,
          kpis: activeFy ? activeFy.kpis : prev.kpis,
        };
      });
    },
    [persistUpdate]
  );

  const handleAddLog = useCallback(
    (entry: Omit<ActualLogEntry, 'id' | 'createdAt'>) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          actualLogs: [
            ...ws.actualLogs,
            {
              ...entry,
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              createdAt: Date.now(),
            },
          ],
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleDeleteLog = useCallback(
    (logId: string) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          actualLogs: ws.actualLogs.filter((l) => l.id !== logId),
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleSetMonthlyActualTotal = useCallback(
    (kpiId: string, monthIndex: number, targetTotal: number) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => {
          const nonOverrideLogs = ws.actualLogs.filter(
            (l) => !(l.kpiId === kpiId && l.monthIndex === monthIndex && l.isDirectOverride)
          );
          const regularForMonth = nonOverrideLogs.filter(
            (l) => l.kpiId === kpiId && l.monthIndex === monthIndex
          );
          const regularSum = regularForMonth.reduce((s, item) => s + item.value, 0);
          const delta = Math.round((targetTotal - regularSum) * 10000) / 10000;

          if (regularForMonth.length > 0 && Math.abs(delta) < 0.0001) {
            return { ...ws, actualLogs: nonOverrideLogs };
          }

          const adjustmentEntry: ActualLogEntry = {
            id: `override-${kpiId}-${monthIndex}`,
            kpiId,
            monthIndex,
            date: new Date().toISOString().slice(0, 10),
            value: regularForMonth.length > 0 ? delta : targetTotal,
            note:
              prev.profile.language === 'am'
                ? 'ወርሃዊ ቀጥታ ክንውን ማስገቢያ'
                : 'Direct monthly actual entry',
            isDirectOverride: true,
            createdAt: Date.now(),
          };

          return {
            ...ws,
            actualLogs: [...nonOverrideLogs, adjustmentEntry],
          };
        })
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleClearMonthlyActual = useCallback(
    (kpiId: string, monthIndex: number) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          actualLogs: ws.actualLogs.filter(
            (l) => !(l.kpiId === kpiId && l.monthIndex === monthIndex)
          ),
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleUpdateWorkingDays = useCallback(
    (workingDaysPerMonth: number, elapsedWorkingDays: number) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => {
          const targetMonthIdx =
            scope.type === 'month' ? scope.monthIndex : ws.activeMonthIndex;
          const existingMonthCfg = ws.monthlyWorkingConfigs?.[targetMonthIdx];
          const holidays = existingMonthCfg?.holidays ?? [];
          const nextBaseWorkingDays = Math.min(31, workingDaysPerMonth + holidays.length);
          const nextMonthlyWorkingConfigs: Record<number, MonthWorkingConfig> = {
            ...(ws.monthlyWorkingConfigs || {}),
            [targetMonthIdx]: {
              baseWorkingDays: nextBaseWorkingDays,
              elapsedWorkingDays,
              holidays,
            },
          };

          return {
            ...ws,
            workingDaysPerMonth:
              holidays.length === 0 ? workingDaysPerMonth : ws.workingDaysPerMonth,
            elapsedWorkingDaysInMonth:
              targetMonthIdx === ws.activeMonthIndex
                ? elapsedWorkingDays
                : ws.elapsedWorkingDaysInMonth,
            monthlyWorkingConfigs: nextMonthlyWorkingConfigs,
          };
        })
      );
    },
    [persistUpdate, updateActiveWorkspace, scope]
  );

  const handleSaveMonthWorkingConfig = useCallback(
    (monthIndex: number, config: MonthWorkingConfig) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          workingDaysPerMonth:
            monthIndex === ws.activeMonthIndex
              ? config.baseWorkingDays
              : ws.workingDaysPerMonth,
          elapsedWorkingDaysInMonth:
            monthIndex === ws.activeMonthIndex
              ? config.elapsedWorkingDays
              : ws.elapsedWorkingDaysInMonth,
          monthlyWorkingConfigs: {
            ...(ws.monthlyWorkingConfigs || {}),
            [monthIndex]: config,
          },
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleBatchAddLogs = useCallback(
    (entries: Omit<ActualLogEntry, 'id' | 'createdAt'>[]) => {
      if (entries.length === 0) return;
      persistUpdate((prev) => {
        const now = Date.now();
        const stampedEntries: ActualLogEntry[] = entries.map((e, idx) => ({
          ...e,
          id: `log-batch-${now}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
          createdAt: now + idx,
        }));
        const updated = updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          actualLogs: [...ws.actualLogs, ...stampedEntries],
        }));
        return {
          ...updated,
          checkInSettings: {
            ...(prev.checkInSettings || {
              reminderEnabled: true,
              reminderDay: 'friday',
            }),
            lastCheckInAt: new Date().toISOString(),
          },
        };
      });
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleUpdateCheckInSettings = useCallback(
    (next: WeeklyCheckInSettings) => {
      persistUpdate((prev) => ({
        ...prev,
        checkInSettings: next,
      }));
    },
    [persistUpdate]
  );

  const handleSaveProspect = useCallback(
    (item: ProspectItem) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => {
          const list = ws.prospects || [];
          const exists = list.some((p) => p.id === item.id);
          const nextProspects = exists
            ? list.map((p) => (p.id === item.id ? item : p))
            : [item, ...list];
          return { ...ws, prospects: nextProspects };
        })
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleDeleteProspect = useCallback(
    (prospectId: string) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          prospects: (ws.prospects || []).filter((p) => p.id !== prospectId),
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleConvertProspectToActual = useCallback(
    (prospectId: string) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => {
          const list = ws.prospects || [];
          const target = list.find((p) => p.id === prospectId);
          if (!target || target.convertedLogId) return ws;

          const newLog: ActualLogEntry = {
            id: `log-won-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            kpiId: target.kpiId,
            monthIndex: target.monthIndex,
            date: new Date().toISOString().slice(0, 10),
            value: target.expectedValue,
            note:
              prev.profile.language === 'am'
                ? `[ከፓይፕላይን የተቀየረ] ${target.clientName}`
                : `[Pipeline Won] ${target.clientName}`,
            createdAt: Date.now(),
          };

          const nextProspects = list.map((p) =>
            p.id === prospectId
              ? {
                  ...p,
                  stage: 'won' as const,
                  probabilityPct: 100,
                  convertedLogId: newLog.id,
                }
              : p
          );

          return {
            ...ws,
            prospects: nextProspects,
            actualLogs: [...ws.actualLogs, newLog],
          };
        })
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleSaveTask = useCallback(
    (task: ActionTaskItem) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => {
          const list = ws.actionTasks || [];
          const exists = list.some((t) => t.id === task.id);
          const nextTasks = exists
            ? list.map((t) => (t.id === task.id ? task : t))
            : [task, ...list];
          return { ...ws, actionTasks: nextTasks };
        })
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          actionTasks: (ws.actionTasks || []).filter((t) => t.id !== taskId),
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleSaveAppraisalNarrative = useCallback(
    (narrative: AppraisalNarrative) => {
      persistUpdate((prev) =>
        updateActiveWorkspace(prev, (ws) => ({
          ...ws,
          appraisalNarrative: narrative,
        }))
      );
    },
    [persistUpdate, updateActiveWorkspace]
  );

  const handleUpdateProfile = useCallback(
    (profile: EmployeeProfile) => {
      persistUpdate((prev) => {
        const targetId = prev.activeFiscalYearId || prev.fiscalYears[0]?.id;
        const nextFiscalYears = prev.fiscalYears.map((fy) =>
          fy.id === targetId
            ? {
                ...fy,
                fiscalYearLabel: profile.fiscalYearLabel,
                calendarType: profile.calendarType,
                activeMonthIndex: profile.activeMonthIndex,
              }
            : fy
        );
        return {
          ...prev,
          profile,
          fiscalYears: nextFiscalYears,
        };
      });
    },
    [persistUpdate]
  );

  const handleUpdateSecurity = useCallback(
    (security: SecuritySettings) => {
      persistUpdate((prev) => ({ ...prev, security }));
    },
    [persistUpdate]
  );

  const handleSelectFiscalYear = useCallback(
    (fyId: string) => {
      persistUpdate((prev) => {
        const target = prev.fiscalYears.find((f) => f.id === fyId);
        if (!target) return prev;
        return {
          ...prev,
          activeFiscalYearId: target.id,
          profile: {
            ...prev.profile,
            fiscalYearLabel: target.fiscalYearLabel,
            calendarType: target.calendarType,
            activeMonthIndex: target.activeMonthIndex,
          },
          kpis: target.kpis,
          actualLogs: target.actualLogs,
        };
      });
    },
    [persistUpdate]
  );

  const handleCreateFiscalYear = useCallback(
    (newFy: FiscalYearWorkspace, switchImmediately: boolean) => {
      persistUpdate((prev) => {
        const nextFiscalYears = [newFy, ...prev.fiscalYears];
        if (!switchImmediately) {
          return { ...prev, fiscalYears: nextFiscalYears };
        }
        return {
          ...prev,
          activeFiscalYearId: newFy.id,
          fiscalYears: nextFiscalYears,
          profile: {
            ...prev.profile,
            fiscalYearLabel: newFy.fiscalYearLabel,
            calendarType: newFy.calendarType,
            activeMonthIndex: newFy.activeMonthIndex,
          },
          kpis: newFy.kpis,
          actualLogs: newFy.actualLogs,
        };
      });
    },
    [persistUpdate]
  );

  const handleToggleArchiveFiscalYear = useCallback(
    (fyId: string) => {
      persistUpdate((prev) => ({
        ...prev,
        fiscalYears: prev.fiscalYears.map((fy) =>
          fy.id === fyId ? { ...fy, isArchived: !fy.isArchived } : fy
        ),
      }));
    },
    [persistUpdate]
  );

  const handleDeleteFiscalYear = useCallback(
    (fyId: string) => {
      persistUpdate((prev) => {
        if (prev.fiscalYears.length <= 1) return prev;
        const remaining = prev.fiscalYears.filter((fy) => fy.id !== fyId);
        const nextActive =
          remaining.find((fy) => fy.id === prev.activeFiscalYearId) || remaining[0];
        return {
          ...prev,
          activeFiscalYearId: nextActive.id,
          fiscalYears: remaining,
          profile: {
            ...prev.profile,
            fiscalYearLabel: nextActive.fiscalYearLabel,
            calendarType: nextActive.calendarType,
            activeMonthIndex: nextActive.activeMonthIndex,
          },
          kpis: nextActive.kpis,
          actualLogs: nextActive.actualLogs,
        };
      });
    },
    [persistUpdate]
  );

  const handleToggleLanguage = useCallback(() => {
    persistUpdate((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        language: prev.profile.language === 'am' ? 'en' : 'am',
      },
    }));
  }, [persistUpdate]);

  const handleToggleTheme = useCallback(() => {
    persistUpdate((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        theme: prev.profile.theme === 'dark' ? 'light' : 'dark',
      },
    }));
  }, [persistUpdate]);

  const activeFy = useMemo(() => {
    if (!db) return null;
    return (
      db.fiscalYears.find((f) => f.id === db.activeFiscalYearId) || db.fiscalYears[0]
    );
  }, [db]);

  const portfolioSummary = useMemo(() => {
    if (!db || !activeFy) return null;
    return evaluatePortfolio(
      activeFy.kpis,
      activeFy.actualLogs,
      db.profile,
      scope,
      db.categories
    );
  }, [db, activeFy, scope]);

  const priorFy = useMemo(() => {
    if (!db || !activeFy) return null;
    return db.fiscalYears.find((f) => f.id !== activeFy.id) || null;
  }, [db, activeFy]);

  const yoyComparison = useMemo(() => {
    if (!db || !activeFy || !priorFy) return null;
    return computeYoYComparison(activeFy, priorFy, db.profile, scope, db.categories);
  }, [db, activeFy, priorFy, scope]);

  if (!db || !activeFy || !portfolioSummary) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] p-6">
        <div className="mx-auto max-w-7xl space-y-6 animate-pulse">
          <div className="h-14 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
            <div className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
            <div className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
            <div className="h-28 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
          </div>
          <div className="h-80 rounded-xl bg-slate-200/70 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  // Offline 4-Digit PIN Lock Gate
  if (isLocked && db.security.pinEnabled && db.security.pinCode.length === 4) {
    return (
      <PinLockScreen
        expectedPin={db.security.pinCode}
        employeeName={db.profile.employeeName}
        lang={db.profile.language}
        theme={db.profile.theme}
        onUnlock={() => setIsLocked(false)}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  const lang = db.profile.language;
  const fiscalMonths = getFiscalMonths(db.profile.calendarType);
  const currentMonthMeta = fiscalMonths[db.profile.activeMonthIndex] || fiscalMonths[0];

  const navItems: { key: ActiveTab; label: string }[] = [
    { key: 'overview', label: UI_TEXT.nav.overview[lang] },
    { key: 'branch', label: UI_TEXT.nav.branch[lang] },
    { key: 'personal', label: UI_TEXT.nav.personal[lang] },
    { key: 'actuals', label: UI_TEXT.nav.actuals[lang] },
    { key: 'reports', label: UI_TEXT.nav.reports[lang] },
  ];

  const pageBreadcrumbLabels: Record<AppPageRoute, string> = {
    landing: lang === 'am' ? 'መነሻ' : 'Home',
    overview: UI_TEXT.nav.overview[lang],
    branch: UI_TEXT.nav.branch[lang],
    personal: UI_TEXT.nav.personal[lang],
    actuals: UI_TEXT.nav.actuals[lang],
    pipeline: UI_TEXT.pipelineBtn[lang],
    reports: UI_TEXT.nav.reports[lang],
    install: lang === 'am' ? 'አፕ ጫን (Install)' : 'Install App',
  };

  const activePipelineCount =
    (activeFy.prospects || []).filter((p) => p.stage !== 'won' && p.stage !== 'lost')
      .length + (activeFy.actionTasks || []).filter((t) => !t.completed).length;

  const effectiveCheckInSettings: WeeklyCheckInSettings = db.checkInSettings || {
    reminderEnabled: true,
    reminderDay: 'friday',
  };

  const mobileNavIcons: Record<ActiveTab, React.ReactNode> = {
    overview: <BarChart3 className="h-5 w-5" />,
    branch: <Building2 className="h-5 w-5" />,
    personal: <Target className="h-5 w-5" />,
    actuals: <ClipboardCheck className="h-5 w-5" />,
    reports: <FileText className="h-5 w-5" />,
  };

  if (currentPage === 'landing') {
    return (
      <>
        <SEOHead
          currentPage={currentPage}
          lang={lang}
          theme={db.profile.theme}
          fiscalYearLabel={db.profile.fiscalYearLabel}
        />
        <LandingPage
          profile={db.profile}
          activeFy={activeFy}
          fiscalYearsCount={db.fiscalYears.length}
          pinEnabled={db.security.pinEnabled}
          summary={portfolioSummary}
          yoyComparison={yoyComparison}
          onNavigate={handleNavigatePage}
          onToggleLanguage={handleToggleLanguage}
          onToggleTheme={handleToggleTheme}
        />
        <OfflineIndicator lang={lang} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 pb-20 md:pb-8 transition-colors flex flex-col">
      <SEOHead
        currentPage={currentPage}
        lang={lang}
        theme={db.profile.theme}
        fiscalYearLabel={db.profile.fiscalYearLabel}
      />
      {/* Strict 3-Zone Top Navigation Bar */}
      <header className="no-print sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        <div className="mx-auto flex h-12 md:h-14 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Single text element wordmark (navigates to Landing Page) */}
          <button
            type="button"
            onClick={() => handleNavigatePage('landing')}
            className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            {UI_TEXT.brand[lang]}
          </button>

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
            {navItems.map((item) => {
              const isActive = currentPage === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigatePage(item.key)}
                  className={`py-4 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'border-blue-600 dark:border-blue-400 font-semibold text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() =>
                setLogModalState({ open: true, monthIndex: db.profile.activeMonthIndex })
              }
              className="min-h-[36px] md:min-h-[38px] rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {UI_TEXT.logActualCta[lang]}
            </button>
          </div>
        </div>
      </header>

      {/* Contextual Multi-Page Breadcrumb & Workspace Utility Toolbar (Below Header) */}
      <div className="no-print border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8 text-xs">
          <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
            <button
              type="button"
              onClick={() => handleNavigatePage('landing')}
              className="inline-flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
            >
              <Home className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'መነሻ' : 'Home'}</span>
            </button>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            <span className="font-semibold text-slate-900 dark:text-white">
              {pageBreadcrumbLabels[currentPage]}
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="hidden sm:inline font-medium text-slate-700 dark:text-slate-300">
              {db.profile.employeeName}
            </span>
            <span className="hidden lg:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <span className="hidden lg:inline text-slate-500 dark:text-slate-400">
              {lang === 'am' ? 'የአሁኑ ወር፦ ' : 'Active Month: '}
              <strong className="text-slate-800 dark:text-slate-200">
                {lang === 'am' ? currentMonthMeta.fullAm : currentMonthMeta.fullEn}
              </strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Prospect Pipeline & Action Tasks Workspace Route */}
            <button
              type="button"
              onClick={() => {
                setPipelineFilterKpiId(null);
                handleNavigatePage('pipeline');
              }}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'pipeline'
                  ? 'border-blue-600 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <ListTodo className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>{UI_TEXT.pipelineBtn[lang]}</span>
              {activePipelineCount > 0 && (
                <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
                  · {activePipelineCount}
                </span>
              )}
            </button>

            {/* Weekly Check-In Batch Logger Trigger */}
            <button
              type="button"
              onClick={() => setIsWeeklyCheckInOpen(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CalendarCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{UI_TEXT.checkInBtn[lang]}</span>
            </button>

            {/* Quick Multi-Fiscal-Year Switcher + Archive/Rollover Modal Trigger */}
            {db.fiscalYears.length > 1 ? (
              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-0.5">
                <select
                  aria-label={lang === 'am' ? 'የበጀት ዓመት ይምረጡ' : 'Select Fiscal Year'}
                  value={activeFy.id}
                  onChange={(e) => handleSelectFiscalYear(e.target.value)}
                  className="min-h-[34px] rounded-md bg-transparent pl-2.5 pr-1 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer"
                >
                  {db.fiscalYears.map((fy) => (
                    <option
                      key={fy.id}
                      value={fy.id}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {fy.fiscalYearLabel}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsFiscalYearModalOpen(true)}
                  className="inline-flex min-h-[34px] items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
                  title={UI_TEXT.fiscalYearsBtn[lang]}
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {lang === 'am' ? '+ ዓመት' : '+ Years'}
                  </span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsFiscalYearModalOpen(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CalendarRange className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>{UI_TEXT.fiscalYearsBtn[lang]}</span>
              </button>
            )}

            <PWAInstallButton
              lang={lang}
              onOpenInstallPage={() => handleNavigatePage('install')}
            />

            {/* Dark / Light Theme Toggle */}
            <button
              type="button"
              onClick={handleToggleTheme}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={
                db.profile.theme === 'dark'
                  ? lang === 'am'
                    ? 'ወደ ብሩህ ገጽታ ቀይር'
                    : 'Switch to Light Mode'
                  : lang === 'am'
                    ? 'ወደ ጨለማ ገጽታ ቀይር'
                    : 'Switch to Dark Mode'
              }
            >
              {db.profile.theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-500" />
              )}
              <span className="hidden lg:inline">
                {db.profile.theme === 'dark' ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Quick PIN Lock Trigger (when PIN is configured) */}
            {db.security.pinEnabled && db.security.pinCode.length === 4 && (
              <button
                type="button"
                onClick={() => setIsLocked(true)}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={lang === 'am' ? 'አፑን አሁን ቆልፍ' : 'Lock App Now'}
              >
                <Lock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>{lang === 'am' ? 'ቆልፍ' : 'Lock'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleLanguage}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Globe className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>{lang === 'am' ? 'English' : 'አማርኛ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsProfileModalOpen(true)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
              <span>{UI_TEXT.settingsBtn[lang]}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Viewport with Animated Multi-Page Route Transitions */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            {currentPage === 'overview' && (
              <OverviewView
                profile={db.profile}
                activeFy={activeFy}
                kpis={activeFy.kpis}
                logs={activeFy.actualLogs}
                categories={db.categories}
                summary={portfolioSummary}
                yoyComparison={yoyComparison}
                checkInSettings={effectiveCheckInSettings}
                scope={scope}
                onChangeScope={setScope}
                onUpdateWorkingDays={handleUpdateWorkingDays}
                onOpenWorkingCalendar={(monthIdx) =>
                  setWorkingCalendarState({ open: true, monthIndex: monthIdx })
                }
                onOpenWeeklyCheckIn={() => setIsWeeklyCheckInOpen(true)}
                onOpenPipeline={(kpiId) => {
                  setPipelineFilterKpiId(kpiId || null);
                  handleNavigatePage('pipeline');
                }}
                onNavigateTab={(t) => handleNavigateTab(t)}
                onQuickLogForKpi={(kpiId, monthIdx) =>
                  setLogModalState({
                    open: true,
                    kpiId,
                    monthIndex:
                      monthIdx !== undefined
                        ? monthIdx
                        : scope.type === 'month'
                          ? scope.monthIndex
                          : db.profile.activeMonthIndex,
                  })
                }
              />
            )}

            {currentPage === 'branch' && (
              <BranchPlanView
                profile={db.profile}
                activeFy={activeFy}
                priorFy={priorFy}
                kpis={activeFy.kpis}
                categories={db.categories}
                onSaveKpi={handleSaveKpi}
                onUpdateKpis={handleUpdateKpis}
                onDeleteKpi={handleDeleteKpi}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {currentPage === 'personal' && (
              <PersonalPlanView
                profile={db.profile}
                activeFy={activeFy}
                priorFy={priorFy}
                kpis={activeFy.kpis}
                categories={db.categories}
                focusedKpiId={focusedKpiId}
                onSaveKpi={handleSaveKpi}
                onUpdateKpis={handleUpdateKpis}
                onOpenWorkingCalendar={(monthIdx) =>
                  setWorkingCalendarState({ open: true, monthIndex: monthIdx })
                }
                onNavigateTab={(t) => handleNavigateTab(t)}
              />
            )}

            {currentPage === 'actuals' && (
              <ActualsView
                profile={db.profile}
                activeFy={activeFy}
                priorFy={priorFy}
                kpis={activeFy.kpis}
                categories={db.categories}
                logs={activeFy.actualLogs}
                onSaveKpi={handleSaveKpi}
                onUpdateKpis={handleUpdateKpis}
                onSetMonthlyActualTotal={handleSetMonthlyActualTotal}
                onClearMonthlyActual={handleClearMonthlyActual}
                onDeleteLog={handleDeleteLog}
                onOpenLogModal={(kpiId, monthIndex) =>
                  setLogModalState({ open: true, kpiId, monthIndex })
                }
                onNavigateTab={handleNavigateTab}
              />
            )}

            {currentPage === 'pipeline' && (
              <PipelineTasksView
                profile={db.profile}
                kpis={activeFy.kpis}
                logs={activeFy.actualLogs}
                categories={db.categories}
                prospects={activeFy.prospects || []}
                actionTasks={activeFy.actionTasks || []}
                initialKpiId={pipelineFilterKpiId}
                onSaveProspect={handleSaveProspect}
                onDeleteProspect={handleDeleteProspect}
                onConvertProspectToActual={handleConvertProspectToActual}
                onSaveTask={handleSaveTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            {currentPage === 'reports' && (
              <ReportsView
                profile={db.profile}
                activeFy={activeFy}
                allFiscalYears={db.fiscalYears}
                categories={db.categories}
                summary={portfolioSummary}
                scope={scope}
                onChangeScope={setScope}
                onSaveAppraisalNarrative={handleSaveAppraisalNarrative}
                onOpenWorkingCalendar={(monthIdx) =>
                  setWorkingCalendarState({ open: true, monthIndex: monthIdx })
                }
              />
            )}

            {currentPage === 'install' && (
              <InstallPage
                lang={lang}
                kpiCount={activeFy.kpis.length}
                fiscalYearsCount={db.fiscalYears.length}
                pinEnabled={db.security.pinEnabled}
                onNavigate={handleNavigatePage}
                onExportBackup={() => exportDatabaseAsJson(db)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quiet Multi-Page Workspace Footer */}
      <footer className="no-print mt-10 border-t border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2.5">
            <BiqatBrandMark className="h-5 w-5" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {UI_TEXT.brand[lang]}
            </span>
            <span aria-hidden="true">·</span>
            <span>{db.profile.branchName}</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => handleNavigatePage('landing')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {lang === 'am' ? 'መነሻ ገጽ (Home)' : 'Landing Page'}
            </button>
            <button
              type="button"
              onClick={() => handleNavigatePage('overview')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.overview[lang]}
            </button>
            <button
              type="button"
              onClick={() => {
                setPipelineFilterKpiId(null);
                handleNavigatePage('pipeline');
              }}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.pipelineBtn[lang]}
            </button>
            <button
              type="button"
              onClick={() => handleNavigatePage('reports')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              {UI_TEXT.nav.reports[lang]}
            </button>
            <button
              type="button"
              onClick={() => handleNavigatePage('install')}
              className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {lang === 'am' ? 'አፑን ጫን እና ኦፍላይን መመሪያ' : 'Install & Offline Guide'}
            </button>
          </div>
        </div>
      </footer>

      {/* Mobile Ergonomic Bottom Navigation Bar (15% Mobile Sticky Cap Compliant) */}
      <nav
        aria-label="Mobile Primary Navigation"
        className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md"
      >
        <div className="grid grid-cols-5 items-center h-[52px]">
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigatePage(item.key)}
                className={`flex min-h-[44px] flex-col items-center justify-center px-1 transition-colors cursor-pointer ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mobileNavIcons[item.key]}
                <span className="mt-0.5 text-[10px] tracking-tight truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Connectivity Offline Toast Indicator */}
      <OfflineIndicator lang={lang} />

      {/* Modals */}
      <LogActualModal
        isOpen={logModalState.open}
        profile={db.profile}
        activeFy={activeFy}
        kpis={activeFy.kpis}
        logs={activeFy.actualLogs}
        initialKpiId={logModalState.kpiId}
        initialMonthIndex={logModalState.monthIndex}
        onClose={() => setLogModalState({ open: false })}
        onAddLog={handleAddLog}
        onSaveKpi={handleSaveKpi}
      />

      <WorkingCalendarModal
        isOpen={workingCalendarState.open}
        profile={db.profile}
        activeFy={activeFy}
        initialMonthIndex={workingCalendarState.monthIndex}
        onClose={() => setWorkingCalendarState((prev) => ({ ...prev, open: false }))}
        onSaveMonthWorkingConfig={handleSaveMonthWorkingConfig}
      />

      <WeeklyCheckInModal
        isOpen={isWeeklyCheckInOpen}
        profile={db.profile}
        activeFy={activeFy}
        kpis={activeFy.kpis}
        logs={activeFy.actualLogs}
        checkInSettings={effectiveCheckInSettings}
        onClose={() => setIsWeeklyCheckInOpen(false)}
        onBatchAddLogs={handleBatchAddLogs}
        onUpdateCheckInSettings={handleUpdateCheckInSettings}
      />

      <ProfileBackupModal
        isOpen={isProfileModalOpen}
        profile={db.profile}
        security={db.security}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdateProfile={handleUpdateProfile}
        onUpdateSecurity={handleUpdateSecurity}
        onExportBackup={() => exportDatabaseAsJson(db)}
        onImportBackup={(imported) => {
          setDb(imported);
          void saveAppDatabase(imported);
        }}
        onResetSample={() => {
          const sample = createSeedData();
          sample.profile.language = db.profile.language;
          sample.profile.theme = db.profile.theme;
          setDb(sample);
          void saveAppDatabase(sample);
        }}
        onClearAllEmpty={() => {
          const empty = createEmptyData(db);
          setDb(empty);
          void saveAppDatabase(empty);
        }}
      />

      <FiscalYearModal
        isOpen={isFiscalYearModalOpen}
        lang={lang}
        activeFiscalYearId={activeFy.id}
        fiscalYears={db.fiscalYears}
        onClose={() => setIsFiscalYearModalOpen(false)}
        onSelectFiscalYear={handleSelectFiscalYear}
        onCreateFiscalYear={handleCreateFiscalYear}
        onToggleArchiveFiscalYear={handleToggleArchiveFiscalYear}
        onDeleteFiscalYear={handleDeleteFiscalYear}
      />
    </div>
  );
}
