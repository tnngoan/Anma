import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotificationRequest {
  type: 'booking_confirmation' | 'booking_reminder' | 'booking_cancellation' | 'shift_assignment';
  booking_id?: string;
  shift_id?: string;
  recipient_email: string;
  recipient_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { type, booking_id, shift_id, recipient_email, recipient_name }: NotificationRequest =
      await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let subject = '';
    let body = '';

    if (type === 'booking_confirmation' && booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('*, booking_services(*, service:services(name))')
        .eq('id', booking_id)
        .single();

      if (booking) {
        const services = (booking.booking_services as Array<{ service: { name: string } }>)
          .map((bs) => bs.service?.name)
          .join(', ');

        subject = `Booking Confirmation - ${booking.booking_number}`;
        body = `
Hi ${recipient_name},

Your appointment has been confirmed!

Booking Reference: ${booking.booking_number}
Date: ${new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
Services: ${services}

We look forward to seeing you!
        `.trim();
      }
    }

    if (type === 'booking_cancellation' && booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_number, start_time')
        .eq('id', booking_id)
        .single();

      if (booking) {
        subject = `Booking Cancelled - ${booking.booking_number}`;
        body = `
Hi ${recipient_name},

Your appointment (${booking.booking_number}) scheduled for ${new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} has been cancelled.

If this was a mistake, please contact us to rebook.
        `.trim();
      }
    }

    if (type === 'booking_reminder' && booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_number, start_time')
        .eq('id', booking_id)
        .single();

      if (booking) {
        subject = `Appointment Reminder - ${booking.booking_number}`;
        body = `
Hi ${recipient_name},

This is a reminder that you have an appointment tomorrow at ${new Date(booking.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}.

Booking Reference: ${booking.booking_number}

We look forward to seeing you!
        `.trim();
      }
    }

    if (type === 'shift_assignment' && shift_id) {
      const { data: shift } = await supabase
        .from('shifts')
        .select('date, start_time, end_time')
        .eq('id', shift_id)
        .single();

      if (shift) {
        subject = 'New Shift Assignment';
        body = `
Hi ${recipient_name},

You have been assigned a new shift:

Date: ${new Date(shift.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${new Date(shift.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${new Date(shift.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        `.trim();
      }
    }

    if (!subject || !body) {
      return new Response(JSON.stringify({ error: 'Could not generate notification' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Send via Resend (or console log in development)
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (resendKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@yourdomain.com',
          to: recipient_email,
          subject,
          text: body,
        }),
      });

      const emailResult = await emailResponse.json();
      return new Response(JSON.stringify({ success: true, email: emailResult }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fallback: log notification
    console.log(`[Notification] To: ${recipient_email}, Subject: ${subject}`);
    return new Response(JSON.stringify({ success: true, mode: 'logged' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
