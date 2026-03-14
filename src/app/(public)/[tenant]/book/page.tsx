import { createServiceClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { BookingWidget } from './booking-widget';

interface BookingPageProps {
  params: Promise<{ tenant: string }>;
}

export async function generateMetadata({ params }: BookingPageProps) {
  const { tenant: slug } = await params;
  const supabase = await createServiceClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  return {
    title: tenant ? `Book an Appointment - ${tenant.name}` : 'Book an Appointment',
    description: tenant ? `Book a massage appointment at ${tenant.name}` : undefined,
  };
}

export default async function PublicBookingPage({ params }: BookingPageProps) {
  const { tenant: slug } = await params;
  const supabase = await createServiceClient();

  // Fetch tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (!tenant) notFound();

  // Fetch services and staff
  const [servicesResult, staffResult] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, duration_minutes, price, category:service_categories(name)')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('staff_profiles')
      .select('id, display_name, bio, specializations, color')
      .eq('tenant_id', tenant.id)
      .eq('is_available', true),
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <div className="flex items-center gap-4">
            {tenant.logo_url && (
              <img src={tenant.logo_url} alt={tenant.name} className="h-12 w-12 rounded-full" />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
              <p className="text-sm text-gray-500">Book your appointment online</p>
            </div>
          </div>
        </div>
      </header>

      {/* Booking Widget */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <BookingWidget
          tenantId={tenant.id}
          tenantSlug={slug}
          services={servicesResult.data || []}
          staff={staffResult.data || []}
          bankQrUrl={(tenant.settings as Record<string, unknown>)?.bank_qr_url as string | undefined}
          currency={tenant.currency || 'VND'}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
        <div className="mx-auto max-w-3xl px-4">
          {tenant.address_line1 && (
            <p>
              {tenant.address_line1}
              {tenant.city && `, ${tenant.city}`}
              {tenant.state && `, ${tenant.state}`}
              {tenant.postal_code && ` ${tenant.postal_code}`}
            </p>
          )}
          {tenant.phone && <p className="mt-1">{tenant.phone}</p>}
        </div>
      </footer>
    </div>
  );
}
