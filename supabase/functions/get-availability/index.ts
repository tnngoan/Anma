import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface AvailabilityRequest {
  tenant_id: string;
  date: string;
  service_id: string;
  staff_id?: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  staff_id: string;
  staff_name: string;
  room_id: string;
  room_name: string;
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
    const { tenant_id, date, service_id, staff_id }: AvailabilityRequest = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get service details
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes, buffer_minutes')
      .eq('id', service_id)
      .single();

    if (!service) {
      return new Response(JSON.stringify({ error: 'Service not found' }), { status: 404 });
    }

    const totalDuration = service.duration_minutes + service.buffer_minutes;

    // 2. Get staff who can perform this service
    let staffQuery = supabase
      .from('staff_services')
      .select('staff_id, staff:staff_profiles(id, display_name)')
      .eq('service_id', service_id);

    if (staff_id) {
      staffQuery = staffQuery.eq('staff_id', staff_id);
    }

    const { data: staffServices } = await staffQuery;
    const staffIds = (staffServices || []).map((ss: { staff_id: string }) => ss.staff_id);

    if (staffIds.length === 0) {
      // Fallback: all available staff
      const { data: allStaff } = await supabase
        .from('staff_profiles')
        .select('id, display_name')
        .eq('tenant_id', tenant_id)
        .eq('is_available', true);

      if (!allStaff?.length) {
        return new Response(JSON.stringify({ slots: [] }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      staffIds.push(...allStaff.map((s: { id: string }) => s.id));
    }

    // 3. Get shifts for the requested date
    const { data: shifts } = await supabase
      .from('shifts')
      .select('staff_id, start_time, end_time, break_start, break_end')
      .eq('tenant_id', tenant_id)
      .eq('date', date)
      .in('staff_id', staffIds)
      .in('status', ['scheduled', 'checked_in']);

    // 4. Get existing bookings for those staff on that date
    const { data: bookings } = await supabase
      .from('bookings')
      .select('staff_id, start_time, end_time')
      .eq('tenant_id', tenant_id)
      .eq('date', date)
      .in('staff_id', staffIds)
      .not('status', 'in', '("cancelled","no_show")');

    // 5. Get available rooms
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, name')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true);

    // 6. Get room bookings
    const roomIds = (rooms || []).map((r: { id: string }) => r.id);
    const { data: roomBookings } = await supabase
      .from('bookings')
      .select('room_id, start_time, end_time')
      .eq('tenant_id', tenant_id)
      .eq('date', date)
      .in('room_id', roomIds)
      .not('status', 'in', '("cancelled","no_show")');

    // 7. Calculate available slots
    const slots: TimeSlot[] = [];
    const slotInterval = 30; // minutes

    // Get staff display names
    const { data: staffProfiles } = await supabase
      .from('staff_profiles')
      .select('id, display_name')
      .in('id', staffIds);

    const staffNameMap = new Map(
      (staffProfiles || []).map((s: { id: string; display_name: string }) => [s.id, s.display_name])
    );

    for (const shift of shifts || []) {
      const shiftStart = new Date(shift.start_time);
      const shiftEnd = new Date(shift.end_time);

      // Generate potential slots every 30 minutes within the shift
      let slotStart = new Date(shiftStart);
      while (slotStart.getTime() + totalDuration * 60000 <= shiftEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

        // Check if slot overlaps with break
        if (shift.break_start && shift.break_end) {
          const breakStart = new Date(shift.break_start);
          const breakEnd = new Date(shift.break_end);
          if (slotStart < breakEnd && slotEnd > breakStart) {
            slotStart = new Date(slotStart.getTime() + slotInterval * 60000);
            continue;
          }
        }

        // Check if slot conflicts with existing bookings for this staff
        const hasConflict = (bookings || []).some(
          (b: { staff_id: string; start_time: string; end_time: string }) =>
            b.staff_id === shift.staff_id &&
            new Date(b.start_time) < slotEnd &&
            new Date(b.end_time) > slotStart
        );

        if (!hasConflict) {
          // Find an available room
          const availableRoom = (rooms || []).find((room: { id: string }) => {
            const roomConflict = (roomBookings || []).some(
              (rb: { room_id: string; start_time: string; end_time: string }) =>
                rb.room_id === room.id &&
                new Date(rb.start_time) < slotEnd &&
                new Date(rb.end_time) > slotStart
            );
            return !roomConflict;
          });

          if (availableRoom || !(rooms || []).length) {
            slots.push({
              start_time: slotStart.toISOString(),
              end_time: slotEnd.toISOString(),
              staff_id: shift.staff_id,
              staff_name: staffNameMap.get(shift.staff_id) || 'Unknown',
              room_id: availableRoom?.id || '',
              room_name: availableRoom?.name || '',
            });
          }
        }

        slotStart = new Date(slotStart.getTime() + slotInterval * 60000);
      }
    }

    // Sort by time
    slots.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return new Response(JSON.stringify({ slots }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
