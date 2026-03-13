'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { ServiceCategory } from '@/types/database';

interface ServiceFormModalProps {
  tenantId: string;
  categories: ServiceCategory[];
}

export function ServiceFormModal({ tenantId, categories }: ServiceFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    category_id: '',
    duration_minutes: 60,
    buffer_minutes: 10,
    price: 0,
    deposit_amount: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('services').insert({
      tenant_id: tenantId,
      name: form.name,
      description: form.description || null,
      category_id: form.category_id || null,
      duration_minutes: form.duration_minutes,
      buffer_minutes: form.buffer_minutes,
      price: form.price,
      deposit_amount: form.deposit_amount,
    });
    setLoading(false);
    setOpen(false);
    setForm({ name: '', description: '', category_id: '', duration_minutes: 60, buffer_minutes: 10, price: 0, deposit_amount: 0 });
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Service
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Service" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Service Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Swedish Massage"
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the service"
          />
          <Select
            label="Category"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select category (optional)"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Duration (minutes)"
              type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              required
            />
            <Input
              label="Buffer (minutes)"
              type="number"
              value={form.buffer_minutes}
              onChange={(e) => setForm({ ...form, buffer_minutes: Number(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price ($)"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
            <Input
              label="Deposit Amount ($)"
              type="number"
              step="0.01"
              value={form.deposit_amount}
              onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Service
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
