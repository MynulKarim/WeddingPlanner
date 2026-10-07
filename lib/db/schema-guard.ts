/**
 * Schema guard — Phase 15.
 * New tables (game_questions, game_votes, vendor_payments, team_invites)
 * only exist after migrations 0016–0018 are applied in the Supabase SQL
 * editor. Until then PostgREST answers PGRST205 ("table not in the schema
 * cache"). Reads degrade to empty and writes explain the pending migration
 * instead of surfacing a raw 500 to couples and guests.
 */

/** True when a Supabase error is just "this table does not exist yet". */
export function isSchemaCacheMiss(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e || typeof e !== 'object') return false;
  if (e.code === 'PGRST205') return true;
  return (
    typeof e.message === 'string' &&
    e.message.includes('schema cache') &&
    e.message.includes('Could not find the table')
  );
}

/** Short, couple-facing hint naming the pending migration file. */
export function pendingMigrationMessage(file: string): string {
  return `This needs database update ${file} — apply it in Supabase, then retry.`;
}
