/**
 * Static security audit — Phase 13.
 * Parses every migration and fails the suite on regressions:
 * RLS enabled per table, policies present, no blanket-allow policies,
 * storage bucket private, no committed secrets in tracked source.
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../supabase/migrations');
const ROOT = path.resolve(__dirname, '../..');

function migrationSql(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8'));
}

describe('RLS audit', () => {
  it('enables RLS on every wedding-owned table with at least one policy', () => {
    const sql = migrationSql().join('\n');
    const tables = new Set<string>();
    for (const match of sql.matchAll(/create table if not exists (\w+)/g)) {
      tables.add(match[1]);
    }
    // Storage-internal and auth-adjacent tables are out of scope.
    tables.delete('spatial_ref_sys');
    for (const table of tables) {
      expect(sql, `${table} RLS`).toMatch(new RegExp(`alter table ${table} enable row level security`));
      expect(sql, `${table} policy`).toMatch(
        new RegExp(`create policy\\s+"?\\w+"?\\s+on ${table}\\b`),
      );
    }
    expect(tables.size).toBeGreaterThan(20);
  });

  it('contains no blanket-allow policies', () => {
    const sql = migrationSql().join('\n');
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(sql).not.toMatch(/with\s+check\s*\(\s*true\s*\)/i);
  });

  it('keeps the media bucket private with scoped object policies', () => {
    const sql = migrationSql().join('\n');
    expect(sql).toMatch(/'wedding-media', 'wedding-media', false/);
    expect(sql).toContain('on storage.objects');
  });

  it('grants no anonymous reads on private guest data', () => {
    const sql = migrationSql().join('\n');
    for (const table of [
      'guests',
      'guest_events',
      'invitations',
      'rsvps',
      'wedding_members',
      'profiles',
      'vows',
      'audit_logs',
      'messages',
      'message_templates',
    ]) {
      // No policy may allow the anon role implicitly via unqualified select
      // without a membership/published/approved gate. We assert the known
      // public policies are only the allow-listed ones.
      const publicReads = [...sql.matchAll(new RegExp(`create policy "(\\w+)" on ${table}\\s+for select using \\(([\\s\\S]*?)\\);`, 'g'))];
      for (const m of publicReads) {
        expect(`${table}.${m[1]}: ${m[2]}`).toMatch(/is_wedding_member|is_published|auth\.uid\(\)/);
      }
    }
  });
});

describe('secret hygiene', () => {
  it('tracks no JWT-shaped secrets in source', () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(ts|tsx|js|mjs|json|sql|md|yml|yaml|toml)$/.test(entry.name)) continue;
        if (entry.name === '.env.example') continue;
        const text = fs.readFileSync(full, 'utf8');
        // Supabase-style JWTs are eyJ… with two dots; docs may name key vars.
        const hits = text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g);
        if (hits) offenders.push(`${full}: ${hits.length} hit(s)`);
      }
    };
    walk(ROOT);
    expect(offenders).toEqual([]);
  });
});
