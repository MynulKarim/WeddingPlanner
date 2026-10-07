import { describe, expect, it } from 'vitest';
import {
  canManageWedding,
  canOperateDayOf,
  hasRoleAtLeast,
} from '@/lib/auth/roles';

describe('role hierarchy', () => {
  it('ranks owner > admin > planner > staff > guest', () => {
    expect(hasRoleAtLeast('owner', 'guest')).toBe(true);
    expect(hasRoleAtLeast('guest', 'staff')).toBe(false);
    expect(hasRoleAtLeast('admin', 'admin')).toBe(true);
    expect(hasRoleAtLeast('planner', 'admin')).toBe(false);
  });

  it('grants management to planner and above', () => {
    expect(canManageWedding('planner')).toBe(true);
    expect(canManageWedding('staff')).toBe(false);
    expect(canManageWedding('guest')).toBe(false);
  });

  it('grants day-of operations to staff and planners+', () => {
    expect(canOperateDayOf('staff')).toBe(true);
    expect(canOperateDayOf('owner')).toBe(true);
    expect(canOperateDayOf('guest')).toBe(false);
  });
});
