import React, { useMemo, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  ActualLogEntry,
  EmployeeProfile,
  KpiItem,
  PeriodScope,
} from '../types/kpi';
import { computeCumulativeTrend } from '../utils/analytics';
import { formatKpiValue } from '../utils/i18n';

interface CumulativeTrendChartProps {
  profile: EmployeeProfile;
  kpis: KpiItem[];
  logs: ActualLogEntry[];
  scope: PeriodScope;
  scopeLabel: string;
}

export const CumulativeTrendChart: React.FC<CumulativeTrendChartProps> = ({
  profile,
  kpis,
  logs,
  scope,
  scopeLabel,
}) => {
  const lang = profile.language;
  const [selectedMetricId, setSelectedMetricId] = useState<'portfolio' | string>('portfolio');
  const [hoveredStepIdx, setHoveredStepIdx] = useState<number | null>(null);

  const series = useMemo(
    () => computeCumulativeTrend(kpis, logs, profile, scope, selectedMetricId),
    [kpis, logs, profile, scope, selectedMetricId]
  );

  const formatVal = (val: number, compact = false): string => {
    if (series.mode === 'portfolio') {
      return `${val.toFixed(1)}%`;
    }
    if (series.selectedKpi) {
      return formatKpiValue(val, series.selectedKpi.unit, compact);
    }
    return val.toFixed(1);
  };

  // SVG coordinate geometry
  const svgWidth = 760;
  const svgHeight = 248;
  const padLeft = 66;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 38;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const maxRawVal = useMemo(() => {
    let maxV = 0;
    for (const p of series.points) {
      maxV = Math.max(maxV, p.cumulativePlanned);
      if (p.cumulativeActual !== null) {
        maxV = Math.max(maxV, p.cumulativeActual);
      }
    }
    if (series.mode === 'portfolio') {
      return Math.max(100, Math.ceil(maxV / 10) * 10);
    }
    if (maxV <= 0) return 100;
    return maxV * 1.12;
  }, [series]);

  const yTicks = useMemo(() => {
    return [0, 0.25, 0.5, 0.75, 1].map((t) => maxRawVal * t);
  }, [maxRawVal]);

  const count = series.points.length;
  const getX = (idx: number) =>
    count <= 1 ? padLeft + plotW / 2 : padLeft + (idx / (count - 1)) * plotW;
  const getY = (val: number) =>
    padTop + plotH - (Math.max(0, Math.min(maxRawVal, val)) / (maxRawVal || 1)) * plotH;

  const plannedPolyline = series.points
    .map((p, idx) => `${getX(idx).toFixed(1)},${getY(p.cumulativePlanned).toFixed(1)}`)
    .join(' ');

  const actualPointsWithCoords = series.points
    .map((p, idx) =>
      p.cumulativeActual !== null
        ? {
            point: p,
            idx,
            x: getX(idx),
            y: getY(p.cumulativeActual),
          }
        : null
    )
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const actualPolyline = actualPointsWithCoords
    .map((item) => `${item.x.toFixed(1)},${item.y.toFixed(1)}`)
    .join(' ');

  const actualAreaPath =
    actualPointsWithCoords.length >= 2
      ? `M ${actualPointsWithCoords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} ` +
        actualPointsWithCoords
          .map((item) => `L ${item.x.toFixed(1)} ${item.y.toFixed(1)}`)
          .join(' ') +
        ` L ${actualPointsWithCoords[actualPointsWithCoords.length - 1].x.toFixed(1)} ${(
          padTop + plotH
        ).toFixed(1)} Z`
      : '';

  const inspectedPoint =
    hoveredStepIdx !== null && series.points[hoveredStepIdx]
      ? series.points[hoveredStepIdx]
      : [...series.points]
          .reverse()
          .find((p) => p.cumulativeActual !== null && (series.isAverageKpi || p.stepIndex > 0)) ||
        series.points[series.points.length - 1];

  const isAheadOrOnPace = series.latestPacePct >= 100 || series.latestVariance >= 0;

  const selectedMetricTitle =
    series.mode === 'portfolio'
      ? lang === 'am'
        ? 'አጠቃላይ ክብደት ያለው ድምር የKPI እድገት (%)'
        : 'Overall Weighted Cumulative KPI Progress (%)'
      : `${series.selectedKpi?.code} · ${series.selectedKpi?.name}`;

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 print:border-slate-200 pb-7 print-break-avoid">
      {/* Section Header & Metric Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white print:text-slate-900">
            {lang === 'am'
              ? '1. የተጠራቀመ የአፈጻጸም እድገት መስመር ቻርት (Cumulative Historical Trend)'
              : '1. Cumulative Performance Progress Trend'}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 print:text-slate-500">
            <span>{scopeLabel}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              {series.isAverageKpi
                ? lang === 'am'
                  ? 'የጊዜው አማካይ ምጣኔ ከእቅድ መስመር አንጻር'
                  : 'Running period average vs target benchmark'
                : lang === 'am'
                  ? 'የተጠራቀመ እቅድ (Planned) ከተጠራቀመ ክንውን (Actual) ጋር ሲነጻጸር'
                  : 'Cumulative planned trajectory vs cumulative actual achievement'}
            </span>
          </p>
        </div>

        {/* Interactive KPI Selector (Screen) + Print Label */}
        <div className="no-print">
          <select
            aria-label={lang === 'am' ? 'የቻርት መለኪያ ይምረጡ' : 'Select Chart Metric'}
            value={selectedMetricId}
            onChange={(e) => {
              setSelectedMetricId(e.target.value);
              setHoveredStepIdx(null);
            }}
            className="min-h-[38px] max-w-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden cursor-pointer"
          >
            <option value="portfolio">
              {lang === 'am'
                ? 'ሁሉም KPIs — ክብደት ያለው ድምር እድገት (%)'
                : 'All KPIs — Weighted Cumulative (%)'}
            </option>
            {kpis.map((k) => (
              <option key={k.id} value={k.id}>
                {k.code} — {k.name.split('(')[0].trim()} ({k.unit})
              </option>
            ))}
          </select>
        </div>
        <div className="hidden print:block text-xs font-semibold text-slate-700">
          {selectedMetricTitle}
        </div>
      </div>

      {/* Cumulative KPI Readout Strip (Unboxed clean metrics with hairline dividers) */}
      <div className="mt-4 grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-800 print:border-slate-100 py-3.5 sm:grid-cols-4">
        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
            {lang === 'am' ? 'እስካሁን የተጠራቀመ እቅድ' : 'Cumulative Plan (To Date)'}
          </div>
          <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-slate-800 dark:text-slate-100 print:text-slate-800">
            {formatVal(series.latestPlannedToDate, true)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
            {lang === 'am' ? 'እስካሁን የተጠራቀመ ክንውን' : 'Cumulative Actual (To Date)'}
          </div>
          <div className="mt-0.5 font-mono text-base font-bold tabular-nums text-blue-700 dark:text-blue-400 print:text-blue-700">
            {series.hasAnyActualData ? formatVal(series.latestActualToDate, true) : '—'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
            {lang === 'am' ? 'የተጠራቀመ ልዩነት (Gap)' : 'Cumulative Variance'}
          </div>
          <div
            className={`mt-0.5 font-mono text-base font-bold tabular-nums ${
              !series.hasAnyActualData
                ? 'text-slate-400 dark:text-slate-500'
                : isAheadOrOnPace
                  ? 'text-emerald-700 dark:text-emerald-400 print:text-emerald-700'
                  : 'text-red-700 dark:text-red-400 print:text-red-700'
            }`}
          >
            {series.hasAnyActualData
              ? `${series.latestVariance >= 0 ? '+' : '-'}${formatVal(
                  Math.abs(series.latestVariance),
                  true
                )}`
              : '—'}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 print:text-slate-500">
            {lang === 'am' ? 'የፍጥነት አፈጻጸም (Pace)' : 'Cumulative Pace Status'}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {series.hasAnyActualData ? (
              isAheadOrOnPace ? (
                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                  <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {series.latestPacePct.toFixed(1)}% ·{' '}
                    <span className="font-sans text-xs font-semibold">
                      {lang === 'am' ? 'በጥሩ ፍጥነት' : 'On Pace'}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-amber-700 dark:text-amber-400 print:text-amber-700">
                  <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {series.latestPacePct.toFixed(1)}% ·{' '}
                    <span className="font-sans text-xs font-semibold">
                      {lang === 'am' ? 'ከፍጥነት በታች' : 'Behind Pace'}
                    </span>
                  </span>
                </span>
              )
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {lang === 'am' ? 'ክንውን አልተመዘገበም' : 'No actuals logged'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SVG Line Chart */}
      <div className="mt-4">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 sm:h-64 overflow-visible select-none"
          role="img"
          aria-label="Cumulative Performance Progress Line Chart"
        >
          <defs>
            <linearGradient id="cumActualAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Y-Axis Gridlines & Labels */}
          {yTicks.map((tickVal, i) => {
            const y = getY(tickVal);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  className={
                    i === 0
                      ? 'stroke-slate-300 dark:stroke-slate-700 print:stroke-slate-300'
                      : 'stroke-slate-200 dark:stroke-slate-800 print:stroke-slate-200'
                  }
                  strokeWidth={1}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 print:fill-slate-500 text-[10px] font-mono"
                >
                  {series.mode === 'portfolio'
                    ? `${Math.round(tickVal)}%`
                    : formatVal(tickVal, true).replace(' ETB', '')}
                </text>
              </g>
            );
          })}

          {/* Shaded Cumulative Actual Area */}
          {actualAreaPath && <path d={actualAreaPath} fill="url(#cumActualAreaGrad)" />}

          {/* Cumulative Planned Trajectory (Dashed Line) */}
          {series.points.length >= 2 && (
            <polyline
              fill="none"
              className="stroke-slate-500 dark:stroke-slate-400 print:stroke-slate-500"
              strokeWidth={2}
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={plannedPolyline}
            />
          )}

          {/* Cumulative Actual Trajectory (Solid Primary Line) */}
          {actualPointsWithCoords.length >= 2 && (
            <polyline
              fill="none"
              className="stroke-blue-600 dark:stroke-blue-400 print:stroke-blue-600"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              points={actualPolyline}
            />
          )}

          {/* Hover Vertical Crosshair */}
          {hoveredStepIdx !== null && series.points[hoveredStepIdx] && (
            <line
              x1={getX(hoveredStepIdx)}
              y1={padTop}
              x2={getX(hoveredStepIdx)}
              y2={padTop + plotH}
              className="stroke-slate-400 dark:stroke-slate-600"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {/* Planned Vertex Markers */}
          {series.points.map((p, idx) => {
            const cx = getX(idx);
            const cy = getY(p.cumulativePlanned);
            return (
              <circle
                key={`plan-${idx}`}
                cx={cx}
                cy={cy}
                r={3}
                className="fill-white dark:fill-slate-900 print:fill-white stroke-slate-500 dark:stroke-slate-400 print:stroke-slate-500"
                strokeWidth={1.5}
              />
            );
          })}

          {/* Actual Vertex Markers */}
          {actualPointsWithCoords.map(({ idx, x, y }, pos) => {
            const isLatest = pos === actualPointsWithCoords.length - 1;
            const isHovered = hoveredStepIdx === idx;
            return (
              <circle
                key={`act-${idx}`}
                cx={x}
                cy={y}
                r={isHovered ? 5.5 : isLatest ? 4.5 : 3.5}
                className={
                  isLatest || isHovered
                    ? 'fill-blue-600 dark:fill-blue-400 print:fill-blue-600 stroke-blue-600 dark:stroke-blue-400 print:stroke-blue-600'
                    : 'fill-white dark:fill-slate-900 print:fill-white stroke-blue-600 dark:stroke-blue-400 print:stroke-blue-600'
                }
                strokeWidth={2}
              />
            );
          })}

          {/* X-Axis Labels & Interactive Hit Columns */}
          {series.points.map((p, idx) => {
            const cx = getX(idx);
            const colWidth = count > 1 ? plotW / (count - 1) : plotW;
            const isHovered = hoveredStepIdx === idx;
            return (
              <g
                key={`step-${idx}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredStepIdx(idx)}
                onMouseLeave={() => setHoveredStepIdx(null)}
                onClick={() => setHoveredStepIdx(idx)}
              >
                <rect
                  x={cx - colWidth / 2}
                  y={padTop}
                  width={colWidth}
                  height={plotH + 28}
                  fill="transparent"
                />
                <text
                  x={cx}
                  y={padTop + plotH + 20}
                  textAnchor="middle"
                  className={`text-[10px] ${
                    isHovered
                      ? 'fill-blue-700 dark:fill-blue-400 font-bold'
                      : 'fill-slate-500 dark:fill-slate-400 print:fill-slate-600 font-medium'
                  }`}
                >
                  {p.shortLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Live Step Readout */}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 dark:text-slate-300 print:text-slate-600">
        <div className="flex flex-wrap items-center gap-5">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0.5 w-5 bg-blue-600 dark:bg-blue-400 print:bg-blue-600" />
            <span className="font-medium text-slate-800 dark:text-slate-100 print:text-slate-800">
              {lang === 'am' ? 'የተጠራቀመ ክንውን (Cumulative Actual)' : 'Cumulative Actual'}
            </span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-500 dark:border-slate-400 print:border-slate-500" />
            <span className="text-slate-600 dark:text-slate-300 print:text-slate-600">
              {lang === 'am' ? 'የተጠራቀመ እቅድ (Cumulative Plan)' : 'Cumulative Planned Target'}
            </span>
          </span>
        </div>

        {inspectedPoint && (
          <div className="font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300 print:text-slate-600">
            <strong className="font-sans text-slate-900 dark:text-white print:text-slate-900">
              {inspectedPoint.fullLabel}:
            </strong>{' '}
            <span>
              {lang === 'am' ? 'እቅድ ' : 'Plan '}
              {formatVal(inspectedPoint.cumulativePlanned, true)}
            </span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>
              {lang === 'am' ? 'ክንውን ' : 'Actual '}
              <strong className="text-blue-700 dark:text-blue-400 print:text-blue-700">
                {inspectedPoint.cumulativeActual !== null
                  ? formatVal(inspectedPoint.cumulativeActual, true)
                  : '—'}
              </strong>
            </span>
            {inspectedPoint.paceAchievementPct !== null && inspectedPoint.stepIndex > 0 && (
              <>
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span>({inspectedPoint.paceAchievementPct.toFixed(1)}%)</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
