import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatsCard } from '@/components/ui/stats-card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Users, Calendar, TrendingUp } from 'lucide-react';

export default async function ReportsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  const [
    monthlyPayments,
    lastMonthPayments,
    monthlyBookings,
    totalCustomers,
    staffPerformance,
    serviceBreakdown,
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('total_amount, tip_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', startOfMonth),
    supabase
      .from('payments')
      .select('total_amount')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('created_at', startOfLastMonth)
      .lte('created_at', endOfLastMonth),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('date', startOfMonth.split('T')[0])
      .not('status', 'in', '("cancelled","no_show")'),
    supabase
      .from('customer_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('commissions')
      .select('staff_id, commission_amount, tip_amount, staff:staff_profiles(display_name)')
      .eq('tenant_id', tenantId)
      .gte('created_at', startOfMonth),
    supabase
      .from('booking_services')
      .select('price, duration_minutes, service:services(name)')
      .in('booking_id',
        (await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', tenantId)
          .gte('date', startOfMonth.split('T')[0])
          .not('status', 'in', '("cancelled","no_show")')
        ).data?.map(b => b.id) || []
      ),
  ]);

  const currentRevenue = (monthlyPayments.data || []).reduce((s, p) => s + Number(p.total_amount), 0);
  const currentTips = (monthlyPayments.data || []).reduce((s, p) => s + Number(p.tip_amount), 0);
  const lastRevenue = (lastMonthPayments.data || []).reduce((s, p) => s + Number(p.total_amount), 0);
  const revenueChange = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue * 100).toFixed(1) : '0';

  // Aggregate staff performance
  const staffMap = new Map<string, { name: string; commission: number; tips: number; count: number }>();
  (staffPerformance.data || []).forEach((c) => {
    const name = (c.staff as unknown as { display_name: string })?.display_name || 'Unknown';
    const existing = staffMap.get(c.staff_id) || { name, commission: 0, tips: 0, count: 0 };
    existing.commission += Number(c.commission_amount);
    existing.tips += Number(c.tip_amount);
    existing.count += 1;
    staffMap.set(c.staff_id, existing);
  });

  // Aggregate service breakdown
  const serviceMap = new Map<string, { name: string; revenue: number; count: number; totalMinutes: number }>();
  (serviceBreakdown.data || []).forEach((bs) => {
    const name = (bs.service as unknown as { name: string })?.name || 'Unknown';
    const existing = serviceMap.get(name) || { name, revenue: 0, count: 0, totalMinutes: 0 };
    existing.revenue += Number(bs.price);
    existing.count += 1;
    existing.totalMinutes += bs.duration_minutes;
    serviceMap.set(name, existing);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Business insights and performance metrics"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(currentRevenue)}
          change={`${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}% vs last month`}
          changeType={Number(revenueChange) >= 0 ? 'positive' : 'negative'}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatsCard
          title="Monthly Tips"
          value={formatCurrency(currentTips)}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatsCard
          title="Monthly Bookings"
          value={monthlyBookings.count || 0}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatsCard
          title="Total Customers"
          value={totalCustomers.count || 0}
          icon={<Users className="h-6 w-6" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Staff Performance */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Staff Performance (This Month)</h2>
          </CardHeader>
          <CardContent className="p-0">
            {staffMap.size === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-500">No commission data this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Tips</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(staffMap.values())
                    .sort((a, b) => b.commission - a.commission)
                    .map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.count}</TableCell>
                        <TableCell>{formatCurrency(s.commission)}</TableCell>
                        <TableCell>{formatCurrency(s.tips)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Service Breakdown */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">Service Breakdown (This Month)</h2>
          </CardHeader>
          <CardContent className="p-0">
            {serviceMap.size === 0 ? (
              <p className="px-6 py-4 text-sm text-gray-500">No service data this month.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from(serviceMap.values())
                    .sort((a, b) => b.revenue - a.revenue)
                    .map((s) => (
                      <TableRow key={s.name}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.count}</TableCell>
                        <TableCell>{formatCurrency(s.revenue)}</TableCell>
                        <TableCell>{(s.totalMinutes / 60).toFixed(1)}h</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
