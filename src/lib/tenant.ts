import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { Tenant } from '@/types/database';

const TENANT_COOKIE = 'active_tenant_id';

export async function getActiveTenantId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE)?.value || null;
}

export async function setActiveTenantId(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getActiveTenant(): Promise<Tenant | null> {
  const tenantId = await getActiveTenantId();
  if (!tenantId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  return data;
}

export async function requireTenant(): Promise<{ tenant: Tenant; tenantId: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const { redirect } = await import('next/navigation');
    redirect('/login');
    throw new Error('Not authenticated'); // unreachable, helps TS narrow
  }

  let tenantId = await getActiveTenantId();

  if (!tenantId) {
    // Get the first tenant the user belongs to
    const { data: memberships } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (!memberships?.length) {
      const { redirect } = await import('next/navigation');
      redirect('/onboarding');
      throw new Error('No tenant'); // unreachable, helps TS narrow
    }

    tenantId = memberships[0].tenant_id as string;
    await setActiveTenantId(tenantId);
  }

  const resolvedTenantId = tenantId!;

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', resolvedTenantId)
    .single();

  if (!tenant) {
    const { redirect } = await import('next/navigation');
    redirect('/onboarding');
    throw new Error('No tenant found');
  }

  return { tenant, tenantId: resolvedTenantId };
}
