/**
 * Session helpers for Server Components and Server Actions — Phase 1.
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface SessionUser {
  id: string;
  email: string | undefined;
}

/** Returns the current user, or null when signed out / unconfigured. */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}
