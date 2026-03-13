import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { BookingFormModal } from './booking-form-modal';
import { BookingActions } from './booking-actions';

export default async function BookingsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      *,
      customer:customer_profiles(full_name, phone),
      staff:staff_profiles(display_name),
      booking_services(*, service:services(name))
    `)
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: true })
    .limit(50);

  const [staffResult, servicesResult, customersResult] = await Promise.all([
    supabase.from('staff_profiles').select('id, display_name').eq('tenant_id', tenantId).eq('is_available', true),
    supabase.from('services').select('id, name, duration_minutes, price').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('customer_profiles').select('id, full_name, phone').eq('tenant_id', tenantId).eq('is_active', true).limit(100),
  ]);

  const bookingList = bookings || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Manage appointments and reservations"
        actions={
          <BookingFormModal
            tenantId={tenantId}
            staff={staffResult.data || []}
            services={servicesResult.data || []}
            customers={customersResult.data || []}
          />
        }
      />

      <Card>
        <CardContent className="p-0">
          {bookingList.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No bookings yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking #</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Therapist</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingList.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-mono text-xs">{booking.booking_number}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="font-medium">{formatDate(booking.date)}</p>
                        <p className="text-gray-500">
                          {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(booking.customer as { full_name: string })?.full_name || 'Walk-in'}
                    </TableCell>
                    <TableCell>
                      {(booking.staff as { display_name: string })?.display_name || 'Any'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        {(booking.booking_services as Array<{ service: { name: string } }>)?.map(
                          (bs, i) => (
                            <p key={i} className="text-xs text-gray-600">
                              {bs.service?.name}
                            </p>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(booking.total_amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={booking.status}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <BookingActions booking={booking} />
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
