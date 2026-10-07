/**
 * Print document builders — Phase 12 (pure, unit-tested).
 * Themed HTML documents rendered to print-ready PDF via Chromium
 * (lib/pdf/render.ts). Same wedding data + theme tokens as every other
 * surface: no duplicated content, no per-theme component copies.
 * Print rules: explicit @page sizes, safe margins, exact colors,
 * page-break control, vector monogram + high-resolution images.
 */

import { themeToCssVars, type ThemeTokens } from '@/lib/themes/tokens';

export const STATIONERY_DOCS = [
  'invitation',
  'save-the-date',
  'place-cards',
  'menu',
  'thank-you',
  'seating-chart',
] as const;

export type StationeryDoc = (typeof STATIONERY_DOCS)[number];

export function isStationeryDoc(v: string): v is StationeryDoc {
  return (STATIONERY_DOCS as readonly string[]).includes(v);
}

export function stationeryLabel(doc: StationeryDoc): string {
  switch (doc) {
    case 'invitation':
      return 'Invitations';
    case 'save-the-date':
      return 'Save the dates';
    case 'place-cards':
      return 'Place cards';
    case 'menu':
      return 'Menus';
    case 'thank-you':
      return 'Thank-you cards';
    case 'seating-chart':
      return 'Seating chart';
  }
}

export interface StationeryGuest {
  id: string;
  name: string;
  household: string | null;
  table: string | null;
  events: string[];
}

export interface StationeryEvent {
  id: string;
  name: string;
  starts_at: string | null;
  timezone: string;
  venue: string | null;
  address: string | null;
  description: string | null;
  dress_code: string | null;
}

export interface StationeryData {
  weddingTitle: string;
  websiteUrl: string;
  theme: ThemeTokens;
  monogramSvg: string | null;
  coverUrl: string | null;
  events: StationeryEvent[];
  guests: StationeryGuest[];
  venueNote: string | null;
  menuNote: string | null;
  dietaryNote: string | null;
}

/** Shorten display names for fixed-size print areas (cards, chart cells). */
export function fitName(name: string, max = 26): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export function formatPrintDate(iso: string | null, locale = 'en'): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type PageSize = 'A6' | 'A5' | 'A4' | 'A3';

function pageRule(size: PageSize, landscape: boolean): string {
  return `@page { size: ${size}${landscape ? ' landscape' : ''}; margin: 12mm; }`;
}

function baseCss(theme: ThemeTokens, size: PageSize, landscape: boolean): string {
  const vars = Object.entries(themeToCssVars(theme))
    .map(([k, v]) => `${k}: ${v};`)
    .join(' ');
  return `
    ${pageRule(size, landscape)}
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; font-family: ${theme.typography.body}; background: var(--wp-background); color: var(--wp-ink); }
    .display { font-family: ${theme.typography.display}; }
    .page { page-break-after: always; position: relative; }
    .page:last-child { page-break-after: avoid; }
    .kicker { font-size: 9pt; letter-spacing: 3pt; text-transform: uppercase; color: var(--wp-muted); }
    .accent { color: var(--wp-accent); }
    .rule { width: 48pt; height: 1pt; background: var(--wp-accent); margin: 10pt auto; }
    :root { ${vars} }
  `;
}

