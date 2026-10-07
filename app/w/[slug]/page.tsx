import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublishedWebsite } from '@/lib/db/website';
import { getPublicRegistry } from '@/lib/db/registry';
import { resolveTheme } from '@/lib/themes/tokens';
import { WebsiteView } from '@/components/website/website-view';
import { getAppUrl } from '@/lib/supabase/server';
import { pickLangParam } from '@/lib/i18n/dict';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublishedWebsite(slug).catch(() => null);
  const base = getAppUrl();
  if (!site) return { title: 'Wedding' };
  const names =
    site.website.content.partnerA || site.website.content.partnerB
      ? [site.website.content.partnerA, site.website.content.partnerB]
          .filter(Boolean)
          .join(' & ')
      : site.wedding.title;
  const title = `${names} — Wedding`;
  const description =
    site.website.content.tagline ||
    site.website.content.story?.slice(0, 160) ||
    `Join us to celebrate ${names}.`;
  const cover = site.gallery[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `${base}/w/${slug}` },
    robots: site.website.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: `${base}/w/${slug}`,
      type: 'website',
      ...(cover ? { images: [{ url: cover, alt: names }] } : {}),
    },
  };
}

export default async function PublicWeddingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};
  const site = await getPublishedWebsite(slug).catch(() => null);
  if (!site) notFound();
  const locale = pickLangParam(sp.lang, site.wedding.default_locale);
  const theme = resolveTheme(
    site.wedding.theme_id,
    site.wedding.theme_overrides as Parameters<typeof resolveTheme>[1],
  );
  const registry = await getPublicRegistry(site.wedding.id).catch(() => []);
  return (
    <WebsiteView
      data={{
        weddingId: site.wedding.id,
        weddingTitle: site.wedding.title,
        theme,
        locale,
        sections: site.website.sections,
        content: site.website.content,
        events: site.events,
        monogram:
          site.monogram &&
          ['serif', 'script', 'modern', 'traditional'].includes(site.monogram.style) &&
          ['seal', 'crest', 'minimal'].includes(site.monogram.shape)
            ? (site.monogram as {
                initials: string;
                style: 'serif' | 'script' | 'modern' | 'traditional';
                shape: 'seal' | 'crest' | 'minimal';
              })
            : null,
        gallery: site.gallery,
        registry,
        guestbook: site.guestbook,
        songs: site.songs,
        games: site.games,
        capsule: site.capsule,
        welcomeVideoUrl: site.welcomeVideoUrl,
      }}
    />
  );
}
