/**
 * Planning data access — Phase 9 (tenant-scoped, RLS-enforced).
 * Checklist tasks, budget items, vendors. Mutations require planner+.
 */
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/db/weddings';
import { starterTasks } from '@/lib/planning/checklist-template';

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

export interface TaskRow {
  id: string;
  wedding_id: string;
  title: string;
  category: string;
  due_date: string | null;
  assignee: string | null;
  status: 'todo' | 'in_progress' | 'done';
  notes: string;
  position: number;
}

export async function listTasks(weddingId: string): Promise<TaskRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('checklist_tasks')
    .select('id, wedding_id, title, category, due_date, assignee, status, notes, position')
    .eq('wedding_id', weddingId)
    .order('position')
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as TaskRow[];
}

export interface TaskFormState {
  error?: string;
}

export async function createTask(
  weddingId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  await requireRole(weddingId, 'planner');
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { error: 'Task title is required.' };
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('checklist_tasks').insert({
    wedding_id: weddingId,
    title: title.slice(0, 200),
    category: String(formData.get('category') ?? 'General').trim().slice(0, 80) || 'General',
    due_date: String(formData.get('dueDate') ?? '').trim() || null,
    assignee: String(formData.get('assignee') ?? '').trim().slice(0, 120) || null,
    notes: String(formData.get('notes') ?? '').trim().slice(0, 2000),
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/checklist`);
  return {};
}

export async function setTaskStatus(
  weddingId: string,
  taskId: string,
  status: TaskRow['status'],
): Promise<void> {
  await requireRole(weddingId, 'planner');
  if (!['todo', 'in_progress', 'done'].includes(status)) throw new Error('Invalid status.');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('checklist_tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/checklist`);
}

export async function deleteTask(weddingId: string, taskId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('checklist_tasks')
    .delete()
    .eq('id', taskId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/checklist`);
}

export interface GenerateState {
  error?: string;
  created?: number;
}

/** Insert the starter template dated from the wedding day (never touches existing). */
export async function generateStarterChecklist(
  weddingId: string,
  _prev: GenerateState,
  formData: FormData,
): Promise<GenerateState> {
  await requireRole(weddingId, 'planner');
  const weddingDay = String(formData.get('weddingDay') ?? '').trim();
  let tasks;
  try {
    tasks = starterTasks(weddingDay);
  } catch {
    return { error: 'Wedding day must be YYYY-MM-DD.' };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('checklist_tasks').insert(
    tasks.map((t) => ({
      wedding_id: weddingId,
      title: t.title,
      category: t.category,
      due_date: t.due_date,
      assignee: t.assignee || null,
      position: t.position,
    })),
  );
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/weddings/${weddingId}/checklist`);
  return { created: tasks.length };
}

// ---------------------------------------------------------------------------
// Budget
// ---------------------------------------------------------------------------

export interface BudgetRow {
  id: string;
  wedding_id: string;
  category: string;
  title: string;
  vendor_name: string | null;
  budgeted_cents: number;
  actual_cents: number;
  paid_cents: number;
  due_date: string | null;
  notes: string;
}

function parseCents(raw: string): number | null {
  const v = raw.trim();
  if (!v) return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 100_000_000_00) return null;
  return n;
}

export async function listBudget(weddingId: string): Promise<BudgetRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('budget_items')
    .select('id, wedding_id, category, title, vendor_name, budgeted_cents, actual_cents, paid_cents, due_date, notes')
    .eq('wedding_id', weddingId)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetRow[];
}

export interface BudgetFormState {
  error?: string;
}

function readBudgetForm(formData: FormData) {
  return {
    category: String(formData.get('category') ?? 'General').trim().slice(0, 80) || 'General',
    title: String(formData.get('title') ?? '').trim(),
    vendorName: String(formData.get('vendorName') ?? '').trim().slice(0, 160),
    budgeted: parseCents(String(formData.get('budgeted') ?? '')),
    actual: parseCents(String(formData.get('actual') ?? '')),
    paid: parseCents(String(formData.get('paid') ?? '')),
    dueDate: String(formData.get('dueDate') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim().slice(0, 2000),
  };
}

export async function createBudgetItem(
  weddingId: string,
  _prev: BudgetFormState,
  formData: FormData,
): Promise<BudgetFormState> {
  await requireRole(weddingId, 'planner');
  const v = readBudgetForm(formData);
  if (!v.title) return { error: 'Item title is required.' };
  if (v.budgeted === null || v.actual === null || v.paid === null) {
    return { error: 'Amounts must be whole numbers (cents).' };
  }
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('budget_items').insert({
    wedding_id: weddingId,
    category: v.category,
    title: v.title.slice(0, 200),
    vendor_name: v.vendorName || null,
    budgeted_cents: v.budgeted,
    actual_cents: v.actual,
    paid_cents: v.paid,
    due_date: v.dueDate,
    notes: v.notes,
  });
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/budget`);
}

export async function deleteBudgetItem(weddingId: string, itemId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('budget_items')
    .delete()
    .eq('id', itemId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/budget`);
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export interface VendorRow {
  id: string;
  wedding_id: string;
  name: string;
  category: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  cost_cents: number;
  paid_cents: number;
  due_date: string | null;
  notes: string;
}

export async function listVendors(weddingId: string): Promise<VendorRow[]> {
  await requireRole(weddingId, 'staff');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('vendors')
    .select('id, wedding_id, name, category, contact_name, email, phone, website, cost_cents, paid_cents, due_date, notes')
    .eq('wedding_id', weddingId)
    .order('name');
  if (error) throw new Error(error.message);
  return (data ?? []) as VendorRow[];
}

export interface VendorFormState {
  error?: string;
}

export async function createVendor(
  weddingId: string,
  _prev: VendorFormState,
  formData: FormData,
): Promise<VendorFormState> {
  await requireRole(weddingId, 'planner');
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Vendor name is required.' };
  const email = String(formData.get('email') ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Email address is not valid.' };
  }
  const website = String(formData.get('website') ?? '').trim();
  if (website && !/^https:\/\//i.test(website)) {
    return { error: 'Website must start with https://.' };
  }
  const cost = parseCents(String(formData.get('cost') ?? ''));
  const paid = parseCents(String(formData.get('paid') ?? ''));
  if (cost === null || paid === null) return { error: 'Amounts must be whole numbers (cents).' };

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('vendors').insert({
    wedding_id: weddingId,
    name: name.slice(0, 160),
    category: String(formData.get('category') ?? 'Other').trim().slice(0, 80) || 'Other',
    contact_name: String(formData.get('contactName') ?? '').trim().slice(0, 160) || null,
    email: email || null,
    phone: String(formData.get('phone') ?? '').trim().slice(0, 40) || null,
    website: website || null,
    cost_cents: cost,
    paid_cents: paid,
    due_date: String(formData.get('dueDate') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim().slice(0, 2000),
  });
  if (error) return { error: error.message };
  redirect(`/dashboard/weddings/${weddingId}/vendors`);
}

export async function deleteVendor(weddingId: string, vendorId: string): Promise<void> {
  await requireRole(weddingId, 'planner');
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)
    .eq('wedding_id', weddingId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/weddings/${weddingId}/vendors`);
}
