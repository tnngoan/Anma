import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { StatsCard } from '@/components/ui/stats-card';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatTime } from '@/lib/utils';
import { Calendar, Users, DollarSign, Clock } from 'lucide-react';

export default async function DashboardPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch dashboard stats in parallel
  const [bookingsResult, customersResult, revenueResult, staffResult, todayBookingsResult] =
    await Promise.all([
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .not('status', 'in', '("cancelled","no_show")'),
      supabase
        .from('customer_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true),
      supabase
        .from('payments')
        .select('total_amount')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      supabase
        .from('staff_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_available', true),
      supabase
        .from('bookings')
        .select('*, customer:customer_profiles(full_name), staff:staff_profiles(display_name)')
        .eq('tenant_id', tenantId)
        .eq('date', today)
        .not('status', 'in', '("cancelled","no_show")')
        .order('start_time', { ascending: true })
        .limit(10),
    ]);

  const todayBookings = bookingsResult.count || 0;
  const totalCustomers = customersResult.count || 0;
  const monthlyRevenue = (revenueResult.data || []).reduce(
    (sum, p) => sum + Number(p.total_amount),
    0
  );
  const activeStaff = staffResult.count || 0;
  const upcomingBookings = todayBookingsResult.data || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Today's Bookings"
          value={todayBookings}
          icon={<Calendar className="h-6 w-6" />}
        />
        <StatsCard
          title="Total Customers"
          value={totalCustomers}
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          title="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatsCard
          title="Active Staff"
          value={activeStaff}
          icon={<Clock className="h-6 w-6" />}
        />
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Schedule</h2>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No bookings scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">
                        {formatTime(booking.start_time)}
                      </span>
                      <span className="text-gray-400"> - </span>
                      <span className="text-gray-600">{formatTime(booking.end_time)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {(booking.customer as { full_name: string })?.full_name || 'Walk-in'}
                      </p>
                      <p className="text-xs text-gray-500">
                        with {(booking.staff as { display_name: string })?.display_name || 'Any therapist'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(booking.total_amount)}
                    </span>
                    <Badge variant={booking.status}>{booking.status.replace('_', ' ')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
