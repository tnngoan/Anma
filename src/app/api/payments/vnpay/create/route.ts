import { NextResponse } from 'next/server';
import { createPaymentUrl } from '@/lib/vnpay';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const { bookingId, locale } = await request.json();

  if (!bookingId) {
    return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
  }

  const supabase = await createServiceClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, booking_number, total_amount, status, tenant_id')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'pending') {
    return NextResponse.json({ error: 'Booking is not pending payment' }, { status: 400 });
  }

  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddr = forwarded?.split(',')[0]?.trim() || '127.0.0.1';

  const paymentUrl = createPaymentUrl({
    amount: booking.total_amount,
    bookingId: booking.id,
    bookingNumber: booking.booking_number,
    ipAddr,
    locale: locale || 'vn',
  });

  // Create a pending payment record
  await supabase.from('payments').insert({
    tenant_id: booking.tenant_id,
    booking_id: booking.id,
    amount: booking.total_amount,
    tip_amount: 0,
    tax_amount: 0,
    total_amount: booking.total_amount,
    payment_method: 'credit_card',
    status: 'pending',
    notes: 'VNPay card payment',
  });

  return NextResponse.json({ paymentUrl });
}
