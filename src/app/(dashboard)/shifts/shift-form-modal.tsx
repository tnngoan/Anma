'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import type { ShiftTemplate } from '@/types/database';

interface ShiftFormModalProps {
  tenantId: string;
  staff: Array<{ id: string; display_name: string }>;
  templates: ShiftTemplate[];
}

export function ShiftFormModal({ tenantId, staff, templates }: ShiftFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    staff_id: '',
    template_id: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
  });

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setForm((prev) => ({
        ...prev,
        template_id: templateId,
        start_time: template.start_time.slice(0, 5),
        end_time: template.end_time.slice(0, 5),
      }));
    } else {
      setForm((prev) => ({ ...prev, template_id: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const startTime = new Date(`${form.date}T${form.start_time}:00`);
    const endTime = new Date(`${form.date}T${form.end_time}:00`);

    await supabase.from('shifts').insert({
      tenant_id: tenantId,
      staff_id: form.staff_id,
      template_id: form.template_id || null,
      date: form.date,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
    });

    setLoading(false);
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Shift
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Create Shift" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Staff Member"
            value={form.staff_id}
            onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
            options={staff.map((s) => ({ value: s.id, label: s.display_name }))}
            placeholder="Select staff member"
            required
          />
          <Select
            label="Template (optional)"
            value={form.template_id}
            onChange={(e) => handleTemplateChange(e.target.value)}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            placeholder="Select template or set custom times"
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Time"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Shift
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