function shell(theme: ThemeTokens, size: PageSize, landscape: boolean, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(theme, size, landscape)}</style></head><body>${body}</body></html>`;
}

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function monogramBlock(monogramSvg: string | null, sizePt: number): string {
  if (!monogramSvg) return '';
  return `<div style="width:${sizePt}pt;margin:0 auto 12pt auto;">${monogramSvg}</div>`;
}

function invitationPage(
  d: StationeryData,
  guest: StationeryGuest,
  coverImg: string,
): string {
  const events = guest.events.length > 0 ? guest.events.join(' · ') : 'Details to follow';
  return `<div class="page" style="text-align:center;padding:24pt 18pt;">
    ${monogramBlock(d.monogramSvg, 72)}
    ${coverImg}
    <p class="kicker">You are invited</p>
    <p class="display" style="font-size:26pt;margin:8pt 0 2pt 0;">Dear ${esc(guest.name)}</p>
    <p style="font-size:11pt;color:var(--wp-muted);">${esc(d.weddingTitle)}</p>
    <div class="rule"></div>
    <p class="display" style="font-size:13pt;">${esc(events)}</p>
    ${d.venueNote ? `<p style="font-size:10pt;margin-top:10pt;">${esc(d.venueNote)}</p>` : ''}
    <p style="font-size:9pt;color:var(--wp-muted);margin-top:16pt;">${esc(d.websiteUrl)}</p>
  </div>`;
}

export interface BuildOptions {
  guestId?: string;
  eventId?: string;
}

export function buildDocument(
  doc: StationeryDoc,
  d: StationeryData,
  opts: BuildOptions = {},
): { title: string; html: string } {
  const coverImg = d.coverUrl
    ? `<img src="${esc(d.coverUrl)}" style="width:100%;max-height:220pt;object-fit:cover;border-radius:var(--wp-radius);margin-bottom:12pt;" />`
    : '';

  switch (doc) {
    case 'invitation': {
      const guests = opts.guestId ? d.guests.filter((g) => g.id === opts.guestId) : d.guests;
      const list = guests.length > 0 ? guests : [{ id: '', name: 'Our Honoured Guest', household: null, table: null, events: d.events.map((e) => e.name) }];
      return {
        title: `Invitation — ${d.weddingTitle}`,
        html: shell(d.theme, 'A5', false, list.map((g) => invitationPage(d, g, coverImg)).join('')),
      };
    }
    case 'save-the-date': {
      const first = d.events[0];
      return {
        title: `Save the date — ${d.weddingTitle}`,
        html: shell(
          d.theme,
          'A5',
          true,
          `<div class="page" style="text-align:center;padding:30pt;">
            ${monogramBlock(d.monogramSvg, 64)}
            ${coverImg}
            <p class="kicker">Save the date</p>
            <p class="display" style="font-size:30pt;margin:10pt 0;">${esc(d.weddingTitle)}</p>
            ${first?.starts_at ? `<p class="display" style="font-size:14pt;">${esc(formatPrintDate(first.starts_at))}</p>` : ''}
            ${first?.venue ? `<p style="font-size:11pt;color:var(--wp-muted);">${esc(first.venue)}</p>` : ''}
            <p style="font-size:9pt;color:var(--wp-muted);margin-top:14pt;">${esc(d.websiteUrl)}</p>
          </div>`,
        ),
      };
    }
    case 'place-cards': {
      const seated = d.guests.filter((g) => g.table);
      // Chunk into pages of 8 (2×4 grid on A4).
      const chunks: string[][] = [];
      const all = seated.map(
        (g) => `<div style="border:1pt solid var(--wp-muted);border-radius:var(--wp-radius);padding:18pt 12pt;text-align:center;overflow:hidden;">
          <p class="display" style="font-size:20pt;margin:0;">${esc(fitName(g.name))}</p>
          <p style="font-size:10pt;color:var(--wp-muted);margin:6pt 0 0 0;">${esc(g.table as string)}</p>
        </div>`,
      );
      for (let i = 0; i < all.length; i += 8) chunks.push(all.slice(i, i + 8));
      const pages: string[] = [];
      if (chunks.length === 0) {
        pages.push(`<div class="page" style="padding:24pt;text-align:center;"><p>No seated guests yet.</p></div>`);
      } else {
        for (const chunk of chunks) {
          pages.push(
            `<div class="page" style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(4,1fr);gap:10pt;padding:6pt;">${chunk.join('')}</div>`,
          );
        }
      }
      return { title: `Place cards — ${d.weddingTitle}`, html: shell(d.theme, 'A4', false, pages.join('')) };
    }
    case 'menu': {
      const events = opts.eventId ? d.events.filter((e) => e.id === opts.eventId) : d.events;
      const list = events.length > 0 ? events : [{ id: '', name: 'Menu', starts_at: null, timezone: '', venue: null, address: null, description: null, dress_code: null }];
      return {
        title: `Menu — ${d.weddingTitle}`,
        html: shell(
          d.theme,
          'A5',
          false,
          list
            .map(
              (e) => `<div class="page" style="text-align:center;padding:28pt 20pt;">
                ${monogramBlock(d.monogramSvg, 56)}
                <p class="kicker">${esc(e.name)}</p>
                <p class="display" style="font-size:24pt;margin:8pt 0;">Menu</p>
                <div class="rule"></div>
                ${d.menuNote ? `<p style="font-size:11pt;white-space:pre-line;">${esc(d.menuNote)}</p>` : '<p style="font-size:11pt;color:var(--wp-muted);">Menu to follow.</p>'}
                ${d.dietaryNote ? `<p style="font-size:9pt;color:var(--wp-muted);margin-top:12pt;">${esc(d.dietaryNote)}</p>` : ''}
              </div>`,
            )
            .join(''),
        ),
      };
    }
    case 'thank-you': {
      const guests = opts.guestId ? d.guests.filter((g) => g.id === opts.guestId) : d.guests;
      const list = guests.length > 0 ? guests : [{ id: '', name: 'Friend', household: null, table: null, events: [] }];
      return {
        title: `Thank you — ${d.weddingTitle}`,
        html: shell(
          d.theme,
          'A6',
          false,
          list
            .map(
              (g) => `<div class="page" style="text-align:center;padding:24pt 16pt;">
                ${monogramBlock(d.monogramSvg, 52)}
                <p class="kicker">Thank you</p>
                <p class="display" style="font-size:20pt;margin:8pt 0;">Dear ${esc(g.name)}</p>
                <p style="font-size:10pt;">For celebrating with us — it meant the world.</p>
                <p class="display" style="font-size:11pt;margin-top:10pt;">${esc(d.weddingTitle)}</p>
              </div>`,
            )
            .join(''),
        ),
      };
    }
    case 'seating-chart': {
      const byTable = new Map<string, StationeryGuest[]>();
      for (const g of d.guests) {
        if (!g.table) continue;
        if (!byTable.has(g.table)) byTable.set(g.table, []);
        byTable.get(g.table)?.push(g);
      }
      const tables = [...byTable.entries()].sort((a, b) => a[0].localeCompare(b[0]));
      const unseated = d.guests.filter((g) => !g.table);
      return {
        title: `Seating chart — ${d.weddingTitle}`,
        html: shell(
          d.theme,
          'A3',
          true,
          `<div class="page" style="padding:18pt;">
            <p class="kicker" style="text-align:center;">Seating chart</p>
            <p class="display" style="font-size:22pt;text-align:center;margin:4pt 0 12pt 0;">${esc(d.weddingTitle)}</p>
            ${
              tables.length === 0
                ? '<p style="text-align:center;">No seats assigned yet.</p>'
                : `<div style="column-count:3;column-gap:16pt;">${tables
                    .map(
                      ([name, members]) => `<div style="break-inside:avoid;margin-bottom:12pt;border:1pt solid var(--wp-muted);border-radius:var(--wp-radius);padding:10pt;">
                        <p class="display" style="font-size:13pt;margin:0 0 6pt 0;">${esc(name)}</p>
                        ${members.map((m) => `<p style="font-size:9pt;margin:2pt 0;">${esc(fitName(m.name, 32))}</p>`).join('')}
                      </div>`,
                    )
                    .join('')}</div>`
            }
            ${
              unseated.length > 0
                ? `<p style="font-size:9pt;color:var(--wp-muted);margin-top:10pt;">Unseated (${unseated.length}): ${esc(unseated.slice(0, 20).map((g) => fitName(g.name, 24)).join(', '))}${unseated.length > 20 ? '…' : ''}</p>`
                : ''
            }
          </div>`,
        ),
      };
    }
  }
}
