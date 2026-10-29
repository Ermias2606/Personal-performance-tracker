import {
  FiscalYearWorkspace,
  HolidayEntry,
  Language,
  MonthWorkingConfig,
} from '../types/kpi';

export interface EthiopianDateParts {
  year: number;
  month: number; // 1..13 (1 = Meskerem .. 13 = Pagume)
  day: number; // 1..30 (1..5/6 for Pagume)
}

export const ETHIOPIAN_MONTH_NAMES: {
  month: number;
  am: string;
  en: string;
}[] = [
  { month: 1, am: 'መስከረም', en: 'Meskerem' },
  { month: 2, am: 'ጥቅምት', en: 'Tikimt' },
  { month: 3, am: 'ኅዳር', en: 'Hidar' },
  { month: 4, am: 'ታኅሣሥ', en: 'Tahsas' },
  { month: 5, am: 'ጥር', en: 'Tir' },
  { month: 6, am: 'የካቲት', en: 'Yekatit' },
  { month: 7, am: 'መጋቢት', en: 'Megabit' },
  { month: 8, am: 'ሚያዝያ', en: 'Miyazia' },
  { month: 9, am: 'ግንቦት', en: 'Ginbot' },
  { month: 10, am: 'ሰኔ', en: 'Sene' },
  { month: 11, am: 'ሐምሌ', en: 'Hamle' },
  { month: 12, am: 'ነሐሴ', en: 'Nehase' },
  { month: 13, am: 'ጳጉሜ', en: 'Pagume' },
];

export interface PresetEthiopianHoliday {
  id: string;
  ethMonth: number;
  ethDay: number;
  nameAm: string;
  nameEn: string;
}

export const PRESET_ETHIOPIAN_PUBLIC_HOLIDAYS: PresetEthiopianHoliday[] = [
  { id: 'enkutatash', ethMonth: 1, ethDay: 1, nameAm: 'እንቁጣጣሽ (አዲስ ዓመት)', nameEn: 'Enkutatash (Ethiopian New Year)' },
  { id: 'meskel', ethMonth: 1, ethDay: 17, nameAm: 'መስቀል በዓል', nameEn: 'Finding of the True Cross (Meskel)' },
  { id: 'genna', ethMonth: 4, ethDay: 29, nameAm: 'የገና በዓል (ልደት)', nameEn: 'Ethiopian Christmas (Genna)' },
  { id: 'timket', ethMonth: 5, ethDay: 11, nameAm: 'የጥምቀት በዓል', nameEn: 'Epiphany (Timket)' },
  { id: 'adwa', ethMonth: 6, ethDay: 23, nameAm: 'የዓድዋ ድል በዓል', nameEn: 'Adwa Victory Day' },
  { id: 'labour', ethMonth: 8, ethDay: 23, nameAm: 'ዓለም አቀፍ የሰራተኞች ቀን', nameEn: 'International Workers Day' },
  { id: 'patriots', ethMonth: 8, ethDay: 27, nameAm: 'የአርበኞች ድል ቀን', nameEn: 'Patriots Victory Day' },
];

const ETHIOPIC_EPOCH_JDN = 1723856;

export function gregorianIsoToEthiopian(isoDate: string): EthiopianDateParts {
  const parts = isoDate.split('-').map(Number);
  const now = new Date();
  const gy = Number.isFinite(parts[0]) && parts[0] > 1900 ? parts[0] : now.getFullYear();
  const gm = Number.isFinite(parts[1]) && parts[1] >= 1 && parts[1] <= 12 ? parts[1] : now.getMonth() + 1;
  const gd = Number.isFinite(parts[2]) && parts[2] >= 1 && parts[2] <= 31 ? parts[2] : now.getDate();

  const a = Math.floor((14 - gm) / 12);
  const y = gy + 4800 - a;
  const m = gm + 12 * a - 3;
  const jdn =
    gd +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  const r = (((jdn - ETHIOPIC_EPOCH_JDN) % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const ey =
    4 * Math.floor((jdn - ETHIOPIC_EPOCH_JDN) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  const em = Math.floor(n / 30) + 1;
  const ed = (n % 30) + 1;

  return { year: ey, month: em, day: ed };
}

export function ethiopianToGregorianIso(year: number, month: number, day: number): string {
  const safeMonth = Math.max(1, Math.min(13, Math.round(month)));
  const maxDays = safeMonth === 13 ? (year % 4 === 3 ? 6 : 5) : 30;
  const safeDay = Math.max(1, Math.min(maxDays, Math.round(day)));

  const jdn =
    ETHIOPIC_EPOCH_JDN +
    365 * year +
    Math.floor(year / 4) +
    30 * (safeMonth - 1) +
    (safeDay - 1);

  const l1 = jdn + 68569;
  const n = Math.floor((4 * l1) / 146097);
  const l2 = l1 - Math.floor((146097 * n + 3) / 4);
  const i = Math.floor((4000 * (l2 + 1)) / 1461001);
  const l3 = l2 - Math.floor((1461 * i) / 4) + 31;
  const j = Math.floor((80 * l3) / 2447);
  const gd = l3 - Math.floor((2447 * j) / 80);
  const l4 = Math.floor(j / 11);
  const gm = j + 2 - 12 * l4;
  const gy = 100 * (n - 49) + i + l4;

  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
}

export function formatEthiopianDate(isoDate: string, lang: Language, includeYear = true): string {
  const eth = gregorianIsoToEthiopian(isoDate);
  const mMeta = ETHIOPIAN_MONTH_NAMES[eth.month - 1] || ETHIOPIAN_MONTH_NAMES[0];
  if (lang === 'am') {
    return includeYear
      ? `${mMeta.am} ${eth.day}፣ ${eth.year} ዓ.ም`
      : `${mMeta.am} ${eth.day}`;
  }
  return includeYear
    ? `${mMeta.en} ${eth.day}, ${eth.year} E.C.`
    : `${mMeta.en} ${eth.day}`;
}

export function getEffectiveMonthWorkingConfig(
  fy: FiscalYearWorkspace,
  monthIndex: number
): {
  baseWorkingDays: number;
  holidays: HolidayEntry[];
  publicHolidayCount: number;
  leaveDayCount: number;
  netWorkingDays: number;
  elapsedWorkingDays: number;
} {
  const override: MonthWorkingConfig | undefined = fy.monthlyWorkingConfigs?.[monthIndex];
  const baseWorkingDays = Math.max(
    1,
    Math.min(31, override?.baseWorkingDays ?? fy.workingDaysPerMonth ?? 26)
  );
  const holidays = Array.isArray(override?.holidays) ? override.holidays : [];
  const publicHolidayCount = holidays.filter((h) => h.type === 'public_holiday').length;
  const leaveDayCount = holidays.filter((h) => h.type === 'personal_leave').length;
  const netWorkingDays = Math.max(1, baseWorkingDays - holidays.length);

  const defaultElapsed =
    monthIndex === fy.activeMonthIndex
      ? fy.elapsedWorkingDaysInMonth
      : monthIndex < fy.activeMonthIndex
        ? netWorkingDays
        : 0;

  const rawElapsed = override?.elapsedWorkingDays ?? defaultElapsed;
  const elapsedWorkingDays = Math.max(0, Math.min(netWorkingDays, rawElapsed));

  return {
    baseWorkingDays,
    holidays,
    publicHolidayCount,
    leaveDayCount,
    netWorkingDays,
    elapsedWorkingDays,
  };
}
