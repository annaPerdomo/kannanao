import { pink, purple } from '@mui/material/colors';

import { APP_DOMAIN, APP_URL } from '@/lib/brand';

import { escapeHtml, PRINT_BASE_CSS } from './lessonPrintable';

/** The popup is `about:blank`, so relative asset URLs need a real origin via `<base>`. */
export function printOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return APP_URL;
}

export const PRINT_FONTS_HTML = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=Nunito:wght@400;700&family=Zen+Maru+Gothic:wght@400;700&display=swap" rel="stylesheet">`;

export const BRAND_PRINT_CSS = `
  body {
    font-family: "Nunito", "Zen Maru Gothic", "Hiragino Sans", sans-serif;
  }
  h1, h2 {
    font-family: "Fredoka", "Zen Maru Gothic", sans-serif;
  }
  h2 {
    border-left: 3px solid ${purple[400]};
    padding-left: 8px;
  }
  .card, table, .model, .practicebox, .frame {
    border-radius: 2mm;
  }
  .word, ruby {
    font-family: "Zen Maru Gothic", "Hiragino Sans", sans-serif;
  }
  .print-brand-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
  }
  .print-brand-header .brand-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .print-brand-header img.brand-mascot {
    height: 13mm;
    width: auto;
  }
  .print-brand-header .brand-title {
    font-family: "Fredoka", "Zen Maru Gothic", sans-serif;
    font-size: 1.2rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }
  .print-brand-header .brand-subtitle {
    font-size: 0.78rem;
    color: #666;
    margin: 2px 0 0;
  }
  .print-brand-header .brand-right {
    text-align: right;
  }
  .print-brand-header img.brand-wordmark {
    width: 30mm;
    height: auto;
    display: block;
    margin-left: auto;
  }
  .print-brand-header .brand-nameline {
    font-size: 0.78rem;
    color: #333;
    margin-top: 4px;
    white-space: nowrap;
  }
  svg.print-brand-rule {
    display: block;
    width: 100%;
    height: 2px;
    margin-bottom: 14px;
  }
  .print-brand-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2mm 0;
    font-size: 0.68rem;
    color: #888;
    page-break-before: avoid;
  }
  .print-brand-footer img {
    height: 7mm;
    width: auto;
  }
`;

// SVG ids must be unique per document: a doc with several branded headers
// (one per week sheet) would otherwise all point at the first gradient.
let gradientSeq = 0;

export function brandHeaderHtml(args: {
  title: string;
  subtitle?: string;
  nameLine?: string;
}): string {
  const gradientId = `print-brand-rule-${++gradientSeq}`;
  return `<div class="print-brand-header">
  <div class="brand-left">
    <img class="brand-mascot" src="/mascot/head-happy.png" alt="">
    <div>
      <p class="brand-title">${escapeHtml(args.title)}</p>
      ${args.subtitle ? `<p class="brand-subtitle">${escapeHtml(args.subtitle)}</p>` : ''}
    </div>
  </div>
  <div class="brand-right">
    <img class="brand-wordmark" src="/brand/logo-wordmark.png" alt="">
    ${args.nameLine ? `<div class="brand-nameline">${escapeHtml(args.nameLine)}</div>` : ''}
  </div>
</div>
<svg class="print-brand-rule" viewBox="0 0 100 2" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- gradientUnits must be userSpaceOnUse: a <line> has a zero-height bbox, so objectBoundingBox (the default) paints nothing. -->
    <linearGradient id="${gradientId}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
      <stop offset="0%" stop-color="${purple[400]}" />
      <stop offset="100%" stop-color="${pink[400]}" />
    </linearGradient>
  </defs>
  <line x1="0" y1="1" x2="100" y2="1" stroke="url(#${gradientId})" stroke-width="2" />
</svg>`;
}

/**
 * Shared print shell. Callers that brand their own per-section headers
 * (lesson weeks, kanji sheets, kana charts) pass `header: false`.
 */
export function printDocumentHtml(args: {
  title: string;
  locale: string;
  css: string;
  body: string;
  origin?: string;
  header?: boolean;
}): string {
  const origin = args.origin ?? printOrigin();
  const header = (args.header ?? true) ? brandHeaderHtml({ title: args.title }) : '';

  return `<!doctype html>
<html lang="${escapeHtml(args.locale)}">
<head>
<meta charset="utf-8">
<base href="${escapeHtml(origin)}/">
<title>${escapeHtml(args.title)}</title>
${PRINT_FONTS_HTML}
<style>${PRINT_BASE_CSS}${BRAND_PRINT_CSS}${args.css}</style>
</head>
<body>
${header}
${args.body}
<footer class="print-brand-footer">
  <span>🌸 ${escapeHtml(APP_DOMAIN)}</span>
  <img src="/mascot/pup.png" alt="">
</footer>
<script>var done=false;function go(){if(!done){done=true;window.print();}} setTimeout(go,4000); window.addEventListener('load',function(){(document.fonts?document.fonts.ready:Promise.resolve()).then(go);});</script>
</body>
</html>`;
}
