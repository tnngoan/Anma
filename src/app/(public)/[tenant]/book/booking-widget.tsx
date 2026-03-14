'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Check, Clock, ArrowLeft, CreditCard, Building2, Banknote } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface BookingWidgetProps {
  tenantId: string;
  tenantSlug: string;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    category: { name: string } | { name: string }[] | null;
  }>;
  staff: Array<{
    id: string;
    display_name: string;
    bio: string | null;
    specializations: string[];
    color: string | null;
  }>;
  bankQrUrl?: string;
  currency?: string;
}

type Step = 'service' | 'staff' | 'datetime' | 'info' | 'payment' | 'confirmation';
type PaymentChoice = 'vnpay' | 'bank_transfer' | 'cash';

export function BookingWidget({ tenantId, tenantSlug, services, staff, bankQrUrl, currency = 'VND' }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<(typeof services)[0] | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<(typeof staff)[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', notes: '' });
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('vnpay');
  const [loading, setLoading] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');

  const fmt = (amount: number) => formatCurrency(amount, currency);

  const createBooking = async () => {
    if (!selectedService) return null;

    const supabase = createClient();
    const startDate = new Date(`${selectedDate}T${selectedTime}:00`);
    const endDate = new Date(startDate.getTime() + selectedService.duration_minutes * 60 * 1000);

    // Create/find customer
    const { data: existingCustomer } = await supabase
      .from('customer_profiles')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('email', customerInfo.email)
      .single();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer } = await supabase
        .from('customer_profiles')
        .insert({
          tenant_id: tenantId,
          full_name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone || null,
          source: 'website',
        })
        .select('id')
        .single();
      customerId = newCustomer!.id;
    }

    // Generate booking number
    const dateStr = selectedDate.replace(/-/g, '');
    const rand = Math.floor(Math.random() * 900) + 100;
    const bkNumber = `BK-${dateStr}-${rand}`;

    // Create booking
    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        customer_id: customerId,
        staff_id: selectedStaff?.id || null,
        booking_number: bkNumber,
        date: selectedDate,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: 'pending',
        booking_type: 'online',
        subtotal: selectedService.price,
        total_amount: selectedService.price,
        notes: customerInfo.notes || null,
        source: 'web',
      })
      .select()
      .single();

    if (booking) {
      await supabase.from('booking_services').insert({
        booking_id: booking.id,
        service_id: selectedService.id,
        staff_id: selectedStaff?.id || null,
        price: selectedService.price,
        duration_minutes: selectedService.duration_minutes,
      });
    }

    return booking ? { id: booking.id, bookingNumber: bkNumber } : null;
  };

  const handlePayment = async () => {
    setLoading(true);

    const result = await createBooking();
    if (!result) {
      setLoading(false);
      return;
    }

    setBookingNumber(result.bookingNumber);

    if (paymentChoice === 'vnpay') {
      // Redirect to VNPay
      const res = await fetch('/api/payments/vnpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: result.id }),
      });
      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
    }

    // For bank_transfer and cash, go straight to confirmation
    setStep('confirmation');
    setLoading(false);
  };

  if (step === 'confirmation') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Dat lich thanh cong!</h2>
          <p className="mt-1 text-gray-600">Booking confirmed</p>
          <p className="mt-2 text-gray-600">Ma dat lich cua ban:</p>
          <p className="mt-1 text-xl font-mono font-bold text-indigo-600">{bookingNumber}</p>

          {paymentChoice === 'bank_transfer' && bankQrUrl && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Chuyen khoan ngan hang</h3>
              <p className="text-sm text-blue-800 mb-3">
                Vui long chuyen khoan theo ma QR ben duoi va ghi noi dung: <strong>{bookingNumber}</strong>
              </p>
              <img
                src={bankQrUrl}
                alt="Bank QR Code"
                className="mx-auto max-w-[250px] rounded-lg border"
              />
              <p className="mt-2 text-lg font-bold text-blue-900">{fmt(selectedService?.price || 0)}</p>
            </div>
          )}

          {paymentChoice === 'cash' && (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-semibold text-amber-900 mb-1">Thanh toan tai quay</h3>
              <p className="text-sm text-amber-800">
                Vui long thanh toan {fmt(selectedService?.price || 0)} khi den noi.
              </p>
            </div>
          )}

          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-sm">
            <p><strong>Dich vu:</strong> {selectedService?.name}</p>
            <p><strong>Ngay:</strong> {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Gio:</strong> {selectedTime}</p>
            {selectedStaff && <p><strong>Ky thuat vien:</strong> {selectedStaff.display_name}</p>}
            <p><strong>Tong tien:</strong> {fmt(selectedService?.price || 0)}</p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Thong tin xac nhan se duoc gui den {customerInfo.email}
          </p>
        </CardContent>
      </Card>
    );
  }

  const stepsList: Step[] = ['service', 'staff', 'datetime', 'info', 'payment'];

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {stepsList.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : stepsList.indexOf(step) > i
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            {i < stepsList.length - 1 && <div className="h-0.5 w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step: Select Service */}
      {step === 'service' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Chon dich vu</h2>
          <div className="grid gap-3">
            {services.map((service) => (
              <Card
                key={service.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedService?.id === service.id ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <CardContent
                  className="p-4"
                  onClick={() => setSelectedService(service)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{service.name}</h3>
                      {service.description && (
                        <p className="mt-1 text-sm text-gray-500">{service.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" /> {service.duration_minutes} phut
                        </span>
                        {service.category && <span>{Array.isArray(service.category) ? service.category[0]?.name : service.category.name}</span>}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-indigo-600">
                      {fmt(service.price)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep('staff')} disabled={!selectedService}>
              Tiep tuc
            </Button>
          </div>
        </div>
      )}

      {/* Step: Select Staff */}
      {step === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('service')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Chon ky thuat vien</h2>
          </div>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedStaff === null ? 'ring-2 ring-indigo-500' : ''
            }`}
          >
            <CardContent className="p-4" onClick={() => setSelectedStaff(null)}>
              <p className="font-semibold text-gray-900">Bat ky ai co san</p>
              <p className="text-sm text-gray-500">Chung toi se sap xep ky thuat vien phu hop nhat</p>
            </CardContent>
          </Card>

          {staff.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedStaff?.id === s.id ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <CardContent className="p-4" onClick={() => setSelectedStaff(s)}>
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: s.color || '#6366f1' }}
                  >
                    {s.display_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{s.display_name}</p>
                    {s.bio && <p className="text-sm text-gray-500">{s.bio}</p>}
                    {s.specializations.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.specializations.map((spec) => (
                          <span key={spec} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {spec.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={() => setStep('datetime')}>Tiep tuc</Button>
          </div>
        </div>
      )}

      {/* Step: Date & Time */}
      {step === 'datetime' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('staff')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Chon ngay va gio</h2>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <Input
                label="Ngay"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Gio trong</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                      '15:00', '15:30', '16:00', '16:30', '17:00'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                          selectedTime === time
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={() => setStep('info')} disabled={!selectedDate || !selectedTime}>
              Tiep tuc
            </Button>
          </div>
        </div>
      )}

      {/* Step: Customer Info */}
      {step === 'info' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('datetime')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Thong tin cua ban</h2>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <Input
                label="Ho va ten"
                value={customerInfo.name}
                onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={customerInfo.email}
                onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                required
              />
              <Input
                label="So dien thoai"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Ghi chu</label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Yeu cau dac biet, di ung, hay so thich..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => setStep('payment')}
              disabled={!customerInfo.name || !customerInfo.email}
            >
              Tiep tuc
            </Button>
          </div>
        </div>
      )}

      {/* Step: Payment Method */}
      {step === 'payment' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setStep('info')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-bold text-gray-900">Phuong thuc thanh toan</h2>
          </div>

          <div className="grid gap-3">
            {/* VNPay Card Payment */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                paymentChoice === 'vnpay' ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <CardContent className="p-4" onClick={() => setPaymentChoice('vnpay')}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">The ngan hang / Visa / Mastercard</p>
                    <p className="text-sm text-gray-500">Thanh toan qua cong VNPay</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Transfer */}
            {bankQrUrl && (
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  paymentChoice === 'bank_transfer' ? 'ring-2 ring-indigo-500' : ''
                }`}
              >
                <CardContent className="p-4" onClick={() => setPaymentChoice('bank_transfer')}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                      <Building2 className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Chuyen khoan ngan hang</p>
                      <p className="text-sm text-gray-500">Quet ma QR de chuyen khoan</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cash */}
            <Card
              className={`cursor-pointer transition-all hover:shadow-md ${
                paymentChoice === 'cash' ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <CardContent className="p-4" onClick={() => setPaymentChoice('cash')}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                    <Banknote className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Tien mat</p>
                    <p className="text-sm text-gray-500">Thanh toan khi den noi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-indigo-900 mb-2">Tom tat dat lich</h3>
              <div className="space-y-1 text-sm text-indigo-800">
                <p><strong>Dich vu:</strong> {selectedService?.name}</p>
                <p><strong>Ngay:</strong> {new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p><strong>Gio:</strong> {selectedTime}</p>
                <p><strong>Thoi luong:</strong> {selectedService?.duration_minutes} phut</p>
                {selectedStaff && <p><strong>Ky thuat vien:</strong> {selectedStaff.display_name}</p>}
                <p className="text-lg font-bold mt-2">Tong tien: {fmt(selectedService?.price || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handlePayment}
              loading={loading}
              size="lg"
            >
              {paymentChoice === 'vnpay' ? 'Thanh toan ngay' : 'Xac nhan dat lich'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
