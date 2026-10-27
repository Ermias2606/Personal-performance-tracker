import {
  ActualLogEntry,
  AppDatabasePayload,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiItem,
  QuarterKey,
} from '../types/kpi';
import { DEFAULT_KPI_CATEGORIES, QUARTERS } from '../utils/i18n';

const DB_NAME = 'biqat_kpi_personal_tracker_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const RECORD_KEY = 'primary_workspace';
const LS_FALLBACK_KEY = 'biqat_kpi_fallback_v1';

function buildPriorYearArchive(): FiscalYearWorkspace {
  const kpis: KpiItem[] = [
    {
      id: 'fy2018-kpi-deposit',
      code: 'KPI-01',
      name: 'ተቀማጭ ገንዘብ ማሰባሰብ (Net Deposit Mobilization)',
      category: 'financial',
      unit: 'ETB',
      weight: 30,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 150_000_000,
      personalAnnualTarget: 15_000_000,
      quarterlyTargets: { Q1: 3_600_000, Q2: 3_600_000, Q3: 3_900_000, Q4: 3_900_000 },
      monthlyTargets: [
        1_200_000, 1_200_000, 1_200_000,
        1_200_000, 1_200_000, 1_200_000,
        1_300_000, 1_300_000, 1_300_000,
        1_300_000, 1_300_000, 1_300_000,
      ],
      notes: 'የ2018 ዓ.ም የተጠናቀቀ ዓመታዊ ተቀማጭ እቅድ',
    },
    {
      id: 'fy2018-kpi-accounts',
      code: 'KPI-02',
      name: 'አዲስ ደንበኞች ማፍራት (New Customer Accounts)',
      category: 'customer',
      unit: 'COUNT',
      weight: 20,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 5_000,
      personalAnnualTarget: 600,
      quarterlyTargets: { Q1: 150, Q2: 150, Q3: 150, Q4: 150 },
      monthlyTargets: Array(12).fill(50),
    },
    {
      id: 'fy2018-kpi-digital',
      code: 'KPI-03',
      name: 'ዲጂታል ባንኪንግ ማስጀመር (Mobile & Digital Activation)',
      category: 'digital',
      unit: 'COUNT',
      weight: 15,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 4_000,
      personalAnnualTarget: 480,
      quarterlyTargets: { Q1: 120, Q2: 120, Q3: 120, Q4: 120 },
      monthlyTargets: Array(12).fill(40),
    },
    {
      id: 'fy2018-kpi-fcy',
      code: 'KPI-04',
      name: 'የውጭ ምንዛሬ ግኝት (FCY Remittance & Inflow)',
      category: 'financial',
      unit: 'USD',
      weight: 15,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 500_000,
      personalAnnualTarget: 42_000,
      quarterlyTargets: { Q1: 10_500, Q2: 10_500, Q3: 10_500, Q4: 10_500 },
      monthlyTargets: Array(12).fill(3_500),
    },
    {
      id: 'fy2018-kpi-merchant',
      code: 'KPI-05',
      name: 'መርቻንት QR / POS ማስፋፋት (Merchant Onboarding)',
      category: 'digital',
      unit: 'COUNT',
      weight: 10,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 300,
      personalAnnualTarget: 36,
      quarterlyTargets: { Q1: 9, Q2: 9, Q3: 9, Q4: 9 },
      monthlyTargets: Array(12).fill(3),
    },
    {
      id: 'fy2018-kpi-error',
      code: 'KPI-06',
      name: 'የኦፕሬሽን ስህተት ምጣኔ (Operational Error Rate)',
      category: 'quality',
      unit: 'PERCENT',
      weight: 10,
      direction: 'lower_better',
      aggregation: 'average',
      branchAnnualTarget: 1.0,
      personalAnnualTarget: 1.0,
      quarterlyTargets: { Q1: 1.0, Q2: 1.0, Q3: 1.0, Q4: 1.0 },
      monthlyTargets: Array(12).fill(1.0),
    },
  ];

  const depositActuals = [
    1_180_000, 1_150_000, 1_290_000, 1_210_000, 1_260_000, 1_310_000,
    1_280_000, 1_340_000, 1_390_000, 1_320_000, 1_410_000, 1_480_000,
  ];
  const accountActuals = [48, 49, 54, 51, 52, 55, 50, 53, 56, 52, 55, 58];
  const digitalActuals = [38, 41, 45, 42, 44, 46, 43, 45, 47, 44, 48, 50];
  const fcyActuals = [3_100, 2_900, 3_600, 2_850, 3_200, 3_900, 3_300, 3_400, 3_750, 3_500, 3_800, 4_100];
  const merchantActuals = [2, 3, 3, 3, 3, 4, 3, 3, 4, 3, 4, 4];
  const errorActuals = [0.9, 0.85, 0.8, 0.9, 0.75, 0.8, 0.7, 0.8, 0.75, 0.7, 0.65, 0.6];

  const actualLogs: ActualLogEntry[] = [];
  for (let m = 0; m < 12; m++) {
    const yearNum = m < 6 ? 2025 : 2026;
    const calMonth = ((m + 6) % 12) + 1;
    const dateStr = `${yearNum}-${String(calMonth).padStart(2, '0')}-28`;

    actualLogs.push(
      { id: `p18-dep-${m}`, kpiId: 'fy2018-kpi-deposit', monthIndex: m, date: dateStr, value: depositActuals[m], note: '2018 ዓ.ም ወርሃዊ ክንውን', createdAt: 1720000000000 + m * 86400000 },
      { id: `p18-acc-${m}`, kpiId: 'fy2018-kpi-accounts', monthIndex: m, date: dateStr, value: accountActuals[m], note: '2018 ዓ.ም ወርሃዊ ክንውን', createdAt: 1720000000000 + m * 86400000 },
      { id: `p18-dig-${m}`, kpiId: 'fy2018-kpi-digital', monthIndex: m, date: dateStr, value: digitalActuals[m], note: '2018 ዓ.ም ወርሃዊ ክንውን', createdAt: 1720000000000 + m * 86400000 },
      { id: `p18-fcy-${m}`, kpiId: 'fy2018-kpi-fcy', monthIndex: m, date: dateStr, value: fcyActuals[m], note: '2018 ዓ.ም ወርሃዊ ክንውን', createdAt: 1720000000000 + m * 86400000 },
      { id: `p18-mer-${m}`, kpiId: 'fy2018-kpi-merchant', monthIndex: m, date: dateStr, value: merchantActuals[m], note: '2018 ዓ.ም ወርሃዊ ክንውን', createdAt: 1720000000000 + m * 86400000 },
      { id: `p18-err-${m}`, kpiId: 'fy2018-kpi-error', monthIndex: m, date: dateStr, value: errorActuals[m], note: '2018 ዓ.ም ወርሃዊ ጥራት', createdAt: 1720000000000 + m * 86400000 }
    );
  }

  return {
    id: 'fy-2018',
    fiscalYearLabel: '2018 ዓ.ም (2025/26 FY)',
    calendarType: 'july_june',
    activeMonthIndex: 11,
    workingDaysPerMonth: 26,
    elapsedWorkingDaysInMonth: 26,
    isArchived: true,
    kpis,
    actualLogs,
  };
}

