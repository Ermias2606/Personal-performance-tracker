import {
  FiscalCalendarType,
  KpiCategory,
  KpiCategoryDef,
  KpiUnit,
  Language,
  QuarterKey,
} from '../types/kpi';

export interface MonthMeta {
  index: number;
  quarter: QuarterKey;
  shortAm: string;
  fullAm: string;
  shortEn: string;
  fullEn: string;
}

export const DEFAULT_KPI_CATEGORIES: KpiCategoryDef[] = [
  {
    id: 'financial',
    nameAm: 'ፋይናንሻል እና ሀብት ማሰባሰብ',
    nameEn: 'Financial & Resource Mobilization',
    description: 'Deposit mobilization, FCY inflow, revenue, and loan collection',
    isSystem: true,
  },
  {
    id: 'customer',
    nameAm: 'ደንበኛ ማፍራት',
    nameEn: 'Customer Growth',
    description: 'New customer accounts, retention, and cross-selling',
    isSystem: true,
  },
  {
    id: 'digital',
    nameAm: 'ዲጂታል አገልግሎት',
    nameEn: 'Digital Channels',
    description: 'Mobile banking, card activation, QR & POS merchant onboarding',
    isSystem: true,
  },
  {
    id: 'operations',
    nameAm: 'ኦፕሬሽን እና አገልግሎት',
    nameEn: 'Operations & Service Delivery',
    description: 'Turnaround time, transaction processing, and service speed',
    isSystem: true,
  },
  {
    id: 'quality',
    nameAm: 'ጥራት እና ህግ ተገዢነት',
    nameEn: 'Quality, Audit & Risk',
    description: 'Audit compliance, KYC accuracy, and error rate control',
    isSystem: true,
  },
];

export const JULY_JUNE_MONTHS: MonthMeta[] = [
  { index: 0, quarter: 'Q1', shortAm: 'ሐምሌ', fullAm: 'ሐምሌ (Jul)', shortEn: 'Jul', fullEn: 'July (ሐምሌ)' },
  { index: 1, quarter: 'Q1', shortAm: 'ነሐሴ', fullAm: 'ነሐሴ (Aug)', shortEn: 'Aug', fullEn: 'August (ነሐሴ)' },
  { index: 2, quarter: 'Q1', shortAm: 'መስከ', fullAm: 'መስከረም (Sep)', shortEn: 'Sep', fullEn: 'September (መስከረም)' },
  { index: 3, quarter: 'Q2', shortAm: 'ጥቅም', fullAm: 'ጥቅምት (Oct)', shortEn: 'Oct', fullEn: 'October (ጥቅምት)' },
  { index: 4, quarter: 'Q2', shortAm: 'ኅዳር', fullAm: 'ኅዳር (Nov)', shortEn: 'Nov', fullEn: 'November (ኅዳር)' },
  { index: 5, quarter: 'Q2', shortAm: 'ታኅሣ', fullAm: 'ታኅሣሥ (Dec)', shortEn: 'Dec', fullEn: 'December (ታኅሣሥ)' },
  { index: 6, quarter: 'Q3', shortAm: 'ጥር', fullAm: 'ጥር (Jan)', shortEn: 'Jan', fullEn: 'January (ጥር)' },
  { index: 7, quarter: 'Q3', shortAm: 'የካቲ', fullAm: 'የካቲት (Feb)', shortEn: 'Feb', fullEn: 'February (የካቲት)' },
  { index: 8, quarter: 'Q3', shortAm: 'መጋቢ', fullAm: 'መጋቢት (Mar)', shortEn: 'Mar', fullEn: 'March (መጋቢት)' },
  { index: 9, quarter: 'Q4', shortAm: 'ሚያዝ', fullAm: 'ሚያዝያ (Apr)', shortEn: 'Apr', fullEn: 'April (ሚያዝያ)' },
  { index: 10, quarter: 'Q4', shortAm: 'ግንቦ', fullAm: 'ግንቦት (May)', shortEn: 'May', fullEn: 'May (ግንቦት)' },
  { index: 11, quarter: 'Q4', shortAm: 'ሰኔ', fullAm: 'ሰኔ (Jun)', shortEn: 'Jun', fullEn: 'June (ሰኔ)' },
];

export const JAN_DEC_MONTHS: MonthMeta[] = [
  { index: 0, quarter: 'Q1', shortAm: 'ጥር', fullAm: 'ጥር (Jan)', shortEn: 'Jan', fullEn: 'January' },
  { index: 1, quarter: 'Q1', shortAm: 'የካቲ', fullAm: 'የካቲት (Feb)', shortEn: 'Feb', fullEn: 'February' },
  { index: 2, quarter: 'Q1', shortAm: 'መጋቢ', fullAm: 'መጋቢት (Mar)', shortEn: 'Mar', fullEn: 'March' },
  { index: 3, quarter: 'Q2', shortAm: 'ሚያዝ', fullAm: 'ሚያዝያ (Apr)', shortEn: 'Apr', fullEn: 'April' },
  { index: 4, quarter: 'Q2', shortAm: 'ግንቦ', fullAm: 'ግንቦት (May)', shortEn: 'May', fullEn: 'May' },
  { index: 5, quarter: 'Q2', shortAm: 'ሰኔ', fullAm: 'ሰኔ (Jun)', shortEn: 'Jun', fullEn: 'June' },
  { index: 6, quarter: 'Q3', shortAm: 'ሐምሌ', fullAm: 'ሐምሌ (Jul)', shortEn: 'Jul', fullEn: 'July' },
  { index: 7, quarter: 'Q3', shortAm: 'ነሐሴ', fullAm: 'ነሐሴ (Aug)', shortEn: 'Aug', fullEn: 'August' },
  { index: 8, quarter: 'Q3', shortAm: 'መስከ', fullAm: 'መስከረም (Sep)', shortEn: 'Sep', fullEn: 'September' },
  { index: 9, quarter: 'Q4', shortAm: 'ጥቅም', fullAm: 'ጥቅምት (Oct)', shortEn: 'Oct', fullEn: 'October' },
  { index: 10, quarter: 'Q4', shortAm: 'ኅዳር', fullAm: 'ኅዳር (Nov)', shortEn: 'Nov', fullEn: 'November' },
  { index: 11, quarter: 'Q4', shortAm: 'ታኅሣ', fullAm: 'ታኅሣሥ (Dec)', shortEn: 'Dec', fullEn: 'December' },
];

