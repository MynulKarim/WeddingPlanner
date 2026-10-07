import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import {
  cancelMessage,
  listMessages,
  processDueNow,
  retryMessage,
  getTemplateOverride,
} from '@/lib/db/messages';
import { listInviteStatuses } from '@/lib/db/invitations';
import { listEvents } from '@/lib/db/events';
import { hasRealProviders } from '@/lib/communications/providers';
import { TEMPLATE_KINDS, templateLabel } from '@/lib/communications/variables';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { ComposeForm } from './compose-form';
import { TemplateForm } from './template-form';
import { InvitationManager } from '../rsvp/invitation-manager';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MessagesPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const providers = hasRealProviders();
  const [history, invites, events] = await Promise.all([
    listMessages(id),
    listInviteStatuses(id),
    listEvents(id),
  ]);
  const overrides = await Promise.all(
    TEMPLATE_KINDS.flatMap((kind) =>
      (['email', 'sms'] as const).map(async (channel) => ({
        kind,
        channel,
        override: await getTemplateOverride(id, kind, channel),
      })),
    ),
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Email + SMS invitations, reminders, announcements, and thank-yous.
        {providers.email || providers.sms ? (
          <> Real sending is on ({[providers.email && 'email', providers.sms && 'SMS'].filter(Boolean).join(' + ')}).</>
        ) : (
          <> Development mode: messages are logged, never sent. Configure provider keys to send for real.</>
        )}
      </p>

      <div className="mt-8 flex flex-col gap-6">
        {canEdit && (
          <Card>
            <SectionHeading title="Compose" desc="Preview first — nothing sends without your explicit confirmation." />
            <div className="mt-4">
              <ComposeForm weddingId={id} events={events.map((e) => ({ id: e.id, name: e.name }))} />
            </div>
          </Card>
        )}

        <Card>
          <SectionHeading title="History" desc="Delivery status per recipient. Failed sends can be retried; scheduled sends cancelled." />
          <div className="mt-4 flex flex-col gap-2">
            {canEdit && (
              <form action={processDueNow.bind(null, id)}>
                <button
                  type="submit"
                  className="w-fit rounded-full border border-black/10 px-4 py-2 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
                >
                  Deliver due scheduled messages now
                </button>
              </form>
            )}
            {history.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No messages yet.</p>
            ) : (
              <ul className="divide-y divide-black/5 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/10">
                {history.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {m.guest_name ?? m.to_address}
                        <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          {m.template_kind} · {m.channel}
                        </span>
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {m.status}
                        {m.scheduled_for ? ` · scheduled ${new Date(m.scheduled_for).toLocaleString()}` : ''}
                        {m.sent_at ? ` · sent ${new Date(m.sent_at).toLocaleString()}` : ''}
                        {m.error ? ` · ${m.error}` : ''}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-2">
                        {m.status === 'scheduled' && (
                          <form action={cancelMessage.bind(null, id, m.id)}>
                            <button type="submit" className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                              Cancel
                            </button>
                          </form>
                        )}
                        {m.status === 'failed' && (
                          <form action={retryMessage.bind(null, id, m.id)}>
                            <button type="submit" className="rounded-full border border-black/10 px-3 py-1 text-xs font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10">
                              Retry
                            </button>
                          </form>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {canEdit && (
          <Card>
            <SectionHeading title="Templates" desc="Optional overrides with {{guestName}}, {{link}}, {{website}}… Empty restores built-ins." />
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {overrides.map((o) => (
                <TemplateForm
                  key={`${o.kind}-${o.channel}`}
                  weddingId={id}
                  kind={o.kind}
                  kindLabel={templateLabel(o.kind)}
                  channel={o.channel}
                  initialSubject={o.override.subject ?? ''}
                  initialBody={o.override.body ?? ''}
                />
              ))}
            </div>
          </Card>
        )}

        <Card>
          <SectionHeading title="Shareable links" desc="Website and per-guest invitation links to share anywhere." />
          <div className="mt-4 flex flex-col gap-3">
            <p className="font-mono text-xs">
              Website:{' '}
              <Link href={`/w/${wedding.slug}`} target="_blank" className="underline underline-offset-4">
                /w/{wedding.slug}
              </Link>
            </p>
            {canEdit ? (
              <InvitationManager weddingId={id} guests={invites} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Only planners and above can issue links.
              </p>
            )}
          </div>
        </Card>
      </div>
    </main>
  );
}