export function createSeedData(): AppDatabasePayload {
  const profile: EmployeeProfile = {
    employeeName: 'አቤል ታደሰ (Abel Tadesse)',
    employeeId: 'EMP-2048',
    roleTitle: 'ከፍተኛ የደንበኞች አገልግሎት ባለሙያ (Senior CSO)',
    branchName: 'ቦሌ መድኃኔዓለም ቅርንጫፍ (Bole Medhanialem Branch)',
    fiscalYearLabel: '2019 ዓ.ም (2026/27 FY)',
    calendarType: 'july_june',
    activeMonthIndex: 3, // ጥቅምት / October (4th month of July–June FY)
    language: 'am',
    theme: 'light',
  };

  const kpis: KpiItem[] = [
    {
      id: 'kpi-deposit',
      code: 'KPI-01',
      name: 'ተቀማጭ ገንዘብ ማሰባሰብ (Net Deposit Mobilization)',
      category: 'financial',
      unit: 'ETB',
      weight: 30,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 180_000_000,
      personalAnnualTarget: 18_000_000,
      quarterlyTargets: {
        Q1: 4_200_000,
        Q2: 4_500_000,
        Q3: 4_500_000,
        Q4: 4_800_000,
      },
      monthlyTargets: [
        1_400_000, 1_400_000, 1_400_000,
        1_500_000, 1_500_000, 1_500_000,
        1_500_000, 1_500_000, 1_500_000,
        1_600_000, 1_600_000, 1_600_000,
      ],
      notes: 'የቁጠባ፣ የተንቀሳቃሽ እና የጊዜ ገደብ ተቀማጭ ሒሳቦች የተጣራ ጭማሪ',
    },
    {
      id: 'kpi-accounts',
      code: 'KPI-02',
      name: 'አዲስ ደንበኞች ማፍራት (New Customer Accounts)',
      category: 'customer',
      unit: 'COUNT',
      weight: 20,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 6_000,
      personalAnnualTarget: 720,
      quarterlyTargets: { Q1: 180, Q2: 180, Q3: 180, Q4: 180 },
      monthlyTargets: [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
      notes: 'ንቁ አዲስ የባንክ ሒሳብ የከፈቱ ደንበኞች ብዛት',
    },
    {
      id: 'kpi-digital',
      code: 'KPI-03',
      name: 'ዲጂታል ባንኪንግ ማስጀመር (Mobile & Digital Activation)',
      category: 'digital',
      unit: 'COUNT',
      weight: 15,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 4_800,
      personalAnnualTarget: 600,
      quarterlyTargets: { Q1: 150, Q2: 150, Q3: 150, Q4: 150 },
      monthlyTargets: [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50],
      notes: 'ሞባይል ባንኪንግ፣ ካርድ እና ኢንተርኔት ባንኪንግ አክቲቭ ያደረጉ ደንበኞች',
    },
    {
      id: 'kpi-fcy',
      code: 'KPI-04',
      name: 'የውጭ ምንዛሬ ግኝት (FCY Remittance & Inflow)',
      category: 'financial',
      unit: 'USD',
      weight: 15,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 600_000,
      personalAnnualTarget: 48_000,
      quarterlyTargets: { Q1: 12_000, Q2: 12_000, Q3: 12_000, Q4: 12_000 },
      monthlyTargets: [4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000, 4_000],
      notes: 'ከሐዋላ፣ ከውጭ ምንዛሬ ሒሳቦች እና ከኤክስፖርት ደንበኞች የተገኘ USD',
    },
    {
      id: 'kpi-merchant',
      code: 'KPI-05',
      name: 'መርቻንት QR / POS ማስፋፋት (Merchant Onboarding)',
      category: 'digital',
      unit: 'COUNT',
      weight: 10,
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: 360,
      personalAnnualTarget: 48,
      quarterlyTargets: { Q1: 12, Q2: 12, Q3: 12, Q4: 12 },
      monthlyTargets: [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      notes: 'አዲስ የነጋዴ QR እና POS ክፍያ ተጠቃሚ ነጋዴዎች',
    },
    {
      id: 'kpi-error',
      code: 'KPI-06',
      name: 'የኦፕሬሽን ስህተት ምጣኔ (Operational Error Rate)',
      category: 'quality',
      unit: 'PERCENT',
      weight: 10,
      direction: 'lower_better',
      aggregation: 'average',
      branchAnnualTarget: 1.0,
      personalAnnualTarget: 1.0,
      quarterlyTargets: { Q1: 1.0, Q2: 1.0, Q3: 1.0, Q4: 1.0 },
      monthlyTargets: [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      notes: 'ከ1.0% በታች የኦዲት እና የትራንዛክሽን ግድፈት ምጣኔን መጠበቅ (ዝቅተኛ ቁጥር የተሻለ ነው)',
    },
  ];

  const actualLogs: ActualLogEntry[] = [
    { id: 'log-1', kpiId: 'kpi-deposit', monthIndex: 0, date: '2026-07-28', value: 1_480_000, note: 'የሐምሌ ወር አዲስ የንግድ እና የቁጠባ ተቀማጭ', createdAt: 1753700000000 },
    { id: 'log-2', kpiId: 'kpi-deposit', monthIndex: 1, date: '2026-08-29', value: 1_320_000, note: 'የነሐሴ ወር የተጣራ ተቀማጭ ገንዘብ', createdAt: 1756400000000 },
    { id: 'log-3', kpiId: 'kpi-deposit', monthIndex: 2, date: '2026-09-28', value: 1_550_000, note: 'የመስከረም አዲስ ዓመት ዘመቻ ተቀማጭ', createdAt: 1759000000000 },
    { id: 'log-4', kpiId: 'kpi-deposit', monthIndex: 3, date: '2026-10-14', value: 820_000, note: 'ከኮርፖሬት ደንበኛ የተገኘ የጊዜ ገደብ ተቀማጭ', createdAt: 1760400000000 },
    { id: 'log-5', kpiId: 'kpi-deposit', monthIndex: 3, date: '2026-10-25', value: 540_000, note: 'የጥቅምት 3ኛ ሳምንት የቁጠባ ሒሳቦች ድምር', createdAt: 1761350000000 },

    { id: 'log-6', kpiId: 'kpi-accounts', monthIndex: 0, date: '2026-07-30', value: 64, note: 'ሐምሌ አዲስ ደንበኞች', createdAt: 1753800000000 },
    { id: 'log-7', kpiId: 'kpi-accounts', monthIndex: 1, date: '2026-08-30', value: 58, note: 'ነሐሴ አዲስ ደንበኞች', createdAt: 1756500000000 },
    { id: 'log-8', kpiId: 'kpi-accounts', monthIndex: 2, date: '2026-09-29', value: 68, note: 'መስከረም የበዓል ዘመቻ ደንበኞች', createdAt: 1759100000000 },
    { id: 'log-9', kpiId: 'kpi-accounts', monthIndex: 3, date: '2026-10-26', value: 53, note: 'ጥቅምት እስካሁን የተከፈቱ ሒሳቦች', createdAt: 1761440000000 },

    { id: 'log-10', kpiId: 'kpi-digital', monthIndex: 0, date: '2026-07-30', value: 52, note: 'ሞባይል ባንኪንግ አክቲቬሽን', createdAt: 1753810000000 },
    { id: 'log-11', kpiId: 'kpi-digital', monthIndex: 1, date: '2026-08-30', value: 55, note: 'ሞባይል እና ካርድ አክቲቬሽን', createdAt: 1756510000000 },
    { id: 'log-12', kpiId: 'kpi-digital', monthIndex: 2, date: '2026-09-29', value: 61, note: 'ዲጂታል ቻናል ምዝገባ', createdAt: 1759110000000 },
    { id: 'log-13', kpiId: 'kpi-digital', monthIndex: 3, date: '2026-10-26', value: 49, note: 'ጥቅምት ሞባይል ባንኪንግ ተጠቃሚዎች', createdAt: 1761450000000 },

    { id: 'log-14', kpiId: 'kpi-fcy', monthIndex: 0, date: '2026-07-30', value: 3_400, note: 'ዓለም አቀፍ ሐዋላ ግኝት', createdAt: 1753820000000 },
    { id: 'log-15', kpiId: 'kpi-fcy', monthIndex: 1, date: '2026-08-30', value: 2_950, note: 'የነሐሴ የውጭ ምንዛሬ ግኝት', createdAt: 1756520000000 },
    { id: 'log-16', kpiId: 'kpi-fcy', monthIndex: 2, date: '2026-09-29', value: 4_350, note: 'የአዲስ ዓመት ዲያስፖራ ሐዋላ', createdAt: 1759120000000 },
    { id: 'log-17', kpiId: 'kpi-fcy', monthIndex: 3, date: '2026-10-24', value: 2_600, note: 'የጥቅምት ሐዋላ እና FCY ክፍያ', createdAt: 1761300000000 },

    { id: 'log-18', kpiId: 'kpi-merchant', monthIndex: 0, date: '2026-07-30', value: 3, note: 'QR ነጋዴዎች ምዝገባ', createdAt: 1753830000000 },
    { id: 'log-19', kpiId: 'kpi-merchant', monthIndex: 1, date: '2026-08-30', value: 4, note: 'ነጋዴ POS እና QR', createdAt: 1756530000000 },
    { id: 'log-20', kpiId: 'kpi-merchant', monthIndex: 2, date: '2026-09-29', value: 3, note: 'ካፌ እና ሱፐርማርኬት QR', createdAt: 1759130000000 },
    { id: 'log-21', kpiId: 'kpi-merchant', monthIndex: 3, date: '2026-10-22', value: 2, note: 'የጥቅምት አዲስ QR ነጋዴዎች', createdAt: 1761150000000 },

    { id: 'log-22', kpiId: 'kpi-error', monthIndex: 0, date: '2026-07-31', value: 0.6, note: 'የሐምሌ የውስጥ ኦዲት ግምገማ ውጤት', createdAt: 1753900000000 },
    { id: 'log-23', kpiId: 'kpi-error', monthIndex: 1, date: '2026-08-31', value: 0.8, note: 'የነሐሴ የትራንዛክሽን ጥራት ሪፖርት', createdAt: 1756600000000 },
    { id: 'log-24', kpiId: 'kpi-error', monthIndex: 2, date: '2026-09-30', value: 0.5, note: 'የመስከረም ኦፕሬሽን ጥራት ቁጥጥር', createdAt: 1759200000000 },
    { id: 'log-25', kpiId: 'kpi-error', monthIndex: 3, date: '2026-10-26', value: 0.7, note: 'የጥቅምት ወርሃዊ የጥራት ፍተሻ', createdAt: 1761460000000 },
  ];

  const currentFy: FiscalYearWorkspace = {
    id: 'fy-2019',
    fiscalYearLabel: '2019 ዓ.ም (2026/27 FY)',
    calendarType: 'july_june',
    activeMonthIndex: 3,
    workingDaysPerMonth: 26,
    elapsedWorkingDaysInMonth: 21,
    isArchived: false,
    kpis,
    actualLogs,
  };

  const priorFy = buildPriorYearArchive();

  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    profile,
    categories: DEFAULT_KPI_CATEGORIES,
    security: {
      pinEnabled: false,
      pinCode: '',
    },
    activeFiscalYearId: currentFy.id,
    fiscalYears: [currentFy, priorFy],
    kpis: currentFy.kpis,
    actualLogs: currentFy.actualLogs,
  };
}

export function normalizeDatabasePayload(raw: Partial<AppDatabasePayload>): AppDatabasePayload {
  const seed = createSeedData();
  const profile: EmployeeProfile = {
    ...seed.profile,
    ...(raw.profile || {}),
    theme: raw.profile?.theme === 'dark' ? 'dark' : 'light',
  };

  const categories =
    Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories
      : DEFAULT_KPI_CATEGORIES;

  const security = {
    pinEnabled: Boolean(raw.security?.pinEnabled && raw.security?.pinCode),
    pinCode: raw.security?.pinCode || '',
  };

  let fiscalYears: FiscalYearWorkspace[] = [];
  let activeFiscalYearId = raw.activeFiscalYearId || '';

  if (Array.isArray(raw.fiscalYears) && raw.fiscalYears.length > 0) {
    fiscalYears = raw.fiscalYears.map((fy) => ({
      ...fy,
      workingDaysPerMonth: fy.workingDaysPerMonth || 26,
      elapsedWorkingDaysInMonth:
        fy.elapsedWorkingDaysInMonth !== undefined ? fy.elapsedWorkingDaysInMonth : 20,
      kpis: Array.isArray(fy.kpis) ? fy.kpis : [],
      actualLogs: Array.isArray(fy.actualLogs) ? fy.actualLogs : [],
    }));
  } else {
    // Migrate v1 single-year payload seamlessly and attach 2018 archive for YoY comparison
    const migratedCurrent: FiscalYearWorkspace = {
      id: 'fy-migrated-current',
      fiscalYearLabel: profile.fiscalYearLabel || '2019 ዓ.ም (2026/27 FY)',
      calendarType: profile.calendarType || 'july_june',
      activeMonthIndex: profile.activeMonthIndex ?? 3,
      workingDaysPerMonth: 26,
      elapsedWorkingDaysInMonth: 21,
      isArchived: false,
      kpis: Array.isArray(raw.kpis) ? raw.kpis : seed.kpis,
      actualLogs: Array.isArray(raw.actualLogs) ? raw.actualLogs : seed.actualLogs,
    };
    const priorArchive = buildPriorYearArchive();
    fiscalYears = [migratedCurrent, priorArchive];
    activeFiscalYearId = migratedCurrent.id;
  }

  if (!fiscalYears.some((f) => f.id === activeFiscalYearId)) {
    activeFiscalYearId = fiscalYears[0].id;
  }

  const activeFy = fiscalYears.find((f) => f.id === activeFiscalYearId) || fiscalYears[0];

  return {
    version: 2,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    profile: {
      ...profile,
      fiscalYearLabel: activeFy.fiscalYearLabel,
      calendarType: activeFy.calendarType,
      activeMonthIndex: activeFy.activeMonthIndex,
    },
    categories,
    security,
    activeFiscalYearId,
    fiscalYears,
    kpis: activeFy.kpis,
    actualLogs: activeFy.actualLogs,
  };
}

export function cloneFiscalYearWithGrowth(
  source: FiscalYearWorkspace,
  newLabel: string,
  growthPct: number
): FiscalYearWorkspace {
  const factor = 1 + growthPct / 100;
  const round2 = (n: number) => Math.max(0, Math.round(n * 100) / 100);

  const clonedKpis: KpiItem[] = source.kpis.map((k, idx) => {
    const shouldScale = k.direction === 'higher_better' && k.aggregation === 'sum';
    const scale = (val: number) => {
      if (!shouldScale) return val;
      return k.unit === 'COUNT' ? Math.max(0, Math.round(val * factor)) : round2(val * factor);
    };

    const nextQuarters: Record<QuarterKey, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    for (const q of QUARTERS) {
      nextQuarters[q] = scale(k.quarterlyTargets[q] || 0);
    }

    return {
      ...k,
      id: `kpi-${Date.now()}-${idx}`,
      branchAnnualTarget: scale(k.branchAnnualTarget),
      personalAnnualTarget: scale(k.personalAnnualTarget),
      quarterlyTargets: nextQuarters,
      monthlyTargets: k.monthlyTargets.map((m) => scale(m)),
    };
  });

  return {
    id: `fy-${Date.now()}`,
    fiscalYearLabel: newLabel.trim(),
    calendarType: source.calendarType,
    activeMonthIndex: 0,
    workingDaysPerMonth: source.workingDaysPerMonth || 26,
    elapsedWorkingDaysInMonth: 1,
    isArchived: false,
    kpis: clonedKpis,
    actualLogs: [],
  };
}

export function createEmptyData(existing?: AppDatabasePayload): AppDatabasePayload {
  const seed = createSeedData();
  const baseProfile = existing?.profile || seed.profile;
  const emptyFy: FiscalYearWorkspace = {
    id: `fy-${Date.now()}`,
    fiscalYearLabel: baseProfile.fiscalYearLabel,
    calendarType: baseProfile.calendarType,
    activeMonthIndex: baseProfile.activeMonthIndex,
    workingDaysPerMonth: 26,
    elapsedWorkingDaysInMonth: 1,
    isArchived: false,
    kpis: [],
    actualLogs: [],
  };
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    profile: baseProfile,
    categories: existing?.categories || DEFAULT_KPI_CATEGORIES,
    security: existing?.security || { pinEnabled: false, pinCode: '' },
    activeFiscalYearId: emptyFy.id,
    fiscalYears: [emptyFy],
    kpis: [],
    actualLogs: [],
  };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAppDatabase(): Promise<AppDatabasePayload> {
  try {
    const db = await openDatabase();
    const record = await new Promise<Partial<AppDatabasePayload> | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result as Partial<AppDatabasePayload> | undefined);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (record && record.profile) {
      const normalized = normalizeDatabasePayload(record);
      if (!record.version || record.version < 2) {
        await saveAppDatabase(normalized);
      }
      return normalized;
    }
  } catch {
    try {
      const raw = window.localStorage.getItem(LS_FALLBACK_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppDatabasePayload>;
        if (parsed && parsed.profile) {
          return normalizeDatabasePayload(parsed);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  const initial = createSeedData();
  await saveAppDatabase(initial);
  return initial;
}

export async function saveAppDatabase(payload: AppDatabasePayload): Promise<void> {
  const activeFy =
    payload.fiscalYears.find((f) => f.id === payload.activeFiscalYearId) ||
    payload.fiscalYears[0];

  const nextPayload: AppDatabasePayload = {
    ...payload,
    version: 2,
    updatedAt: new Date().toISOString(),
    kpis: activeFy ? activeFy.kpis : payload.kpis,
    actualLogs: activeFy ? activeFy.actualLogs : payload.actualLogs,
  };

  try {
    window.localStorage.setItem(LS_FALLBACK_KEY, JSON.stringify(nextPayload));
  } catch {
    // Ignore storage quota errors on fallback
  }

  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(nextPayload, RECORD_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Already persisted in localStorage fallback
  }
}

export function exportDatabaseAsJson(payload: AppDatabasePayload): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const datePart = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `biqat-kpi-backup-${datePart}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportReportAsCsv(headers: string[], rows: (string | number)[][], filename: string): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
