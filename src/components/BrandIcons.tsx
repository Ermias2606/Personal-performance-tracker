import React from 'react';
import { KpiCategory } from '../types/kpi';

interface IconProps {
  className?: string;
}

export const BiqatBrandMark: React.FC<IconProps> = ({ className = 'h-8 w-8' }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="48" height="48" rx="12" className="fill-slate-900 dark:fill-blue-600" />
    <rect
      x="2.5"
      y="2.5"
      width="43"
      height="43"
      rx="9.5"
      stroke="white"
      strokeOpacity="0.14"
      strokeWidth="1"
    />
    <rect x="10" y="28" width="6" height="10" rx="1.8" className="fill-slate-500 dark:fill-blue-300/70" />
    <rect x="19" y="21" width="6" height="17" rx="1.8" className="fill-blue-400 dark:fill-blue-200" />
    <rect x="28" y="14" width="6" height="24" rx="1.8" fill="#FFFFFF" />
    <path
      d="M11 21L19.5 14.5L26.5 17L37 9.5"
      stroke="#38BDF8"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M32 9.5H37V14.5"
      stroke="#38BDF8"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CascadeTreeIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <rect x="11" y="4" width="14" height="7" rx="2" className="fill-blue-600/15 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.75" />
    <path d="M18 11V16M9 16H27M9 16V20M18 16V20M27 16V20" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="4" y="20" width="9" height="6" rx="1.5" className="fill-slate-100 dark:fill-slate-800 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.6" />
    <rect x="13.5" y="20" width="9" height="6" rx="1.5" className="fill-blue-600/20 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.6" />
    <rect x="23" y="20" width="9" height="6" rx="1.5" className="fill-slate-100 dark:fill-slate-800 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.6" />
    <path d="M6 30H11M15.5 30H20.5M25 30H30" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ChronometerPaceIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <circle cx="18" cy="19.5" r="12" className="fill-emerald-500/10 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.75" />
    <path
      d="M18 7.5A12 12 0 0 1 29.4 15.8"
      className="stroke-emerald-600 dark:stroke-emerald-400"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path d="M14.5 4H21.5M18 4V7.5" className="stroke-slate-600 dark:stroke-slate-400" strokeWidth="1.75" strokeLinecap="round" />
    <path d="M18 19.5L23.5 14.5" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="18" cy="19.5" r="2.2" className="fill-slate-900 dark:fill-white" />
  </svg>
);

export const LedgerActualsIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="5" width="22" height="26" rx="3" className="fill-blue-500/10 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.75" />
    <path d="M10 12H22M10 17H19M10 22H16" className="stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.75" strokeLinecap="round" />
    <circle cx="25.5" cy="24.5" r="6.5" className="fill-blue-600 dark:fill-blue-500" />
    <path d="M22.8 24.6L24.7 26.5L28.5 22.7" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AppraisalSealIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <rect x="4" y="6" width="28" height="22" rx="3" className="fill-blue-600/10 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.75" />
    <path
      d="M9 22L15 16.5L20 19L27 11.5"
      className="stroke-blue-600 dark:stroke-blue-400"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M23 11.5H27V15.5" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 22L15 19.5L20 20.5L27 16" className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1.4" strokeDasharray="2.5 2.5" strokeLinecap="round" />
    <path d="M13 32H23M18 28V32" className="stroke-slate-600 dark:stroke-slate-400" strokeWidth="1.75" strokeLinecap="round" />
  </svg>
);

export const OfflineVaultShieldIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <path
      d="M18 4L29 8.5V17.2C29 24.4 24.3 29.8 18 32C11.7 29.8 7 24.4 7 17.2V8.5L18 4Z"
      className="fill-blue-600/12 stroke-slate-800 dark:stroke-slate-200"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <rect x="13.5" y="16" width="9" height="7.5" rx="1.8" className="fill-blue-600 dark:fill-blue-500" />
    <path
      d="M15.5 16V13.8C15.5 12.4 16.6 11.3 18 11.3C19.4 11.3 20.5 12.4 20.5 13.8V16"
      className="stroke-blue-600 dark:stroke-blue-400"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="18" cy="19.7" r="1.1" fill="#FFFFFF" />
  </svg>
);

export const YoYComparisonIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="9" width="18" height="20" rx="2.5" className="fill-slate-200/70 dark:fill-slate-800 stroke-slate-500 dark:stroke-slate-400" strokeWidth="1.6" />
    <rect x="13" y="5" width="18" height="21" rx="2.5" className="fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.75" />
    <path d="M17 19V14M22 19V11M27 19V9" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

