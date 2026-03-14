import { createServiceClient } from '@/lib/supabase/server';
import { verifyReturnUrl, getResponseMessage } from '@/lib/vnpay';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface PageProps {
  searchParams: Promise<Record<string, string>>;
}

export default async function VnpayReturnPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const result = verifyReturnUrl(params);

  let booking = null;
  if (result.isValid && result.bookingId) {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from('bookings')
      .select('booking_number, date, start_time, total_amount, status, tenant_id, tenants:tenant_id(name, slug)')
      .eq('id', result.bookingId)
      .single();
    booking = data;
  }

  const tenantInfo = booking?.tenants as unknown as { name: string; slug: string } | null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm text-center">
        {result.isValid && result.isSuccess ? (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Thanh toan thanh cong!</h1>
            <p className="mt-2 text-gray-600">Payment successful</p>

            {booking && (
              <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-sm space-y-1">
                <p><strong>Ma dat lich:</strong> {booking.booking_number}</p>
                <p><strong>Ngay:</strong> {new Date(booking.date).toLocaleDateString('vi-VN')}</p>
                <p><strong>Gio:</strong> {new Date(booking.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</p>
                <p><strong>So tien:</strong> {formatCurrency(result.amount, 'VND')}</p>
                {result.bankCode && <p><strong>Ngan hang:</strong> {result.bankCode}</p>}
                {result.transactionNo && <p><strong>Ma giao dich:</strong> {result.transactionNo}</p>}
              </div>
            )}

            {tenantInfo?.slug && (
              <Link
                href={`/${tenantInfo.slug}/book`}
                className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Quay lai trang dat lich
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Thanh toan that bai</h1>
            <p className="mt-2 text-gray-600">Payment failed</p>
            <p className="mt-1 text-sm text-gray-500">
              {getResponseMessage(result.responseCode)}
            </p>

            {!result.isValid && (
              <p className="mt-2 text-sm text-red-600">
                Chu ky khong hop le. Vui long thu lai.
              </p>
            )}

            {tenantInfo?.slug && (
              <Link
                href={`/${tenantInfo.slug}/book`}
                className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Thu lai
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
