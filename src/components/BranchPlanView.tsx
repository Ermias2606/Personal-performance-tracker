import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Edit3,
  FolderPlus,
  Layers,
  Plus,
  RefreshCw,
  Scale,
  Trash2,
  X,
} from 'lucide-react';
import {
  ActiveTab,
  AggregationMode,
  EmployeeProfile,
  FiscalYearWorkspace,
  KpiCategory,
  KpiCategoryDef,
  KpiDirection,
  KpiItem,
  KpiUnit,
} from '../types/kpi';
import { formatKpiValue, getCategoryLabel, getUnitLabel } from '../utils/i18n';
import {
  cascadeAnnualToQuartersAndMonths,
  getKpiPlanSyncDiagnostic,
} from '../utils/planCascade';

interface BranchPlanViewProps {
  profile: EmployeeProfile;
  activeFy?: FiscalYearWorkspace;
  priorFy?: FiscalYearWorkspace | null;
  kpis: KpiItem[];
  categories: KpiCategoryDef[];
  onSaveKpi: (kpi: KpiItem) => void;
  onUpdateKpis: (kpis: KpiItem[]) => void;
  onDeleteKpi: (kpiId: string) => void;
  onSaveCategory: (cat: KpiCategoryDef) => void;
  onDeleteCategory: (catId: string, fallbackCatId: string) => void;
  onNavigateTab: (tab: ActiveTab, focusKpiId?: string) => void;
}

interface KpiFormDraft {
  id?: string;
  code: string;
  name: string;
  category: KpiCategory;
  unit: KpiUnit;
  weight: string;
  direction: KpiDirection;
  aggregation: AggregationMode;
  branchAnnualTarget: string;
  personalSharePct: string;
  personalAnnualTarget: string;
  autoCascadePersonal: boolean;
  notes: string;
}

const KPI_QUICK_TEMPLATES: {
  labelAm: string;
  labelEn: string;
  name: string;
  category: string;
  unit: KpiUnit;
  direction: KpiDirection;
  aggregation: AggregationMode;
  weight: number;
}[] = [
  {
    labelAm: 'ብድር አሰባሰብ (Loan Collection)',
    labelEn: 'Loan Collection',
    name: 'የብድር አሰባሰብ (Loan & Advance Collection)',
    category: 'financial',
    unit: 'ETB',
    direction: 'higher_better',
    aggregation: 'sum',
    weight: 15,
  },
  {
    labelAm: 'ኤጀንት ባንኪንግ (Agent Banking)',
    labelEn: 'Agent Banking',
    name: 'ኤጀንት ባንኪንግ ማስፋፋት (Active Banking Agents)',
    category: 'digital',
    unit: 'COUNT',
    direction: 'higher_better',
    aggregation: 'sum',
    weight: 10,
  },
  {
    labelAm: 'የደንበኛ እርካታ (CSAT Score)',
    labelEn: 'CSAT Score',
    name: 'የደንበኞች አገልግሎት እርካታ (Customer Satisfaction Score)',
    category: 'quality',
    unit: 'PERCENT',
    direction: 'higher_better',
    aggregation: 'average',
    weight: 10,
  },
  {
    labelAm: 'NPL ቅነሳ (NPL Ratio)',
    labelEn: 'NPL Ratio',
    name: 'የተበላሸ ብድር ምጣኔ ቁጥጥር (NPL Ratio)',
    category: 'quality',
    unit: 'PERCENT',
    direction: 'lower_better',
    aggregation: 'average',
    weight: 10,
  },
];

