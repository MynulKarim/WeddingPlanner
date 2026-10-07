/**
 * Auth callback — Phase 1.
 * Handles email verification, magic-link, and password-reset code exchange,
 * then redirects to `?next=` (validated to stay on-site).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function safeNext(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) return value;
  return '/dashboard';
}

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const next = safeNext(request.nextUrl.searchParams.get('next'));
  const code = request.nextUrl.searchParams.get('code');

  if (!url || !anonKey || !code) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  await supabase.auth.exchangeCodeForSession(code);
  // Team auto-link (Phase 15): magic-link and verification land here, so
  // passwordless teammates claim their invites on this path too.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      const { claimTeamInvites } = await import('@/lib/db/team-invites');
      await claimTeamInvites(user.id, user.email);
    }
  } catch {
    // Auth already succeeded; invite linking is best-effort.
  }
  return response;
}
