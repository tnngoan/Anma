import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Role, TenantMember } from '@/types/database';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

export async function getUserTenantMemberships(userId: string): Promise<TenantMember[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tenant_members')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  return data || [];
}

export async function getUserRole(tenantId: string): Promise<Role | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  return data?.role as Role | null;
}

export async function requireRole(tenantId: string, allowedRoles: Role[]) {
  const role = await getUserRole(tenantId);
  if (!role || !allowedRoles.includes(role)) {
    redirect('/dashboard?error=unauthorized');
  }
  return role;
}

export function canManageStaff(role: Role): boolean {
  return ['owner', 'manager'].includes(role);
}

export function canManageServices(role: Role): boolean {
  return ['owner', 'manager'].includes(role);
}

export function canManageBookings(role: Role): boolean {
  return ['owner', 'manager', 'receptionist', 'masseuse'].includes(role);
}

export function canManageInventory(role: Role): boolean {
  return ['owner', 'manager'].includes(role);
}

export function canManagePayments(role: Role): boolean {
  return ['owner', 'manager', 'receptionist'].includes(role);
}

export function canViewReports(role: Role): boolean {
  return ['owner', 'manager'].includes(role);
}