export function getFiscalMonths(calendarType: FiscalCalendarType): MonthMeta[] {
  return calendarType === 'july_june' ? JULY_JUNE_MONTHS : JAN_DEC_MONTHS;
}

export const QUARTER_MONTH_INDICES: Record<QuarterKey, number[]> = {
  Q1: [0, 1, 2],
  Q2: [3, 4, 5],
  Q3: [6, 7, 8],
  Q4: [9, 10, 11],
};

export const QUARTERS: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];

export function getQuarterLabel(q: QuarterKey, lang: Language): string {
  const map: Record<QuarterKey, { am: string; en: string }> = {
    Q1: { am: '1ኛ ሩብ ዓመት (Q1)', en: 'Quarter 1 (Q1)' },
    Q2: { am: '2ኛ ሩብ ዓመት (Q2)', en: 'Quarter 2 (Q2)' },
    Q3: { am: '3ኛ ሩብ ዓመት (Q3)', en: 'Quarter 3 (Q3)' },
    Q4: { am: '4ኛ ሩብ ዓመት (Q4)', en: 'Quarter 4 (Q4)' },
  };
  return map[q][lang];
}

export function getCategoryLabel(
  catId: KpiCategory,
  lang: Language,
  categories: KpiCategoryDef[] = DEFAULT_KPI_CATEGORIES
): string {
  const found =
    categories.find((c) => c.id === catId) ||
    DEFAULT_KPI_CATEGORIES.find((c) => c.id === catId);
  if (found) {
    return lang === 'am' ? found.nameAm || found.nameEn : found.nameEn || found.nameAm;
  }
  return catId;
}

export function getUnitLabel(unit: KpiUnit, lang: Language): string {
  const map: Record<KpiUnit, { am: string; en: string }> = {
    ETB: { am: 'ብር (ETB)', en: 'ETB' },
    USD: { am: 'ዶላር (USD)', en: 'USD' },
    COUNT: { am: 'ብዛት', en: 'Count' },
    PERCENT: { am: 'መቶኛ (%)', en: 'Percent (%)' },
    SCORE: { am: 'ነጥብ', en: 'Score' },
  };
  return map[unit][lang];
}

export function formatKpiValue(value: number, unit: KpiUnit, compact = false): string {
  if (!Number.isFinite(value)) return '0';
  if (unit === 'PERCENT') {
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`;
  }
  if (unit === 'SCORE') {
    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  if (compact && Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000;
    const formatted = m.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return unit === 'ETB' ? `${formatted}M ETB` : unit === 'USD' ? `$${formatted}M` : `${formatted}M`;
  }
  if (compact && Math.abs(value) >= 10_000 && unit !== 'COUNT') {
    const k = value / 1_000;
    const formatted = k.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
    return unit === 'ETB' ? `${formatted}K ETB` : unit === 'USD' ? `$${formatted}K` : `${formatted}K`;
  }
  const base = value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: unit === 'COUNT' ? 0 : 2,
  });
  if (unit === 'ETB') return `${base} ETB`;
  if (unit === 'USD') return `$${base}`;
  return base;
}

export const UI_TEXT = {
  brand: { am: 'ብቃት KPI', en: 'Biqat KPI' },
  nav: {
    overview: { am: 'ዳሽቦርድ', en: 'Overview' },
    branch: { am: 'የቅርንጫፍ እቅድ', en: 'Branch Plan' },
    personal: { am: 'የግል እቅድ', en: 'My Plan' },
    actuals: { am: 'ክንውን', en: 'Actuals' },
    reports: { am: 'ሪፖርት', en: 'Reports' },
  },
  logActualCta: { am: '+ ክንውን መዝግብ', en: '+ Log Actual' },
  pipelineBtn: { am: 'ፓይፕላይን እና ተግባራት', en: 'Pipeline & Tasks' },
  checkInBtn: { am: 'ሳምንታዊ ክትትል', en: 'Weekly Check-In' },
  settingsBtn: { am: 'መገለጫ እና ዳታ', en: 'Profile & PIN' },
  fiscalYearsBtn: { am: 'የበጀት ዓመታት', en: 'Fiscal Years' },
  installApp: { am: 'አፑን ጫን (Offline)', en: 'Install App' },
};
