/**
 * Export center — Phase 9.
 * GET /api/weddings/[id]/export/[dataset]?format=csv|xlsx
 * Staff+ only (membership + RLS). XLSX bundles every dataset as sheets
 * with ?format=xlsx&dataset=all.
 */
import { NextResponse, type NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import { getMyRole } from '@/lib/db/weddings';
import { fetchGuestHub } from '@/lib/db/guests';
import { getRsvpBoard } from '@/lib/db/rsvp';
import { listEvents } from '@/lib/db/events';
import { getSeatingPlan } from '@/lib/db/seating';
import { listBudget, listTasks, listVendorPayments, listVendors } from '@/lib/db/planning';
import {
  datasetHeaders,
  datasetRows,
  isExportDataset,
  toCsv,
  EXPORT_DATASETS,
  type ExportBundle,
} from '@/lib/export/datasets';

interface Ctx {
  params: Promise<{ id: string; dataset: string }>;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const { id: weddingId, dataset } = await params;
  const format = new URL(request.url).searchParams.get('format') === 'xlsx' ? 'xlsx' : 'csv';
  try {
    const role = await getMyRole(weddingId);
    if (!role) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

    const [guests, board, events, plan, budget, vendors, payments, tasks] = await Promise.all([
      fetchGuestHub(weddingId),
      getRsvpBoard(weddingId),
      listEvents(weddingId),
      getSeatingPlan(weddingId),
      listBudget(weddingId),
      listVendors(weddingId),
      listVendorPayments(weddingId),
      listTasks(weddingId),
    ]);
    const tableOf = new Map<string, string>();
    for (const t of plan.tables) for (const gid of t.guest_ids) tableOf.set(gid, t.id);
    const bundle: ExportBundle = {
      guests,
      board,
      events,
      plan,
      budget,
      vendors,
      payments,
      tasks,
      guestNames: new Map(guests.map((g) => [g.id, g.display_name])),
      householdOf: new Map(guests.map((g) => [g.id, g.household_label])),
      tableOf,
    };

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const sheets = dataset === 'all' ? [...EXPORT_DATASETS] : [dataset];
      for (const name of sheets) {
        if (!isExportDataset(name)) {
          return NextResponse.json({ error: 'Unknown dataset.' }, { status: 400 });
        }
        const ws = XLSX.utils.aoa_to_sheet([datasetHeaders(name), ...datasetRows(name, bundle)]);
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      }
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="wedding-${dataset}.xlsx"`,
        },
      });
    }

    if (!isExportDataset(dataset)) {
      return NextResponse.json({ error: 'Unknown dataset.' }, { status: 400 });
    }
    const csv = toCsv(datasetHeaders(dataset), datasetRows(dataset, bundle));
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="wedding-${dataset}.csv"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Export failed.' }, { status: 500 });
  }
}
