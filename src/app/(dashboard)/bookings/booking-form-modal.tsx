'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface BookingFormModalProps {
  tenantId: string;
  staff: Array<{ id: string; display_name: string }>;
  services: Array<{ id: string; name: string; duration_minutes: number; price: number }>;
  customers: Array<{ id: string; full_name: string; phone: string | null }>;
}

export function BookingFormModal({ tenantId, staff, services, customers }: BookingFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    staff_id: '',
    service_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    booking_type: 'walk_in' as string,
    notes: '',
  });

  const selectedService = services.find((s) => s.id === form.service_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setLoading(true);
    setError('');

    const supabase = createClient();

    // Calculate end time
    const [hours, minutes] = form.start_time.split(':').map(Number);
    const startDate = new Date(`${form.date}T${form.start_time}:00`);
    const endDate = new Date(startDate.getTime() + selectedService.duration_minutes * 60 * 1000);

    // Generate booking number
    const { data: countData } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('date', form.date);

    const count = (countData as unknown as number) || 0;
    const bookingNumber = `BK-${form.date.replace(/-/g, '')}-${String(count + 1).padStart(3, '0')}`;

    const { error: bookingError, data: booking } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        customer_id: form.customer_id,
        staff_id: form.staff_id || null,
        booking_number: bookingNumber,
        date: form.date,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'confirmed',
        booking_type: form.booking_type,
        subtotal: selectedService.price,
        total_amount: selectedService.price,
        notes: form.notes || null,
        source: 'web',
      })
      .select()
      .single();

    if (bookingError) {
      setError(bookingError.message);
      setLoading(false);
      return;
    }

    // Add booking service
    await supabase.from('booking_services').insert({
      booking_id: booking.id,
      service_id: form.service_id,
      staff_id: form.staff_id || null,
      price: selectedService.price,
      duration_minutes: selectedService.duration_minutes,
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New Booking
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Booking" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            options={customers.map((c) => ({ value: c.id, label: c.full_name }))}
            placeholder="Select customer"
            required
          />
          <Select
            label="Service"
            value={form.service_id}
            onChange={(e) => setForm({ ...form, service_id: e.target.value })}
            options={services.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.duration_minutes}min - $${s.price})`,
            }))}
            placeholder="Select service"
            required
          />
          <Select
            label="Therapist"
            value={form.staff_id}
            onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
            options={staff.map((s) => ({ value: s.id, label: s.display_name }))}
            placeholder="Any available"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
            <Input
              label="Start Time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
            />
          </div>
          <Select
            label="Booking Type"
            value={form.booking_type}
            onChange={(e) => setForm({ ...form, booking_type: e.target.value })}
            options={[
              { value: 'walk_in', label: 'Walk-in' },
              { value: 'phone', label: 'Phone' },
              { value: 'online', label: 'Online' },
            ]}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any special requests or notes"
          />
          {selectedService && (
            <div className="rounded-lg bg-indigo-50 p-3 text-sm">
              <span className="font-medium text-indigo-900">Total: ${selectedService.price}</span>
              <span className="text-indigo-600"> ({selectedService.duration_minutes} min)</span>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Booking
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
