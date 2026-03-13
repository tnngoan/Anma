'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';
import type { ShiftTemplate } from '@/types/database';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface ShiftTemplateManagerProps {
  tenantId: string;
  templates: ShiftTemplate[];
}

export function ShiftTemplateManager({ tenantId, templates }: ShiftTemplateManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    start_time: '09:00',
    end_time: '17:00',
    break_start: '12:00',
    break_end: '13:00',
    days_of_week: [1, 2, 3, 4, 5] as number[],
  });

  const toggleDay = (day: number) => {
    setForm((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.from('shift_templates').insert({
      tenant_id: tenantId,
      name: form.name,
      start_time: form.start_time,
      end_time: form.end_time,
      break_start: form.break_start || null,
      break_end: form.break_end || null,
      days_of_week: form.days_of_week,
    });
    setLoading(false);
    setOpen(false);
    setForm({ name: '', start_time: '09:00', end_time: '17:00', break_start: '12:00', break_end: '13:00', days_of_week: [1, 2, 3, 4, 5] });
    router.refresh();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings className="h-4 w-4" /> Templates
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Shift Templates" size="lg">
        {/* Existing templates */}
        {templates.length > 0 && (
          <div className="mb-6 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">Existing Templates</h3>
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3 text-sm">
                <span className="font-medium">{t.name}</span>
                <span className="text-gray-500">
                  {t.start_time.slice(0, 5)} - {t.end_time.slice(0, 5)} |{' '}
                  {t.days_of_week.map((d) => DAYS[d - 1]).join(', ')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* New template form */}
        <h3 className="mb-3 text-sm font-medium text-gray-700">Create New Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Template Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='e.g., "Morning Shift"'
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Break Start"
              type="time"
              value={form.break_start}
              onChange={(e) => setForm({ ...form, break_start: e.target.value })}
            />
            <Input
              label="Break End"
              type="time"
              value={form.break_end}
              onChange={(e) => setForm({ ...form, break_end: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Days of Week</label>
            <div className="flex gap-2">
              {DAYS.map((day, i) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i + 1)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.days_of_week.includes(i + 1)
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button type="submit" loading={loading}>
              Create Template
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
