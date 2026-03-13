import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { InventoryFormModal } from './inventory-form-modal';
import { AlertTriangle } from 'lucide-react';

export default async function InventoryPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from('inventory_items')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  const inventoryItems = items || [];
  const lowStockItems = inventoryItems.filter(
    (item) => item.quantity_on_hand <= item.reorder_level
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track supplies, products, and equipment"
        actions={<InventoryFormModal tenantId={tenantId} />}
      />

      {lowStockItems.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} below reorder level
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge key={item.id} className="bg-amber-100 text-amber-800">
                  {item.name} ({item.quantity_on_hand} left)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {inventoryItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500">No inventory items yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>In Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Retail Price</TableHead>
                  <TableHead>Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryItems.map((item) => {
                  const isLow = item.quantity_on_hand <= item.reorder_level;
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell>
                        <span className={isLow ? 'font-bold text-red-600' : ''}>
                          {item.quantity_on_hand}
                        </span>
                      </TableCell>
                      <TableCell>{item.reorder_level}</TableCell>
                      <TableCell>
                        {item.unit_cost ? formatCurrency(item.unit_cost) : '-'}
                      </TableCell>
                      <TableCell>
                        {item.retail_price ? formatCurrency(item.retail_price) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.is_retail ? 'active' : 'pending'}>
                          {item.is_retail ? 'Retail' : 'Supply'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
