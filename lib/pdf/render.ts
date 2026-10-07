/**
 * Chromium HTML→PDF pipeline — Phase 12 (server only).
 * Headless Chromium renders the themed documents with full CSS (@page
 * sizes, exact colors, embedded font subsets) and prints to PDF buffers.
 * The browser launches lazily and is reused across calls; serverless hosts
 * without a Chromium binary need an external render service (Phase 13 ops).
 */
import puppeteer, { type Browser } from 'puppeteer';

declare global {
  var __wpPdfBrowser: Browser | undefined;
}

async function getBrowser(): Promise<Browser> {
  if (globalThis.__wpPdfBrowser?.connected) return globalThis.__wpPdfBrowser;
  try {
    await globalThis.__wpPdfBrowser?.close();
  } catch {
    // Stale handle — launch fresh below.
  }
  globalThis.__wpPdfBrowser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return globalThis.__wpPdfBrowser;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    const pdf = await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      timeout: 30000,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
  }
}

/** Probe for test environments without a Chromium binary. */
export async function chromiumAvailable(): Promise<boolean> {
  try {
    const browser = await getBrowser();
    const version = await browser.version();
    return version.length > 0;
  } catch {
    return false;
  }
}

/**
 * Launch-failure matcher — Phase 16 (pure, unit-tested). Puppeteer reports
 * a missing binary many ways across platforms ("Could not find Chrome",
 * "Could not find expected browser", ENOENT on the executable, missing
 * shared libraries on slim Linux images).
 */
export function isChromiumMissing(message: string): boolean {
  return (
    /could not find chrome/i.test(message) ||
    /could not find expected browser/i.test(message) ||
    /failed to launch/i.test(message) ||
    (/ENOENT/i.test(message) && /chrome/i.test(message)) ||
    /libnss3|libatk|libXss|libasound/i.test(message)
  );
}
