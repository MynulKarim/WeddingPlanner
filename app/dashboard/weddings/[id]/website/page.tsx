import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWedding, getMyRole } from '@/lib/db/weddings';
import { hasRoleAtLeast } from '@/lib/auth/roles';
import { getDesign } from '@/lib/db/design';
import { getWebsite, saveWebsiteSections, setPublished } from '@/lib/db/website';
import { getRegistry } from '@/lib/db/registry';
import { listEvents } from '@/lib/db/events';
import { resolveTheme } from '@/lib/themes/tokens';
import { WEBSITE_SECTION_IDS } from '@/lib/invitation/sections';
import { normalizeSections } from '@/lib/invitation/sections';
import { Card, SectionHeading } from '@/components/ui/primitives';
import { WebsiteView } from '@/components/website/website-view';
import { SectionsEditor } from '../design/sections-editor';
import { PreviewShell } from '../design/preview-shell';
import { ContentForm } from './content-form';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WebsitePage({ params }: Props) {
  const { id } = await params;
  const wedding = await getWedding(id).catch(() => null);
  if (!wedding) notFound();
  const role = await getMyRole(id);
  const canEdit = role !== null && hasRoleAtLeast(role, 'planner');

  const [site, design, events, registry] = await Promise.all([
    getWebsite(id),
    getDesign(id),
    listEvents(id),
    getRegistry(id),
  ]);
  const sections = site?.sections ?? normalizeSections([], WEBSITE_SECTION_IDS);
  const theme = resolveTheme(design.themeId, design.overrides);
  const gallery = design.media
    .filter((m) => m.kind === 'image' && m.url)
    .slice(0, 24)
    .map((m) => ({ id: m.id, url: m.url as string, label: m.label }));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-16">
      <Link href={`/dashboard/weddings/${id}`} className="text-sm text-zinc-600 underline underline-offset-4 dark:text-zinc-400">
        ← {wedding.title}
      </Link>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Wedding website</h1>
          <p className="mt-1 font-mono text-xs text-zinc-500 dark:text-zinc-400">
            /w/{wedding.slug} · {site?.is_published ? 'published' : 'draft'}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {site?.is_published && (
              <Link
                href={`/w/${wedding.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-black/10 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                View live ↗
              </Link>
            )}
            <form action={setPublished.bind(null, id, !site?.is_published)}>
              <button
                type="submit"
                className="rounded-full bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {site?.is_published ? 'Unpublish' : 'Publish'}
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <Card>
          <SectionHeading title="Sections" desc="Order and visibility for the public website." />
          <div className="mt-4">
            {canEdit ? (
              <SectionsEditor weddingId={id} initial={sections} save={saveWebsiteSections} />
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Only planners and above can edit the website.
              </p>
            )}
          </div>
        </Card>

        {canEdit && (
          <Card>
            <SectionHeading title="Content" desc="Text for story, logistics, FAQ, and registry sections." />
            <div className="mt-4">
              <ContentForm weddingId={id} initial={site?.content ?? {}} noindex={site?.noindex ?? false} />
            </div>
          </Card>
        )}

        <Card>
          <SectionHeading title="Preview" desc="Exactly what guests see (unpublished changes included)." />
          <div className="mt-4">
            <PreviewShell>
              <WebsiteView
                data={{
                  weddingId: id,
                  weddingTitle: wedding.title,
                  theme,
                  locale: design.defaultLocale,
                  sections,
                  content: site?.content ?? {},
                  events,
                  monogram: design.monogram,
                  gallery,
                  registry: registry.items,
                  guestbook: [],
                  songs: [],
                  games: [],
                  capsule: [],
                  welcomeVideoUrl: null,
                }}
              />
            </PreviewShell>
          </div>
        </Card>

        {!site?.is_published && (
          <p className="rounded-2xl border border-dashed border-black/15 p-6 text-center text-sm text-zinc-600 dark:border-white/15 dark:text-zinc-400">
            This website is a draft — publish it to make /w/{wedding.slug} visible to the
            world. Search engines are included via sitemap unless noindex is set.
          </p>
        )}
      </div>
    </main>
  );
}
