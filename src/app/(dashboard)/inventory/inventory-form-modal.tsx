'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface InventoryFormModalProps {
  tenantId: string;
}

export function InventoryFormModal({ tenantId }: InventoryFormModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'supply',
    description: '',
    unit_cost: '',
    retail_price: '',
    quantity_on_hand: '0',
    reorder_level: '5',
    reorder_quantity: '20',
    supplier: '',
    is_retail: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    await supabase.from('inventory_items').insert({
      tenant_id: tenantId,
      name: form.name,
      sku: form.sku || null,
      category: form.category,
      description: form.description || null,
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      retail_price: form.retail_price ? Number(form.retail_price) : null,
      quantity_on_hand: Number(form.quantity_on_hand),
      reorder_level: Number(form.reorder_level),
      reorder_quantity: Number(form.reorder_quantity),
      supplier: form.supplier || null,
      is_retail: form.is_retail,
    });

    setLoading(false);
    setOpen(false);
    setForm({ name: '', sku: '', category: 'supply', description: '', unit_cost: '', retail_price: '', quantity_on_hand: '0', reorder_level: '5', reorder_quantity: '20', supplier: '', is_retail: false });
    router.refresh();
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Item
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="New Inventory Item" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Item Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={[
                { value: 'supply', label: 'Supply' },
                { value: 'retail', label: 'Retail Product' },
                { value: 'equipment', label: 'Equipment' },
              ]}
            />
            <Input
              label="Supplier"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </div>
          <Input
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Unit Cost ($)"
              type="number"
              step="0.01"
              value={form.unit_cost}
              onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
            />
            <Input
              label="Retail Price ($)"
              type="number"
              step="0.01"
              value={form.retail_price}
              onChange={(e) => setForm({ ...form, retail_price: e.target.value })}
            />
            <Input
              label="Current Stock"
              type="number"
              value={form.quantity_on_hand}
              onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Reorder Level"
              type="number"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
            />
            <Input
              label="Reorder Quantity"
              type="number"
              value={form.reorder_quantity}
              onChange={(e) => setForm({ ...form, reorder_quantity: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_retail}
              onChange={(e) => setForm({ ...form, is_retail: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Available for retail sale to customers</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Add Item
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
