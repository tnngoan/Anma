import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { StaffFormModal } from './staff-form-modal';

export default async function StaffPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('*, profile:profiles(email, full_name)')
    .eq('tenant_id', tenantId)
    .order('display_name');

  const staffList = staff || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff"
        description="Manage your therapists and staff members"
        actions={<StaffFormModal tenantId={tenantId} />}
      />

      <Card>
        <CardContent className="p-0">
          {staffList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No staff members yet. Add your first team member.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Specializations</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffList.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: member.color || '#6366f1' }}
                        >
                          {member.display_name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{member.display_name}</p>
                          <p className="text-xs text-gray-500">
                            {(member.profile as { email: string })?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(member.specializations || []).map((spec: string) => (
                          <Badge key={spec} className="text-xs">
                            {spec.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {member.hourly_rate ? formatCurrency(member.hourly_rate) + '/hr' : '-'}
                    </TableCell>
                    <TableCell>{member.commission_pct}%</TableCell>
                    <TableCell>
                      <Badge variant={member.is_available ? 'active' : 'cancelled'}>
                        {member.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
