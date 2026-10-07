import { notFound } from 'next/navigation';
import { getWedding } from '@/lib/db/weddings';
import { listEvents } from '@/lib/db/events';
import { getCheckins } from '@/lib/db/dayof';
import { fetchGuestHub } from '@/lib/db/guests';
import { getRsvpBoard } from '@/lib/db/rsvp';
import { attendanceStats } from '@/lib/dayof/dayof';
import { getDayOfData } from '@/lib/db/dayof';
import { CheckinBoard } from './checkin-board';
import { AttendanceLive } from './attendance-live';

interface Props {
  params: Promise<{ weddingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Day-of hub = check-in with live attendance (Phase 11). */
export default async function DayOfHub({ params, searchParams }: Props) {
  const { weddingId } = await params;
  const sp = await searchParams;
  const wedding = await getWedding(weddingId).catch(() => null);
  if (!wedding) notFound();

  const [events, hub, board, checkins, dayOf] = await Promise.all([
    listEvents(weddingId),
    fetchGuestHub(weddingId),
    getRsvpBoard(weddingId),
    getCheckins(weddingId),
    getDayOfData(weddingId),
  ]);
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const eventId = first(sp.event) ?? events[0]?.id ?? '';

  const assigned = hub
    .filter((g) => g.events.some((e) => e.event_id === eventId))
    .map((g) => g.id);
  const attending = board.guests
    .filter((g) => g.responses[eventId]?.status === 'attending')
    .map((g) => g.guest_id);
  const checked = checkins.filter((c) => c.event_id === eventId).map((c) => c.guest_id);
  const stats = attendanceStats({
    assignedGuestIds: assigned,
    attendingGuestIds: attending,
    checkedInGuestIds: checked,
  });

  return (
    <div className="py-6">
      <AttendanceLive weddingId={weddingId} />
      <dl className="grid grid-cols-3 gap-2">
        {[
          ['Invited', stats.invited],
          ['RSVP yes', stats.attending],
          ['Checked in', stats.checkedIn],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-black/10 bg-white p-3 text-center dark:border-white/10 dark:bg-zinc-900">
            <dt className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</dt>
            <dd className="font-serif text-3xl">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6">
        <CheckinBoard
          weddingId={weddingId}
          events={events.map((e) => ({ id: e.id, name: e.name }))}
          guests={dayOf.guests}
          initialEventId={eventId || null}
        />
      </div>
    </div>
  );
}
