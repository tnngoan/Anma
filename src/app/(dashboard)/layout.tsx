import { requireUser } from '@/lib/auth';
import { requireTenant } from '@/lib/tenant';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import type { Role } from '@/types/database';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const { tenant, tenantId } = await requireTenant();

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const userRole = (membership?.role || 'customer') as Role;
  const userName = profile?.full_name || user.email || 'User';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        tenantName={tenant.name}
        userName={userName}
        userRole={userRole}
      />
      <main className="lg:pl-64">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
