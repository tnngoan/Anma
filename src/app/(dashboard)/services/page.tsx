import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { ServiceActions } from './service-actions';
import { ServiceFormModal } from './service-form-modal';

export default async function ServicesPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const [servicesResult, categoriesResult] = await Promise.all([
    supabase
      .from('services')
      .select('*, category:service_categories(name)')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('service_categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true }),
  ]);

  const services = servicesResult.data || [];
  const categories = categoriesResult.data || [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        description="Manage the services your clinic offers"
        actions={<ServiceFormModal tenantId={tenantId} categories={categories} />}
      />

      {services.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No services yet. Add your first service to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    {service.category && (
                      <p className="text-xs text-gray-500">
                        {(service.category as { name: string }).name}
                      </p>
                    )}
                  </div>
                  <ServiceActions service={service} categories={categories} />
                </div>

                {service.description && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">{service.description}</p>
                )}

                <div className="mt-4 flex items-center gap-4">
                  <div className="text-lg font-bold text-indigo-600">
                    {formatCurrency(service.price)}
                  </div>
                  <Badge variant={service.is_active ? 'active' : 'cancelled'}>
                    {service.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span>{service.duration_minutes} min</span>
                  <span>{service.buffer_minutes} min buffer</span>
                  {service.deposit_amount > 0 && (
                    <span>{formatCurrency(service.deposit_amount)} deposit</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
