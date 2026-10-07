/**
 * Stationery endpoint — Phase 12, hardened in Phase 16.
 * GET /api/weddings/[id]/stationery/[doc]?format=pdf|html&guestId=&eventId=
 * Staff+ only. HTML format = print preview in the browser; PDF = download.
 * Hosts without Chromium get a 503 naming the HTML fallback instead of a
 * bare render failure (the studio also hides the PDF button there).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getMyRole } from '@/lib/db/weddings';
import { getStationeryData } from '@/lib/pdf/stationery-data';
import { buildDocument, isStationeryDoc } from '@/lib/pdf/documents';
import { chromiumAvailable, isChromiumMissing, renderPdf } from '@/lib/pdf/render';

// PDF rendering can exceed short serverless timeouts; long hosts ignore this.
export const maxDuration = 60;

interface Ctx {
  params: Promise<{ id: string; doc: string }>;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id: weddingId, doc } = await params;
  if (!isStationeryDoc(doc)) {
    return NextResponse.json({ error: 'Unknown document.' }, { status: 400 });
  }
  const search = new URL(request.url).searchParams;
  const format = search.get('format') === 'html' ? 'html' : 'pdf';
  const guestId = search.get('guestId') || undefined;
  const eventId = search.get('eventId') || undefined;

  try {
    const role = await getMyRole(weddingId);
    if (!role) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const data = await getStationeryData(weddingId);
    const built = buildDocument(doc, data, { guestId, eventId });

    if (format === 'html') {
      return new NextResponse(built.html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    // Preflight: fail fast with the fallback URL instead of burning a
    // 30s launch timeout on hosts without Chromium (e.g. serverless).
    const htmlParams = new URL(request.url).searchParams;
    htmlParams.set('format', 'html');
    const fallbackUrl = `/api/weddings/${weddingId}/stationery/${doc}?${htmlParams.toString()}`;
    if (!(await chromiumAvailable())) {
      return NextResponse.json(
        {
          error:
            'PDF engine unavailable on this host (Chromium missing). Use the HTML preview + browser print instead.',
          fallbackUrl,
        },
        { status: 503 },
      );
    }
    const pdf = await renderPdf(built.html);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${doc}-${weddingId.slice(0, 8)}.pdf"`,
        'Content-Length': String(pdf.length),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Render failed.';
    // Authorization failures hide as 404 (same as the role gate above).
    if (/permission/i.test(message)) {
      return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    }
    const missing = isChromiumMissing(message);
    return NextResponse.json(
      {
        error: missing
          ? 'PDF engine unavailable on this host (Chromium missing). Use the HTML preview + browser print instead.'
          : 'Stationery render failed.',
        ...(missing
          ? {
              fallbackUrl: `/api/weddings/${weddingId}/stationery/${doc}?format=html`,
            }
          : {}),
      },
      { status: 503 },
    );
  }
}