export const BranchPlanView: React.FC<BranchPlanViewProps> = ({
  profile,
  activeFy,
  priorFy,
  kpis,
  categories,
  onSaveKpi,
  onUpdateKpis,
  onDeleteKpi,
  onSaveCategory,
  onDeleteCategory,
  onNavigateTab,
}) => {
  const lang = profile.language;
  const [editingDraft, setEditingDraft] = useState<KpiFormDraft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');

  // Category Manager Drawer / Panel State
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [catDraft, setCatDraft] = useState<{
    id?: string;
    nameAm: string;
    nameEn: string;
    description: string;
  }>({ nameAm: '', nameEn: '', description: '' });
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  // Inline Quick Category Creation inside KPI Modal
  const [inlineNewCatOpen, setInlineNewCatOpen] = useState(false);
  const [inlineCatNameAm, setInlineCatNameAm] = useState('');
  const [inlineCatNameEn, setInlineCatNameEn] = useState('');

  const totalWeight = kpis.reduce((sum, k) => sum + k.weight, 0);
  const isWeightBalanced = Math.abs(totalWeight - 100) < 0.01;

  const filteredKpis = useMemo(() => {
    if (selectedCatFilter === 'all') return kpis;
    return kpis.filter((k) => k.category === selectedCatFilter);
  }, [kpis, selectedCatFilter]);

  const openCreateModal = (preselectedCatId?: string) => {
    const nextNum = kpis.length + 1;
    const defaultWeight = Math.max(5, Math.round((100 - totalWeight) * 10) / 10);
    setInlineNewCatOpen(false);
    setEditingDraft({
      code: `KPI-${String(nextNum).padStart(2, '0')}`,
      name: '',
      category:
        preselectedCatId && preselectedCatId !== 'all'
          ? preselectedCatId
          : categories[0]?.id || 'financial',
      unit: 'ETB',
      weight: String(defaultWeight > 0 ? defaultWeight : 10),
      direction: 'higher_better',
      aggregation: 'sum',
      branchAnnualTarget: '',
      personalSharePct: '10',
      personalAnnualTarget: '',
      autoCascadePersonal: true,
      notes: '',
    });
  };

  const openEditModal = (kpi: KpiItem) => {
    const share =
      kpi.branchAnnualTarget > 0
        ? Math.round((kpi.personalAnnualTarget / kpi.branchAnnualTarget) * 10000) / 100
        : 0;
    const diag = getKpiPlanSyncDiagnostic(kpi);
    setInlineNewCatOpen(false);
    setEditingDraft({
      id: kpi.id,
      code: kpi.code,
      name: kpi.name,
      category: kpi.category,
      unit: kpi.unit,
      weight: String(kpi.weight),
      direction: kpi.direction,
      aggregation: kpi.aggregation,
      branchAnnualTarget: String(kpi.branchAnnualTarget),
      personalSharePct: String(share),
      personalAnnualTarget: String(kpi.personalAnnualTarget),
      autoCascadePersonal: diag.hasMonthDrift || diag.hasQuarterDrift || diag.isUnplanned,
      notes: kpi.notes || '',
    });
  };

  const applyQuickTemplate = (tpl: (typeof KPI_QUICK_TEMPLATES)[number]) => {
    if (!editingDraft) return;
    const targetCat = categories.some((c) => c.id === tpl.category)
      ? tpl.category
      : categories[0]?.id || 'financial';
    setEditingDraft({
      ...editingDraft,
      name: tpl.name,
      category: targetCat,
      unit: tpl.unit,
      direction: tpl.direction,
      aggregation: tpl.aggregation,
      weight: String(tpl.weight),
    });
  };

  const handleUnitChange = (unit: KpiUnit) => {
    if (!editingDraft) return;
    const isRate = unit === 'PERCENT' || unit === 'SCORE';
    setEditingDraft({
      ...editingDraft,
      unit,
      aggregation: isRate ? 'average' : 'sum',
    });
  };

  const handleBranchTargetInputChange = (valStr: string) => {
    if (!editingDraft) return;
    const bVal = Number(valStr) || 0;
    const isRate = editingDraft.aggregation === 'average';
    if (isRate) {
      setEditingDraft({
        ...editingDraft,
        branchAnnualTarget: valStr,
        personalAnnualTarget: editingDraft.personalAnnualTarget || valStr,
      });
      return;
    }
    const pct = Number(editingDraft.personalSharePct) || 0;
    if (pct > 0 && bVal > 0) {
      const pVal =
        editingDraft.unit === 'COUNT'
          ? Math.round((bVal * pct) / 100)
          : Math.round(((bVal * pct) / 100) * 100) / 100;
      setEditingDraft({
        ...editingDraft,
        branchAnnualTarget: valStr,
        personalAnnualTarget: String(pVal),
      });
    } else {
      setEditingDraft({ ...editingDraft, branchAnnualTarget: valStr });
    }
  };

  const handleSharePctInputChange = (pctStr: string) => {
    if (!editingDraft) return;
    const bVal = Number(editingDraft.branchAnnualTarget) || 0;
    const pct = Number(pctStr) || 0;
    const pVal =
      editingDraft.unit === 'COUNT'
        ? Math.round((bVal * pct) / 100)
        : Math.round(((bVal * pct) / 100) * 100) / 100;
    setEditingDraft({
      ...editingDraft,
      personalSharePct: pctStr,
      personalAnnualTarget: bVal > 0 ? String(pVal) : editingDraft.personalAnnualTarget,
      autoCascadePersonal: true,
    });
  };

  const handlePersonalTargetInputChange = (pStr: string) => {
    if (!editingDraft) return;
    const bVal = Number(editingDraft.branchAnnualTarget) || 0;
    const pVal = Number(pStr) || 0;
    const pct = bVal > 0 ? Math.round((pVal / bVal) * 10000) / 100 : 0;
    setEditingDraft({
      ...editingDraft,
      personalAnnualTarget: pStr,
      personalSharePct: bVal > 0 ? String(pct) : editingDraft.personalSharePct,
      autoCascadePersonal: true,
    });
  };

  const handleCreateInlineCategory = () => {
    const am = inlineCatNameAm.trim();
    const en = inlineCatNameEn.trim();
    if (!am && !en) return;
    const newId = `cat-${Date.now()}`;
    const newCat: KpiCategoryDef = {
      id: newId,
      nameAm: am || en,
      nameEn: en || am,
      isSystem: false,
    };
    onSaveCategory(newCat);
    if (editingDraft) {
      setEditingDraft({ ...editingDraft, category: newId });
    }
    setInlineCatNameAm('');
    setInlineCatNameEn('');
    setInlineNewCatOpen(false);
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    const am = catDraft.nameAm.trim();
    const en = catDraft.nameEn.trim();
    if (!am && !en) return;

    const existing = catDraft.id ? categories.find((c) => c.id === catDraft.id) : undefined;
    onSaveCategory({
      id: existing?.id || `cat-${Date.now()}`,
      nameAm: am || en,
      nameEn: en || am,
      description: catDraft.description.trim(),
      isSystem: existing?.isSystem ?? false,
    });
    setCatDraft({ nameAm: '', nameEn: '', description: '' });
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDraft || !editingDraft.name.trim()) return;

    const branchTarget = Math.max(0, Number(editingDraft.branchAnnualTarget) || 0);
    const personalTarget = Math.max(0, Number(editingDraft.personalAnnualTarget) || 0);
    const weight = Math.max(0, Math.min(100, Number(editingDraft.weight) || 0));

    const existing = editingDraft.id ? kpis.find((k) => k.id === editingDraft.id) : undefined;

    const baseKpi: KpiItem = {
      id: existing?.id || `kpi-${Date.now()}`,
      code: editingDraft.code.trim() || 'KPI',
      name: editingDraft.name.trim(),
      category: editingDraft.category,
      unit: editingDraft.unit,
      weight,
      direction: editingDraft.direction,
      aggregation: editingDraft.aggregation,
      branchAnnualTarget: branchTarget,
      personalAnnualTarget: personalTarget,
      quarterlyTargets: existing?.quarterlyTargets || { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
      monthlyTargets: existing?.monthlyTargets || Array(12).fill(0),
      pinnedMonths: existing?.pinnedMonths || [],
      distributionStrategy: existing?.distributionStrategy || 'equal',
      notes: editingDraft.notes.trim(),
    };

    const nextKpi =
      !existing ||
      editingDraft.autoCascadePersonal ||
      existing.personalAnnualTarget !== personalTarget
        ? cascadeAnnualToQuartersAndMonths(
            baseKpi,
            personalTarget,
            baseKpi.distributionStrategy || 'equal',
            activeFy,
            priorFy
          )
        : baseKpi;

    onSaveKpi(nextKpi);
    setEditingDraft(null);
  };

  const handleNormalizeWeights = () => {
    if (kpis.length === 0 || totalWeight <= 0) return;
    const normalized = kpis.map((k, idx) => {
      if (idx === kpis.length - 1) {
        const prevSum = kpis
          .slice(0, -1)
          .reduce((s, item) => s + Math.round((item.weight / totalWeight) * 1000) / 10, 0);
        return { ...k, weight: Math.max(0, Math.round((100 - prevSum) * 10) / 10) };
      }
      return { ...k, weight: Math.round((k.weight / totalWeight) * 1000) / 10 };
    });
    onUpdateKpis(normalized);
  };

  const handleInlineBranchTargetChange = (kpiId: string, rawVal: string) => {
    const val = Math.max(0, Number(rawVal) || 0);
    onUpdateKpis(kpis.map((k) => (k.id === kpiId ? { ...k, branchAnnualTarget: val } : k)));
  };

  return (
    <div className="space-y-6">
      {/* Header & Primary Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {lang === 'am'
              ? '1. የKPI ዘርፎች እና የቅርንጫፍ ዓመታዊ እቅድ'
              : '1. KPI Categories & Branch Annual Plan'}
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {lang === 'am'
              ? `የKPI ዘርፎችን (Categories) ይፍጠሩ፣ ለ${profile.branchName} የተሰጠውን ዓመታዊ እቅድ ያስገቡ እና የግል ድርሻዎን ያውጡ።`
              : `Create custom KPI categories, define annual targets & weights for ${profile.branchName}, and assign your personal share.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCategoryManager((prev) => !prev)}
            className={`inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
              showCategoryManager
                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>
              {lang === 'am'
                ? `የKPI ዘርፎች (${categories.length})`
                : `Manage Categories (${categories.length})`}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('personal')}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>{lang === 'am' ? 'ወደ የግል እቅድ ቀጥል' : 'Next: My Plan'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => openCreateModal(selectedCatFilter)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{lang === 'am' ? 'አዲስ KPI ፍጠር' : 'Create New KPI'}</span>
          </button>
        </div>
      </div>

      {/* Expandable KPI Category Creation & Management Workspace */}
      {showCategoryManager && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {lang === 'am'
                  ? 'የKPI ዘርፎች መፍጠሪያ እና ማስተካከያ (KPI Category Management)'
                  : 'Create & Manage KPI Categories'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'am'
                  ? 'እንደ ብድር፣ ኢንተርናሽናል ባንኪንግ፣ ኤጀንት ባንኪንግ ወይም የደንበኛ አገልግሎት ያሉ የራስዎን ዘርፎች ይፍጠሩ።'
                  : 'Add custom categories tailored to your specific job description and branch scorecard.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCategoryManager(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveCategoryForm} className="grid grid-cols-1 gap-3 sm:grid-cols-12 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የዘርፍ ስም በአማርኛ' : 'Category Name (Amharic)'}
              </label>
              <input
                type="text"
                placeholder="ምሳሌ፦ ብድር እና ማገገሚያ"
                value={catDraft.nameAm}
                onChange={(e) => setCatDraft({ ...catDraft, nameAm: e.target.value })}
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {lang === 'am' ? 'የዘርፍ ስም በእንግሊዝኛ' : 'Category Name (English)'}
              </label>
              <input
                type="text"
                placeholder="e.g., Credit & Recovery"
                value={catDraft.nameEn}
                onChange={(e) => setCatDraft({ ...catDraft, nameEn: e.target.value })}
                className="mt-1 w-full min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-2">
              <button
                type="submit"
                className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                <span>
                  {catDraft.id
                    ? lang === 'am'
                      ? 'ዘርፉን አዘምን'
                      : 'Update Category'
                    : lang === 'am'
                      ? 'አዲስ ዘርፍ ጨምር'
                      : 'Add Category'}
                </span>
              </button>
              {catDraft.id && (
                <button
                  type="button"
                  onClick={() => setCatDraft({ nameAm: '', nameEn: '', description: '' })}
                  className="min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  {lang === 'am' ? 'ተው' : 'Cancel'}
                </button>
              )}
            </div>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-100 dark:border-slate-800 pt-2">
            {categories.map((cat) => {
              const count = kpis.filter((k) => k.category === cat.id).length;
              const weightSum = kpis
                .filter((k) => k.category === cat.id)
                .reduce((s, k) => s + k.weight, 0);

              return (
                <div
                  key={cat.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {cat.nameAm}
                    </span>
                    {cat.nameEn && cat.nameEn !== cat.nameAm && (
                      <span className="text-slate-500 dark:text-slate-400"> · {cat.nameEn}</span>
                    )}
                    <span className="ml-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      ({count} KPIs · {weightSum}% wt)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCreateModal(cat.id)}
                      className="rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:border-blue-600 cursor-pointer"
                    >
                      + KPI
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCatDraft({
                          id: cat.id,
                          nameAm: cat.nameAm,
                          nameEn: cat.nameEn,
                          description: cat.description || '',
                        })
                      }
                      className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      {lang === 'am' ? 'አስተካክል' : 'Edit'}
                    </button>
                    {categories.length > 1 && (
                      confirmDeleteCatId === cat.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const fallback =
                                categories.find((c) => c.id !== cat.id)?.id || 'financial';
                              onDeleteCategory(cat.id, fallback);
                              setConfirmDeleteCatId(null);
                            }}
                            className="rounded bg-red-600 px-2 py-1 text-[11px] font-semibold text-white cursor-pointer"
                          >
                            {lang === 'am' ? 'አጥፋ' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCatId(null)}
                            className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            {lang === 'am' ? 'ተው' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteCatId(cat.id)}
                          className="rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          {lang === 'am' ? 'ሰርዝ' : 'Delete'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weight Balance Status Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Scale className="h-5 w-5 shrink-0 text-slate-700 dark:text-slate-300" />
          <div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">
              {lang === 'am' ? 'ጠቅላላ የKPI ክብደት ድምር፦ ' : 'Total KPI Weight Allocation: '}
              <span
                className={`font-mono text-sm font-bold tabular-nums ${
                  isWeightBalanced
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {totalWeight.toFixed(1)}% / 100%
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isWeightBalanced
                ? lang === 'am'
                  ? 'ሁሉም የKPI ክብደቶች በትክክል 100% ላይ ተመጣጥነዋል።'
                  : 'KPI weights sum cleanly to 100% for appraisal scoring.'
                : lang === 'am'
                  ? 'ለትክክለኛ የምዘና ውጤት የKPI ክብደቶች ድምር 100% እንዲሆን ይመከራል።'
                  : 'Adjust individual KPI weights or normalize automatically so the total equals 100%.'}
            </p>
          </div>
        </div>

        {!isWeightBalanced && kpis.length > 0 && (
          <button
            type="button"
            onClick={handleNormalizeWeights}
            className="min-h-[38px] rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 px-3.5 py-1.5 text-xs font-semibold text-amber-900 dark:text-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {lang === 'am' ? 'ወደ 100% አመጣጥን' : 'Normalize to 100%'}
          </button>
        )}
      </div>

      {/* Category Filter Segmented Control */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedCatFilter('all')}
          className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            selectedCatFilter === 'all'
              ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          {lang === 'am' ? `ሁሉም ዘርፎች (${kpis.length})` : `All Categories (${kpis.length})`}
        </button>
        {categories.map((cat) => {
          const count = kpis.filter((k) => k.category === cat.id).length;
          const active = selectedCatFilter === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatFilter(cat.id)}
              className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                active
                  ? 'border-slate-900 dark:border-blue-500 bg-slate-900 dark:bg-blue-600 text-white'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {lang === 'am' ? cat.nameAm || cat.nameEn : cat.nameEn || cat.nameAm} ({count})
            </button>
          );
        })}
      </div>

      {/* Branch Plan KPI Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {filteredKpis.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {lang === 'am' ? 'በዚህ ዘርፍ የተመዘገበ KPI የለም' : 'No KPIs in This Category Yet'}
            </p>
            <button
              type="button"
              onClick={() => openCreateModal(selectedCatFilter)}
              className="mt-4 inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{lang === 'am' ? 'አዲስ KPI ፍጠር' : 'Create KPI Here'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 pl-5 pr-3">{lang === 'am' ? 'መለያ እና የKPI ስም' : 'Code & KPI Name'}</th>
                  <th className="px-3 py-3">{lang === 'am' ? 'ዘርፍ እና መለኪያ' : 'Category & Unit'}</th>
                  <th className="px-3 py-3 text-right">{lang === 'am' ? 'ክብደት %' : 'Weight %'}</th>
                  <th className="px-3 py-3 text-right">
                    {lang === 'am' ? 'የቅርንጫፍ ዓመታዊ እቅድ' : 'Branch Annual Target'}
                  </th>
                  <th className="px-3 py-3 text-right">{lang === 'am' ? 'የእኔ ዓመታዊ እቅድ' : 'My Annual Plan'}</th>
                  <th className="px-3 py-3 text-right">{lang === 'am' ? 'የእኔ ድርሻ %' : 'My Share %'}</th>
                  <th className="py-3 pl-3 pr-5 text-right">{lang === 'am' ? 'ድርጊት' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredKpis.map((kpi) => {
                  const sharePct =
                    kpi.branchAnnualTarget > 0
                      ? (kpi.personalAnnualTarget / kpi.branchAnnualTarget) * 100
                      : 0;
                  return (
                    <tr
                      key={kpi.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 pl-5 pr-3 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {kpi.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          <span className="font-mono">{kpi.code}</span>
                          {kpi.notes && (
                            <>
                              <span className="mx-1.5" aria-hidden="true">·</span>
                              <span>{kpi.notes}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <span>{getCategoryLabel(kpi.category, lang, categories)}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{getUnitLabel(kpi.unit, lang)}</span>
                      </td>
                      <td className="px-3 py-4 text-right font-mono font-semibold tabular-nums text-slate-900 dark:text-white whitespace-nowrap">
                        {kpi.weight}%
                      </td>
                      <td className="px-3 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            aria-label={`${kpi.name} Branch Annual Target`}
                            value={kpi.branchAnnualTarget}
                            onChange={(e) => handleInlineBranchTargetChange(kpi.id, e.target.value)}
                            className="w-36 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-right font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                          />
                          <span className="w-10 text-left text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {kpi.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right whitespace-nowrap">
                        <div className="font-mono font-semibold tabular-nums text-slate-900 dark:text-white">
                          {formatKpiValue(kpi.personalAnnualTarget, kpi.unit)}
                        </div>
                        {(() => {
                          const diag = getKpiPlanSyncDiagnostic(kpi);
                          if (
                            kpi.personalAnnualTarget > 0 &&
                            (diag.hasMonthDrift || diag.hasQuarterDrift)
                          ) {
                            return (
                              <button
                                type="button"
                                onClick={() =>
                                  onSaveKpi(
                                    cascadeAnnualToQuartersAndMonths(
                                      kpi,
                                      kpi.personalAnnualTarget,
                                      kpi.distributionStrategy || 'equal',
                                      activeFy,
                                      priorFy
                                    )
                                  )
                                }
                                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                              >
                                <RefreshCw className="h-3 w-3" />
                                <span>
                                  {lang === 'am' ? '12 ወር አመሳስል' : 'Sync 12M'}
                                </span>
                              </button>
                            );
                          }
                          if (diag.isFullySynced) {
                            return (
                              <div className="mt-0.5 text-[11px] text-emerald-700 dark:text-emerald-400">
                                {lang === 'am' ? '12 ወር የተመሳሰለ' : '12M Synced'}
                              </div>
                            );
                          }
                          return (
                            <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                              {lang === 'am' ? 'እቅድ አልተሰጠም' : 'Unassigned'}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 py-4 text-right font-mono tabular-nums text-blue-700 dark:text-blue-400 font-semibold whitespace-nowrap">
                        {kpi.direction === 'lower_better' || kpi.aggregation === 'average'
                          ? lang === 'am'
                            ? 'ተመሳሳይ ምጣኔ'
                            : 'Benchmark'
                          : `${sharePct.toFixed(1)}%`}
                      </td>
                      <td className="py-4 pl-3 pr-5 text-right whitespace-nowrap">
                        {confirmDeleteId === kpi.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteKpi(kpi.id);
                                setConfirmDeleteId(null);
                              }}
                              className="rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-700 cursor-pointer"
                            >
                              {lang === 'am' ? 'አጥፋ' : 'Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 cursor-pointer"
                            >
                              {lang === 'am' ? 'ተው' : 'Cancel'}
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onNavigateTab('personal', kpi.id)}
                              className="min-h-[34px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:border-blue-600 transition-colors cursor-pointer"
                            >
                              {lang === 'am' ? 'የግል ድርሻ' : 'My Plan'}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(kpi)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                              aria-label="Edit KPI"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(kpi.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 cursor-pointer"
                              aria-label="Delete KPI"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
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

      {/* Create / Edit KPI Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingDraft.id
                  ? lang === 'am'
                    ? 'የKPI መለኪያ እና የቅርንጫፍ እቅድ አስተካክል'
                    : 'Edit Branch & Personal KPI'
                  : lang === 'am'
                    ? 'አዲስ የKPI መለኪያ ፍጠር (Create KPI)'
                    : 'Create New KPI Indicator'}
              </h2>
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick KPI Templates when creating new */}
            {!editingDraft.id && (
              <div className="mt-4 border-b border-slate-100 dark:border-slate-800 pb-3.5">
                <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  {lang === 'am'
                    ? 'ፈጣን የKPI ቅوالቦች (Quick Templates — አማራጭ)፦'
                    : 'Quick KPI Presets (Optional):'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {KPI_QUICK_TEMPLATES.map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyQuickTemplate(tpl)}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 cursor-pointer"
                    >
                      + {lang === 'am' ? tpl.labelAm : tpl.labelEn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSaveSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'መለያ ኮድ' : 'KPI Code'}
                  </label>
                  <input
                    type="text"
                    required
                    value={editingDraft.code}
                    onChange={(e) => setEditingDraft({ ...editingDraft, code: e.target.value })}
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የKPI ስም (መለኪያ)' : 'KPI Indicator Name'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      lang === 'am'
                        ? 'ምሳሌ፦ ተቀማጭ ገንዘብ ማሰባሰብ (Deposit Mobilization)'
                        : 'e.g., Net Deposit Mobilization'
                    }
                    value={editingDraft.name}
                    onChange={(e) => setEditingDraft({ ...editingDraft, name: e.target.value })}
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category Selection + Inline Category Creator */}
              <div className="space-y-2">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {lang === 'am' ? 'የKPI ዘርፍ (Category)' : 'KPI Category'}
                      </label>
                      <button
                        type="button"
                        onClick={() => setInlineNewCatOpen((v) => !v)}
                        className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {inlineNewCatOpen
                          ? lang === 'am'
                            ? 'ዝጋ'
                            : 'Close'
                          : lang === 'am'
                            ? '+ አዲስ ዘርፍ'
                            : '+ New'}
                      </button>
                    </div>
                    <select
                      value={editingDraft.category}
                      onChange={(e) =>
                        setEditingDraft({ ...editingDraft, category: e.target.value })
                      }
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {lang === 'am' ? c.nameAm || c.nameEn : c.nameEn || c.nameAm}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {lang === 'am' ? 'መለኪያ አሃድ (Unit)' : 'Unit of Measure'}
                    </label>
                    <select
                      value={editingDraft.unit}
                      onChange={(e) => handleUnitChange(e.target.value as KpiUnit)}
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                    >
                      <option value="ETB">{getUnitLabel('ETB', lang)}</option>
                      <option value="USD">{getUnitLabel('USD', lang)}</option>
                      <option value="COUNT">{getUnitLabel('COUNT', lang)}</option>
                      <option value="PERCENT">{getUnitLabel('PERCENT', lang)}</option>
                      <option value="SCORE">{getUnitLabel('SCORE', lang)}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {lang === 'am' ? 'የምዘና ክብደት (%)' : 'KPI Weight (%)'}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={editingDraft.weight}
                      onChange={(e) => setEditingDraft({ ...editingDraft, weight: e.target.value })}
                      className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                {inlineNewCatOpen && (
                  <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/60 dark:bg-blue-950/40 p-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {lang === 'am' ? 'የአዲሱ ዘርፍ ስም (አማርኛ)' : 'New Category (Amharic)'}
                      </label>
                      <input
                        type="text"
                        placeholder="ምሳሌ፦ ኢንተርናሽናል ባንኪንግ"
                        value={inlineCatNameAm}
                        onChange={(e) => setInlineCatNameAm(e.target.value)}
                        className="mt-1 w-full min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {lang === 'am' ? 'የአዲሱ ዘርፍ ስም (English)' : 'New Category (English)'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Trade Finance"
                        value={inlineCatNameEn}
                        onChange={(e) => setInlineCatNameEn(e.target.value)}
                        className="mt-1 w-full min-h-[36px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateInlineCategory}
                      className="min-h-[36px] rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap cursor-pointer"
                    >
                      {lang === 'am' ? 'ፍጠር እና ምረጥ' : 'Add & Select'}
                    </button>
                  </div>
                )}
              </div>

              {/* Bidirectional Branch Plan -> Share % -> Personal Plan */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የቅርንጫፉ ዓመታዊ እቅድ' : 'Branch Annual Plan'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0"
                    value={editingDraft.branchAnnualTarget}
                    onChange={(e) => handleBranchTargetInputChange(e.target.value)}
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የእኔ ድርሻ በመቶኛ (%)' : 'My Share (%)'}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    disabled={editingDraft.aggregation === 'average'}
                    value={editingDraft.personalSharePct}
                    onChange={(e) => handleSharePctInputChange(e.target.value)}
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-blue-700 dark:text-blue-400 disabled:opacity-50 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የእኔ የተሰጠኝ ዓመታዊ እቅድ' : 'My Assigned Annual Plan'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="0"
                    value={editingDraft.personalAnnualTarget}
                    onChange={(e) => handlePersonalTargetInputChange(e.target.value)}
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs font-semibold tabular-nums text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የአፈጻጸም አቅጣጫ' : 'Target Direction'}
                  </label>
                  <select
                    value={editingDraft.direction}
                    onChange={(e) =>
                      setEditingDraft({ ...editingDraft, direction: e.target.value as KpiDirection })
                    }
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="higher_better">
                      {lang === 'am' ? 'ከፍተኛ ቁጥር የተሻለ (ተቀማጭ፣ ደንበኛ)' : 'Higher is Better (Volume/Growth)'}
                    </option>
                    <option value="lower_better">
                      {lang === 'am' ? 'ዝቅተኛ ቁጥር የተሻለ (NPL፣ የስህተት ምጣኔ)' : 'Lower is Better (NPL/Error Rate)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {lang === 'am' ? 'የወራት ድምር ስሌት' : 'Aggregation Method'}
                  </label>
                  <select
                    value={editingDraft.aggregation}
                    onChange={(e) =>
                      setEditingDraft({
                        ...editingDraft,
                        aggregation: e.target.value as AggregationMode,
                      })
                    }
                    className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                  >
                    <option value="sum">
                      {lang === 'am' ? 'ድምር (Cumulative Sum)' : 'Cumulative Sum'}
                    </option>
                    <option value="average">
                      {lang === 'am' ? 'አማካይ (Average Rate/Score)' : 'Period Average'}
                    </option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingDraft.autoCascadePersonal}
                  onChange={(e) =>
                    setEditingDraft({ ...editingDraft, autoCascadePersonal: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <span>
                  {lang === 'am'
                    ? 'የግል ዓመታዊ እቅዱን ለ4 ሩብ ዓመታት እና ለ12 ወራት በራስ-ሰር እኩል አካፍል'
                    : 'Automatically distribute personal annual plan across 4 quarters and 12 months'}
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {lang === 'am' ? 'ተጨማሪ ማስታወሻ (አማራጭ)' : 'Description / Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={editingDraft.notes}
                  onChange={(e) => setEditingDraft({ ...editingDraft, notes: e.target.value })}
                  className="mt-1 w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-blue-600 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingDraft(null)}
                  className="min-h-[42px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 cursor-pointer"
                >
                  {lang === 'am' ? 'ይቅር' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="min-h-[42px] rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 cursor-pointer"
                >
                  {lang === 'am' ? 'እቅዱን አስቀምጥ' : 'Save KPI Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
