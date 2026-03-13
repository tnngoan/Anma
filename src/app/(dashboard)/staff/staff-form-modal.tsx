'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const SPECIALIZATIONS = [
  'swedish', 'deep_tissue', 'hot_stone', 'sports', 'prenatal',
  'aromatherapy', 'reflexology', 'shiatsu', 'thai', 'trigger_point',
];

interface StaffFormModalProps {
  tenantId: string;
}

export function StaffFormModal({ tenantId }: StaffFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    display_name: '',
    bio: '',
    hourly_rate: '',
    commission_pct: '0',
    specializations: [] as string[],
    color: '#6366f1',
  });

  const toggleSpec = (spec: string) => {
    setForm((prev) => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter((s) => s !== spec)
        : [...prev.specializations, spec],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();

    // Look up user by email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', form.email)
      .limit(1);

    if (!profiles?.length) {
      setError('No user found with that email. They must sign up first.');
      setLoading(false);
      return;
    }

    const userId = profiles[0].id;

    // Create staff profile
    const { error: staffError } = await supabase.from('staff_profiles').insert({
      tenant_id: tenantId,
      user_id: userId,
      display_name: form.display_name,
      bio: form.bio || null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      commission_pct: Number(form.commission_pct),
      specializations: form.specializations,
      color: form.color,
    });

    if (staffError) {
      setError(staffError.message);
      setLoading(false);
      return;
    }

    // Add as tenant member with masseuse role
    await supabase.from('tenant_members').insert({
      tenant_id: tenantId,
      user_id: userId,
      role: 'masseuse',
    });

    setLoading(false);
    setOpen(false);
    setForm({ email: '', display_name: '', bio: '', hourly_rate: '', commission_pct: '0', specializations: [], color: '#6366f1' });
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Staff
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add Staff Member" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}
          <Input
            label="User Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="staff@clinic.com"
            required
          />
          <Input
            label="Display Name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="How they appear on booking pages"
            required
          />
          <Input
            label="Bio"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Brief bio for the booking page"
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Hourly Rate ($)"
              type="number"
              step="0.01"
              value={form.hourly_rate}
              onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
            />
            <Input
              label="Commission %"
              type="number"
              step="0.01"
              value={form.commission_pct}
              onChange={(e) => setForm({ ...form, commission_pct: e.target.value })}
            />
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Calendar Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="h-9 w-full rounded-lg border border-gray-300 p-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Specializations</label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpec(spec)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    form.specializations.includes(spec)
                      ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {spec.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Staff
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