export const InstallAppDeviceIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <rect x="5" y="6" width="22" height="16" rx="2.5" className="fill-slate-100 dark:fill-slate-800 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.7" />
    <rect x="20" y="13" width="11" height="18" rx="2.5" className="fill-white dark:fill-slate-900 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.8" />
    <path d="M25.5 17.5V24.5M25.5 24.5L23 22M25.5 24.5L28 22" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M11 26H17" className="stroke-slate-500" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const PipelineFunnelIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <path
      d="M5 8H31L22.5 18.5V27.5L13.5 30.5V18.5L5 8Z"
      className="fill-blue-600/12 stroke-slate-700 dark:stroke-slate-300"
      strokeWidth="1.75"
      strokeLinejoin="round"
    />
    <path
      d="M11 12.5H25"
      className="stroke-blue-600 dark:stroke-blue-400"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="27.5" cy="25.5" r="5" className="fill-emerald-600 dark:fill-emerald-500" />
    <path
      d="M25.3 25.5L26.8 27L29.8 24"
      stroke="#FFFFFF"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CalendarCheckInIcon: React.FC<IconProps> = ({ className = 'h-7 w-7' }) => (
  <svg viewBox="0 0 36 36" fill="none" className={className} aria-hidden="true">
    <rect
      x="5"
      y="7"
      width="26"
      height="24"
      rx="3"
      className="fill-blue-600/10 stroke-slate-700 dark:stroke-slate-300"
      strokeWidth="1.75"
    />
    <path
      d="M5 13.5H31M12 4.5V9M24 4.5V9"
      className="stroke-slate-700 dark:stroke-slate-300"
      strokeWidth="1.75"
      strokeLinecap="round"
    />
    <path
      d="M12.5 22L16.5 26L24 18"
      className="stroke-emerald-600 dark:stroke-emerald-400"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CategoryDuotoneIcon: React.FC<{ category: KpiCategory; className?: string }> = ({
  category,
  className = 'h-4 w-4',
}) => {
  switch (category) {
    case 'financial':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="3" y="13" width="4.5" height="7.5" rx="1" className="fill-blue-600/25 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" />
          <rect x="9.75" y="9" width="4.5" height="11.5" rx="1" className="fill-blue-600/35 stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.5" />
          <rect x="16.5" y="4.5" width="4.5" height="16" rx="1" className="fill-blue-600 stroke-blue-600 dark:fill-blue-400 dark:stroke-blue-400" strokeWidth="1.5" />
        </svg>
      );
    case 'customer':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="9.5" cy="8" r="3.5" className="fill-emerald-500/20 stroke-emerald-700 dark:stroke-emerald-400" strokeWidth="1.6" />
          <path d="M3.5 19.5C3.5 16.2 6.2 14 9.5 14C12.8 14 15.5 16.2 15.5 19.5" className="stroke-emerald-700 dark:stroke-emerald-400" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M18 8V13M15.5 10.5H20.5" className="stroke-emerald-600 dark:stroke-emerald-400" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'digital':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" className="fill-sky-500/15 stroke-sky-700 dark:stroke-sky-400" strokeWidth="1.6" />
          <rect x="9.5" y="6.5" width="5" height="5" rx="1" className="stroke-sky-700 dark:stroke-sky-400" strokeWidth="1.5" />
          <circle cx="12" cy="17.5" r="1" className="fill-sky-700 dark:fill-sky-400" />
        </svg>
      );
    case 'operations':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8.5" className="fill-amber-500/15 stroke-amber-700 dark:stroke-amber-400" strokeWidth="1.6" />
          <path d="M12 7.5V12L15.2 13.8" className="stroke-amber-700 dark:stroke-amber-400" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'quality':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3L19.5 6.2V11.8C19.5 16.5 16.4 19.9 12 21.3C7.6 19.9 4.5 16.5 4.5 11.8V6.2L12 3Z"
            className="fill-indigo-500/15 stroke-indigo-700 dark:stroke-indigo-400"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M9 12.2L11.1 14.3L15.2 9.8" className="stroke-indigo-700 dark:stroke-indigo-400" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M12 3L20 7.5L12 12L4 7.5L12 3Z" className="fill-blue-500/20 stroke-slate-700 dark:stroke-slate-300" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M4 12.5L12 17L20 12.5M4 16.8L12 21.3L20 16.8" className="stroke-blue-600 dark:stroke-blue-400" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
};
