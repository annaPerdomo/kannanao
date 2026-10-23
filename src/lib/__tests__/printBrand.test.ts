import { describe, expect, it } from 'vitest';

import { brandHeaderHtml, printDocumentHtml } from '@/lib/printBrand';

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('printDocumentHtml', () => {
  it('writes the base href, fonts link, fonts-ready wait and footer domain', () => {
    const html = printDocumentHtml({
      title: 'Study sheets',
      locale: 'en',
      css: '',
      body: '<p>hello</p>',
      origin: 'https://example.test',
    });

    expect(html).toContain('<base href="https://example.test/">');
    expect(html).toContain('fonts.googleapis.com');
    expect(html).toContain('document.fonts');
    expect(html).toContain('tangodachi.app');
  });

  it('falls back to printing after 4s if fonts never settle', () => {
    const html = printDocumentHtml({
      title: 'Study sheets',
      locale: 'en',
      css: '',
      body: '<p>hello</p>',
    });

    expect(html).toContain('setTimeout(go,4000)');
    expect(html).toContain('window.print()');
  });

  it('prints exactly one brand header by default and none with header: false', () => {
    const withHeader = printDocumentHtml({
      title: 'Study sheets',
      locale: 'en',
      css: '',
      body: '<p>hello</p>',
    });
    const withoutHeader = printDocumentHtml({
      title: 'Study sheets',
      locale: 'en',
      css: '',
      body: '<p>hello</p>',
      header: false,
    });

    expect(withHeader.match(/head-happy\.png/g)).toHaveLength(1);
    expect(withoutHeader).not.toContain('head-happy.png');
  });

  it('shows the wordmark only when the shell header is on', () => {
    const html = printDocumentHtml({
      title: 'Study sheets',
      locale: 'en',
      css: '',
      body: '<p>hello</p>',
      header: false,
    });

    expect(html).not.toContain('logo-wordmark.png');

    const withHeader = printDocumentHtml({
      title: 'Study sheets',
      locale: 'en',
      css: '',
      body: '<p>hello</p>',
    });
    expect(withHeader).toContain('logo-wordmark.png');
  });
});

describe('brandHeaderHtml', () => {
  it('escapes title, subtitle and nameLine', () => {
    const html = brandHeaderHtml({
      title: '<b>Study sheets</b>',
      subtitle: '<i>Week 1</i>',
      nameLine: 'Name：<u>___</u>',
    });
    const doc = parse(`<!doctype html><body>${html}</body>`);

    expect(doc.querySelector('b')).toBeNull();
    expect(doc.querySelector('i')).toBeNull();
    expect(doc.querySelector('u')).toBeNull();
    expect(doc.querySelector('.brand-title')?.textContent).toBe('<b>Study sheets</b>');
    expect(doc.querySelector('.brand-subtitle')?.textContent).toBe('<i>Week 1</i>');
    expect(doc.querySelector('.brand-nameline')?.textContent).toBe('Name：<u>___</u>');
  });

  it('leaves out the subtitle and name line when not given', () => {
    const html = brandHeaderHtml({ title: 'Study sheets' });
    const doc = parse(`<!doctype html><body>${html}</body>`);

    expect(doc.querySelector('.brand-subtitle')).toBeNull();
    expect(doc.querySelector('.brand-nameline')).toBeNull();
  });

  it('draws the gradient rule as an SVG, not a CSS background', () => {
    const doc = parse(`<!doctype html><body>${brandHeaderHtml({ title: 'Study sheets' })}</body>`);

    const svg = doc.querySelector('svg.print-brand-rule');
    expect(svg).not.toBeNull();
    expect(svg?.querySelector('linearGradient')).not.toBeNull();
  });

  it('paints the gradient in userSpaceOnUse units, not objectBoundingBox', () => {
    const doc = parse(`<!doctype html><body>${brandHeaderHtml({ title: 'Study sheets' })}</body>`);

    expect(doc.querySelector('linearGradient')?.getAttribute('gradientUnits')).toBe(
      'userSpaceOnUse',
    );
  });
});
