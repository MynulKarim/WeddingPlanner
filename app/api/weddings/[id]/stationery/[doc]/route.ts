/**
 * Stationery endpoint — Phase 12.
 * GET /api/weddings/[id]/stationery/[doc]?format=pdf|html&guestId=&eventId=
 * Staff+ only. HTML format = print preview in the browser; PDF = download.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { getMyRole } from '@/lib/db/weddings';
import { getStationeryData } from '@/lib/pdf/stationery-data';
import { buildDocument, isStationeryDoc } from '@/lib/pdf/documents';
import { renderPdf } from '@/lib/pdf/render';

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
    const chromiumMissing =
      message.includes('Could not find Chrome') || message.includes('Failed to launch');
    return NextResponse.json(
      {
        error: chromiumMissing
          ? 'PDF engine unavailable on this host (Chromium missing). Use the HTML preview + browser print instead.'
          : 'Stationery render failed.',
      },
      { status: 503 },
    );
  }
}
