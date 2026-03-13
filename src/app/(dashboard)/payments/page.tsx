import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/ui/stats-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PaymentFormModal } from './payment-form-modal';
import { DollarSign, CreditCard, Banknote, TrendingUp } from 'lucide-react';

export default async function PaymentsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      booking:bookings(booking_number),
      customer:customer_profiles(full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50);

  const paymentList = payments || [];

  // Calculate stats
  const completed = paymentList.filter((p) => p.status === 'completed');
  const totalRevenue = completed.reduce((sum, p) => sum + Number(p.total_amount), 0);
  const totalTips = completed.reduce((sum, p) => sum + Number(p.tip_amount), 0);
  const avgPayment = completed.length > 0 ? totalRevenue / completed.length : 0;

  const [bookingsResult, customersResult] = await Promise.all([
    supabase.from('bookings').select('id, booking_number').eq('tenant_id', tenantId).eq('status', 'completed').limit(50),
    supabase.from('customer_profiles').select('id, full_name').eq('tenant_id', tenantId).eq('is_active', true).limit(100),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track revenue, process payments, and manage refunds"
        actions={
          <PaymentFormModal
            tenantId={tenantId}
            bookings={bookingsResult.data || []}
            customers={customersResult.data || []}
          />
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign className="h-6 w-6" />} />
        <StatsCard title="Total Tips" value={formatCurrency(totalTips)} icon={<Banknote className="h-6 w-6" />} />
        <StatsCard title="Avg. Payment" value={formatCurrency(avgPayment)} icon={<TrendingUp className="h-6 w-6" />} />
        <StatsCard title="Transactions" value={completed.length} icon={<CreditCard className="h-6 w-6" />} />
      </div>

      <Card>
        <CardContent className="p-0">
          {paymentList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No payment records yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentList.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">{formatDateTime(payment.created_at)}</TableCell>
                    <TableCell>
                      {(payment.customer as { full_name: string })?.full_name || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {(payment.booking as { booking_number: string })?.booking_number || '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.tip_amount > 0 ? formatCurrency(payment.tip_amount) : '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(payment.total_amount)}</TableCell>
                    <TableCell>
                      <Badge>{payment.payment_method.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.status}>{payment.status}</Badge>
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
