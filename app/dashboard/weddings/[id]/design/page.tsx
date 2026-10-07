import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { deleteMedia, getDesign, saveSections, setTheme } from '@/lib/db/design';
import { listEvents } from '@/lib/db/events';
import { THEMES, resolveTheme, themeToCssVars } from '@/lib/themes/tokens';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { CustomizeForm } from './customize-form';
import { SectionsEditor } from './sections-editor';
import { MonogramDesigner } from './monogram-designer';
import { UploadForm } from './upload-form';
import { PreviewShell } from './preview-shell';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DesignPage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const [design, events] = await Promise.all([getDesign(id), listEvents(id)]);
  const theme = resolveTheme(design.themeId, design.overrides);
  const cover = design.media.find((m) => m.kind === 'image' && m.url) ?? null;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Design studio</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        Theme, monogram, invitation layout, and media — one source of truth for
        invitations, website, and stationery.
      </p>

      <div className="mt-8 flex flex-col gap-6">
        <Card>
          <SectionHeading eyebrow="Theme" title={theme.label} desc="15 premium themes. Components never change — only tokens do." />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {THEMES.map((t) => {
              const vars = themeToCssVars(t) as React.CSSProperties;
              const active = t.id === design.themeId;
              return (
                <form key={t.id} action={canEdit ? setTheme.bind(null, id, t.id) : undefined}>
                  <button
                    type="submit"
                    disabled={!canEdit}
                    aria-pressed={active}
                    title={t.label}
                    className={`w-full overflow-hidden rounded-xl border text-left transition-shadow hover:shadow-md ${
                      active
                        ? 'border-[#8a6d3b] ring-2 ring-[#8a6d3b]/40'
                        : 'border-black/10 dark:border-white/10'
                    }`}
                  >
                    <span className="block p-3" style={vars}>
                      <span
                        className="block rounded-lg px-3 py-4 text-center"
                        style={{
                          background: 'var(--wp-background)',
                          color: 'var(--wp-ink)',
                          fontFamily: 'var(--wp-font-display)',
                        }}
                      >
                        <span className="block text-lg leading-tight">Ag</span>
                        <span
                          className="mx-auto mt-2 block h-2 w-10 rounded-full"
                          style={{ background: 'var(--wp-accent)' }}
                        />
                      </span>
                    </span>
                    <span className="block bg-white px-3 py-2 text-xs font-medium dark:bg-zinc-900">
                      {t.label}
                      {active && ' ✓'}
                    </span>
                  </button>
                </form>
              );
            })}
          </div>
          {!canEdit && (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Only planners and above can change the theme.
            </p>
          )}
        </Card>

        {canEdit && (
          <Card>
            <SectionHeading title="Customize" desc="Optional overrides. Empty fields fall back to the theme." />
            <div className="mt-4">
              <CustomizeForm weddingId={id} current={design.overrides} />
            </div>
          </Card>
        )}

        <Card>
          <SectionHeading title="Monogram" desc="Reusable across invitation, website, and print." />
          <div className="mt-4">
            {canEdit ? (
              <MonogramDesigner
                weddingId={id}
                initial={design.monogram}
                accent={theme.colors.accent}
                ink={theme.colors.ink}
              />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {design.monogram
                  ? `Saved monogram: ${design.monogram.initials}`
                  : 'No monogram yet.'}
              </p>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeading title="Invitation layout" desc="Reorder and toggle sections. Changes reflect in the preview instantly after save." />
          <div className="mt-4">
            {canEdit ? (
              <SectionsEditor weddingId={id} initial={design.sections} save={saveSections} />
            ) : (
              <ul className="text-sm text-zinc-600 dark:text-zinc-400">
                {design.sections.filter((s) => s.enabled).map((s) => (
                  <li key={s.id}>· {s.id}</li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <SectionHeading title="Live preview" desc="Representative invitation under the active theme." />
          <div className="mt-4">
            <PreviewShell
              data={{
                weddingTitle: wedding.title,
                locale: design.defaultLocale,
                theme,
                sections: design.sections,
                events,
                monogram: design.monogram,
                coverUrl: cover?.url ?? null,
              }}
            />
          </div>
        </Card>

        <Card>
          <SectionHeading title="Media library" desc="Images and video for invitations and the website." />
          {canEdit && (
            <div className="mt-4">
              <UploadForm weddingId={id} />
            </div>
          )}
          {design.media.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
              No media yet. Upload a cover photo to see it in the preview gallery.
            </p>
          ) : (
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {design.media.map((m) => (
                <li
                  key={m.id}
                  className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
                >
                  {m.kind === 'image' && m.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.url} alt={m.label ?? 'Wedding media'} className="h-36 w-full object-cover" />
                  ) : (
                    <div className="flex h-36 items-center justify-center bg-black/5 text-xs text-zinc-500 dark:bg-white/10">
                      {m.kind === 'video' ? 'Video' : 'Preview unavailable'}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 dark:bg-zinc-900">
                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {m.label ?? m.kind} · {m.visibility}
                    </span>
                    {canEdit && (
                      <form action={deleteMedia.bind(null, id, m.id)}>
                        <button
                          type="submit"
                          className="text-xs font-medium text-red-700 hover:underline dark:text-red-400"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </main>
  );
}
