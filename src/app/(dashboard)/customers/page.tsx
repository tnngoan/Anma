import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CustomerFormModal } from './customer-form-modal';

export default async function CustomersPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from('customer_profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  const customerList = customers || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage customer profiles and history"
        actions={<CustomerFormModal tenantId={tenantId} />}
      />

      <Card>
        <CardContent className="p-0">
          {customerList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No customers yet. Add your first customer.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Visits</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customerList.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <p className="font-medium">{customer.full_name}</p>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {customer.email && <p>{customer.email}</p>}
                        {customer.phone && <p className="text-gray-500">{customer.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell>{customer.total_visits}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(customer.total_spent)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {customer.last_visit_at ? formatDate(customer.last_visit_at) : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(customer.tags || []).map((tag: string) => (
                          <Badge key={tag}>{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge>{customer.source}</Badge>
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
