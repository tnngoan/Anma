'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Service, ServiceCategory } from '@/types/database';

interface ServiceActionsProps {
  service: Service;
  categories: ServiceCategory[];
}

export function ServiceActions({ service, categories }: ServiceActionsProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: service.name,
    description: service.description || '',
    category_id: service.category_id || '',
    duration_minutes: service.duration_minutes,
    buffer_minutes: service.buffer_minutes,
    price: service.price,
    deposit_amount: service.deposit_amount,
    is_active: service.is_active,
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from('services')
      .update({
        ...form,
        category_id: form.category_id || null,
      })
      .eq('id', service.id);
    setLoading(false);
    setShowEdit(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase.from('services').delete().eq('id', service.id);
    setLoading(false);
    setShowDelete(false);
    router.refresh();
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <button
              onClick={() => { setShowMenu(false); setShowEdit(true); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={() => { setShowMenu(false); setShowDelete(true); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Service" size="lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="Service Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Select
            label="Category"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select category"
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
              label="Price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
            <Input
              label="Deposit Amount"
              type="number"
              step="0.01"
              value={form.deposit_amount}
              onChange={(e) => setForm({ ...form, deposit_amount: Number(e.target.value) })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Active</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Save changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={showDelete} onClose={() => setShowDelete(false)} title="Delete Service" size="sm">
        <p className="text-sm text-gray-600">
          Are you sure you want to delete &quot;{service.name}&quot;? This action cannot be undone.
        </p>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={loading}>
            Delete
          </Button>
        </div>
      </Modal>
    </>
  );
}
