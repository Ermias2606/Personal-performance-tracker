export type Language = 'am' | 'en';

export type ThemeMode = 'light' | 'dark';

export type FiscalCalendarType = 'july_june' | 'jan_dec';

// Supports built-in category IDs as well as custom user-created category IDs
export type KpiCategory = string;

export interface KpiCategoryDef {
  id: string;
  nameAm: string;
  nameEn: string;
  description?: string;
  isSystem?: boolean;
}

export type KpiUnit = 'ETB' | 'USD' | 'COUNT' | 'PERCENT' | 'SCORE';

export type KpiDirection = 'higher_better' | 'lower_better';

export type AggregationMode = 'sum' | 'average';

export type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export type ActiveTab = 'overview' | 'branch' | 'personal' | 'actuals' | 'reports';

export type AppPageRoute =
  | 'landing'
  | 'overview'
  | 'branch'
  | 'personal'
  | 'actuals'
  | 'pipeline'
  | 'reports'
  | 'install';

export type PeriodScope =
  | { type: 'ytd' }
  | { type: 'annual' }
  | { type: 'quarter'; quarter: QuarterKey }
  | { type: 'month'; monthIndex: number };

export type PlanDistributionStrategy =
  | 'equal'
  | 'working_days'
  | 'ramp_up'
  | 'front_loaded'
  | 'prior_year';

export interface KpiItem {
  id: string;
  code: string;
  name: string;
  nameEn?: string;
  category: KpiCategory;
  unit: KpiUnit;
  weight: number; // Percentage weight (e.g., 25 for 25%)
  direction: KpiDirection;
  aggregation: AggregationMode;
  branchAnnualTarget: number;
  personalAnnualTarget: number;
  quarterlyTargets: Record<QuarterKey, number>;
  monthlyTargets: number[]; // Length 12 (indices 0..11 in fiscal year)
  pinnedMonths?: number[]; // Month indices (0..11) locked from automatic redistribution
  distributionStrategy?: PlanDistributionStrategy;
  notes?: string;
}

export interface ActualLogEntry {
  id: string;
  kpiId: string;
  monthIndex: number; // 0..11 within the fiscal year
  date: string; // YYYY-MM-DD
  value: number;
  note: string;
  isDirectOverride?: boolean;
  createdAt: number;
}

export type ProspectStage = 'lead' | 'follow_up' | 'committed' | 'won' | 'lost';

export interface ProspectItem {
  id: string;
  kpiId: string;
  monthIndex: number; // Target fiscal month 0..11
  clientName: string;
  contactNote: string;
  expectedValue: number;
  probabilityPct: number; // 25..100
  stage: ProspectStage;
  targetDate: string; // YYYY-MM-DD
  convertedLogId?: string;
  createdAt: number;
}

export type TaskPriority = 'high' | 'medium' | 'normal';

export interface ActionTaskItem {
  id: string;
  kpiId?: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  priority: TaskPriority;
  completed: boolean;
  completedAt?: number;
  createdAt: number;
}

export interface AppraisalNarrative {
  keyAchievements: string;
  varianceExplanations: string;
  nextPeriodCommitments: string;
  supervisorComments: string;
  updatedAt?: string;
}

export interface HolidayEntry {
  id: string;
  date: string; // YYYY-MM-DD
  nameAm: string;
  nameEn: string;
  type: 'public_holiday' | 'personal_leave';
}

export interface MonthWorkingConfig {
  baseWorkingDays: number;
  elapsedWorkingDays: number;
  holidays: HolidayEntry[];
}

export interface WeeklyCheckInSettings {
  reminderEnabled: boolean;
  reminderDay: 'friday' | 'saturday' | 'monday';
  lastCheckInAt?: string;
}

export interface FiscalYearWorkspace {
  id: string;
  fiscalYearLabel: string;
  calendarType: FiscalCalendarType;
  activeMonthIndex: number; // 0..11 current month in fiscal year for YTD calculation
  workingDaysPerMonth: number; // Default base working days per month (e.g., 26 Mon-Sat)
  elapsedWorkingDaysInMonth: number; // Default elapsed working days in active month
  monthlyWorkingConfigs?: Record<number, MonthWorkingConfig>;
  prospects?: ProspectItem[];
  actionTasks?: ActionTaskItem[];
  appraisalNarrative?: AppraisalNarrative;
  isArchived?: boolean;
  kpis: KpiItem[];
  actualLogs: ActualLogEntry[];
}

export interface SecuritySettings {
  pinEnabled: boolean;
  pinCode: string; // 4-digit local PIN when enabled
}

export interface EmployeeProfile {
  employeeName: string;
  employeeId: string;
  roleTitle: string;
  branchName: string;
  fiscalYearLabel: string;
  calendarType: FiscalCalendarType;
  activeMonthIndex: number;
  language: Language;
  theme: ThemeMode;
}

export interface AppDatabasePayload {
  version: number;
  updatedAt: string;
  profile: EmployeeProfile;
  categories: KpiCategoryDef[];
  security: SecuritySettings;
  checkInSettings?: WeeklyCheckInSettings;
  activeFiscalYearId: string;
  fiscalYears: FiscalYearWorkspace[];
  // Legacy v1 compatibility fields kept synced with active fiscal year for seamless JSON exports
  kpis: KpiItem[];
  actualLogs: ActualLogEntry[];
}
