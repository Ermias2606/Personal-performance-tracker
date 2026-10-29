import React, { useEffect } from 'react';
import { AppPageRoute, Language, ThemeMode } from '../types/kpi';

interface SEOHeadProps {
  currentPage: AppPageRoute;
  lang: Language;
  theme: ThemeMode;
  fiscalYearLabel: string;
}

const BASE_TITLE = 'Biqat KPI — Personal & Branch Performance Tracker';
const BASE_DESCRIPTION =
  'Plan branch KPI targets, cascade annual to 12-month personal goals, log offline actuals, and export appraisal reports with Biqat KPI.';

const ROUTE_META: Record<
  AppPageRoute,
  { titleAm: string; titleEn: string; desc: string }
> = {
  landing: {
    titleAm: BASE_TITLE,
    titleEn: BASE_TITLE,
    desc: BASE_DESCRIPTION,
  },
  overview: {
    titleAm: 'ብቃት KPI · አጠቃላይ ዳሽቦርድ — Biqat KPI Overview',
    titleEn: 'Executive KPI Dashboard & Heatmap — Biqat KPI',
    desc: 'Monitor weighted KPI scores, month-over-month trends, fiscal achievement heatmaps, and daily working-day pace offline in Biqat KPI.',
  },
  branch: {
    titleAm: 'የቅርንጫፍ ዓመታዊ እቅድ — Biqat KPI Branch Plan',
    titleEn: 'KPI Categories & Branch Annual Plan — Biqat KPI',
    desc: 'Configure custom bilingual KPI categories, weight balances, and branch annual targets to anchor your personal performance scorecard.',
  },
  personal: {
    titleAm: 'የግል የተሰጠኝ እቅድ ማዘጋጃ — Biqat KPI Personal Plan',
    titleEn: 'Personal Assigned Plan & 12-Month Matrix — Biqat KPI',
    desc: 'Cascade personal annual KPI targets into quarterly and 12-month benchmarks using working-day proration, seasonal splits, and pinned months.',
  },
  actuals: {
    titleAm: 'ክንውን መመዝገቢያ — Biqat KPI Actual Performance',
    titleEn: 'Actual Performance Input & Plan Benchmarks — Biqat KPI',
    desc: 'Log daily and monthly KPI actuals offline against assigned monthly, quarterly, and annual plan benchmarks with live gap calculations.',
  },
  pipeline: {
    titleAm: 'የደንበኞች ፓይፕላይን እና ተግባራት — Biqat KPI Pipeline',
    titleEn: 'Prospect Pipeline & Action Tasks — Biqat KPI',
    desc: 'Track client prospects, expected KPI pipeline values, and prioritized action tasks with one-click conversion into recorded actuals.',
  },
  reports: {
    titleAm: 'የKPI አፈጻጸም ሪፖርት — Biqat KPI Appraisal Reports',
    titleEn: 'Cumulative KPI Analytics & Appraisal Reports — Biqat KPI',
    desc: 'Generate print-ready KPI appraisal reports, cumulative plan-vs-actual variance tables, year-over-year comparisons, and CSV exports.',
  },
  install: {
    titleAm: 'አፕ መጫኛ እና ኦፍላይን ካሽ — Biqat KPI Offline PWA',
    titleEn: 'Install App & Offline Service Worker — Biqat KPI',
    desc: 'Install Biqat KPI as a standalone desktop or mobile app with Service Worker offline caching, local IndexedDB storage, and PIN protection.',
  },
};

export const SEOHead: React.FC<SEOHeadProps> = ({
  currentPage,
  lang,
  theme,
  fiscalYearLabel,
}) => {
  useEffect(() => {
    const routeMeta = ROUTE_META[currentPage] || ROUTE_META.landing;
    const rawTitle = lang === 'am' ? routeMeta.titleAm : routeMeta.titleEn;
    const nextTitle =
      currentPage === 'landing' ? BASE_TITLE : `${rawTitle} (${fiscalYearLabel})`;
    const nextDesc = routeMeta.desc;

    document.title = nextTitle;
    document.documentElement.lang = lang === 'am' ? 'am' : 'en';

    const origin = window.location.origin;
    const canonicalUrl = `${origin}${window.location.pathname}`;
    const socialCardUrl = `${origin}/og-social-card.png`;

    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonicalUrl);

    const setMeta = (selector: string, attrName: 'name' | 'property', attrVal: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', nextDesc);
    setMeta('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
    setMeta(
      'meta[property="og:title"]',
      'property',
      'og:title',
      currentPage === 'landing' ? BASE_TITLE : nextTitle
    );
    setMeta('meta[property="og:description"]', 'property', 'og:description', nextDesc);
    setMeta('meta[property="og:image"]', 'property', 'og:image', socialCardUrl);
    setMeta('meta[property="og:locale"]', 'property', 'og:locale', lang === 'am' ? 'am_ET' : 'en_US');
    setMeta(
      'meta[name="twitter:title"]',
      'name',
      'twitter:title',
      currentPage === 'landing' ? BASE_TITLE : nextTitle
    );
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', nextDesc);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', socialCardUrl);

    const themeColorEl = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColorEl) {
      themeColorEl.setAttribute('content', theme === 'dark' ? '#0B1120' : '#0F172A');
    }
  }, [currentPage, lang, theme, fiscalYearLabel]);

  return null;
};
