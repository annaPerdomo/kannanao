import { escapeHtml } from './lessonPrintable';

export const WRITING_BOX_VIEWBOX = 109;

export const WRITING_BOX_GUIDE = `<rect x="2" y="2" width="105" height="105" fill="none" stroke="#999" stroke-width="2"/><line x1="54.5" y1="2" x2="54.5" y2="107" stroke="#ccc" stroke-width="1" stroke-dasharray="4 4"/><line x1="2" y1="54.5" x2="107" y2="54.5" stroke="#ccc" stroke-width="1" stroke-dasharray="4 4"/>`;

export function writingBoxSvg(opts: { sizeMm: number; trace?: string }): string {
  const { sizeMm, trace } = opts;
  const glyph = trace
    ? `<text x="54.5" y="88" font-size="86" text-anchor="middle" fill="#c8c8c8">${escapeHtml(trace)}</text>`
    : '';
  return `<svg viewBox="0 0 ${WRITING_BOX_VIEWBOX} ${WRITING_BOX_VIEWBOX}" width="${sizeMm}mm" height="${sizeMm}mm" xmlns="http://www.w3.org/2000/svg">${WRITING_BOX_GUIDE}${glyph}</svg>`;
}
