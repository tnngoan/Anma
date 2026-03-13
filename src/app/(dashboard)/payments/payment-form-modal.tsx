'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface PaymentFormModalProps {
  tenantId: string;
  bookings: Array<{ id: string; booking_number: string }>;
  customers: Array<{ id: string; full_name: string }>;
}

export function PaymentFormModal({ tenantId, bookings, customers }: PaymentFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    booking_id: '',
    customer_id: '',
    amount: '',
    tip_amount: '0',
    tax_amount: '0',
    payment_method: 'credit_card',
    notes: '',
  });

  const total = Number(form.amount) + Number(form.tip_amount) + Number(form.tax_amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    await supabase.from('payments').insert({
      tenant_id: tenantId,
      booking_id: form.booking_id || null,
      customer_id: form.customer_id || null,
      amount: Number(form.amount),
      tip_amount: Number(form.tip_amount),
      tax_amount: Number(form.tax_amount),
      total_amount: total,
      payment_method: form.payment_method,
      status: 'completed',
      notes: form.notes || null,
    });

    setLoading(false);
    setOpen(false);
    setForm({ booking_id: '', customer_id: '', amount: '', tip_amount: '0', tax_amount: '0', payment_method: 'credit_card', notes: '' });
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Record Payment
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record Payment" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Customer"
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
            options={customers.map((c) => ({ value: c.id, label: c.full_name }))}
            placeholder="Select customer"
          />
          <Select
            label="Booking"
            value={form.booking_id}
            onChange={(e) => setForm({ ...form, booking_id: e.target.value })}
            options={bookings.map((b) => ({ value: b.id, label: b.booking_number }))}
            placeholder="Select booking (optional)"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <Input
              label="Tip ($)"
              type="number"
              step="0.01"
              value={form.tip_amount}
              onChange={(e) => setForm({ ...form, tip_amount: e.target.value })}
            />
            <Input
              label="Tax ($)"
              type="number"
              step="0.01"
              value={form.tax_amount}
              onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
            />
          </div>
          <Select
            label="Payment Method"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            options={[
              { value: 'credit_card', label: 'Credit Card' },
              { value: 'debit_card', label: 'Debit Card' },
              { value: 'cash', label: 'Cash' },
              { value: 'digital_wallet', label: 'Digital Wallet' },
              { value: 'gift_card', label: 'Gift Card' },
            ]}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {Number(form.amount) > 0 && (
            <div className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-800">
              Total: ${total.toFixed(2)}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
