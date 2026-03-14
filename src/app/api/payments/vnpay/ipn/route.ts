import { NextRequest, NextResponse } from 'next/server';
import { verifyReturnUrl } from '@/lib/vnpay';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = verifyReturnUrl(params);

  if (!result.isValid) {
    return NextResponse.json({ RspCode: '97', Message: 'Invalid Checksum' });
  }

  const supabase = await createServiceClient();

  // Look up the booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, total_amount, status, tenant_id')
    .eq('id', result.bookingId)
    .single();

  if (!booking) {
    return NextResponse.json({ RspCode: '01', Message: 'Order not found' });
  }

  // Verify amount matches
  if (result.amount !== booking.total_amount) {
    return NextResponse.json({ RspCode: '04', Message: 'Invalid Amount' });
  }

  // Check if already processed
  if (booking.status === 'confirmed') {
    return NextResponse.json({ RspCode: '02', Message: 'Order already confirmed' });
  }

  if (result.isSuccess) {
    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: 'completed',
        stripe_payment_id: result.transactionNo || null, // reuse field for vnpay txn ref
        notes: `VNPay payment - Bank: ${result.bankCode || 'N/A'} - Txn: ${result.transactionNo || 'N/A'}`,
      })
      .eq('booking_id', booking.id)
      .eq('status', 'pending');

    // Confirm the booking
    await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id);
  } else {
    // Payment failed
    await supabase
      .from('payments')
      .update({
        status: 'failed',
        notes: `VNPay payment failed - Code: ${result.responseCode}`,
      })
      .eq('booking_id', booking.id)
      .eq('status', 'pending');
  }

  return NextResponse.json({ RspCode: '00', Message: 'Confirm Success' });
}
