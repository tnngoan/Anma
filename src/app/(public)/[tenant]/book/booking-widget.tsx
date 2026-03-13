'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Check, Clock, ArrowLeft } from 'lucide-react';
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
}

type Step = 'service' | 'staff' | 'datetime' | 'info' | 'confirmation';

export function BookingWidget({ tenantId, tenantSlug, services, staff }: BookingWidgetProps) {
  const [step, setStep] = useState<Step>('service');
  const [selectedService, setSelectedService] = useState<(typeof services)[0] | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<(typeof staff)[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerInfo, setCustomerInfo] = useState({ name: '', email: '', phone: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [bookingNumber, setBookingNumber] = useState('');

  const handleBook = async () => {
    if (!selectedService) return;
    setLoading(true);

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
      setBookingNumber(bkNumber);
      setStep('confirmation');
    }

    setLoading(false);
  };

  if (step === 'confirmation') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Confirmed!</h2>
          <p className="mt-2 text-gray-600">Your booking reference is:</p>
          <p className="mt-1 text-xl font-mono font-bold text-indigo-600">{bookingNumber}</p>
          <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-sm">
            <p><strong>Service:</strong> {selectedService?.name}</p>
            <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Time:</strong> {selectedTime}</p>
            {selectedStaff && <p><strong>Therapist:</strong> {selectedStaff.display_name}</p>}
            <p><strong>Total:</strong> {formatCurrency(selectedService?.price || 0)}</p>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            A confirmation will be sent to {customerInfo.email}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="flex items-center justify-center gap-2">
        {(['service', 'staff', 'datetime', 'info'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                step === s
                  ? 'bg-indigo-600 text-white'
                  : ['service', 'staff', 'datetime', 'info'].indexOf(step) > i
                  ? 'bg-indigo-100 text-indigo-600'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="h-0.5 w-8 bg-gray-200" />}
          </div>
        ))}
      </div>

      {/* Step: Select Service */}
      {step === 'service' && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Choose a Service</h2>
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
                          <Clock className="h-3.5 w-3.5" /> {service.duration_minutes} min
                        </span>
                        {service.category && <span>{Array.isArray(service.category) ? service.category[0]?.name : service.category.name}</span>}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-indigo-600">
                      {formatCurrency(service.price)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep('staff')} disabled={!selectedService}>
              Continue
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
            <h2 className="text-xl font-bold text-gray-900">Choose a Therapist</h2>
          </div>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedStaff === null ? 'ring-2 ring-indigo-500' : ''
            }`}
          >
            <CardContent className="p-4" onClick={() => setSelectedStaff(null)}>
              <p className="font-semibold text-gray-900">Any Available Therapist</p>
              <p className="text-sm text-gray-500">We&apos;ll assign the best available therapist</p>
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
            <Button onClick={() => setStep('datetime')}>Continue</Button>
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
            <h2 className="text-xl font-bold text-gray-900">Pick Date & Time</h2>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <Input
                label="Date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>
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
              Continue
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
            <h2 className="text-xl font-bold text-gray-900">Your Information</h2>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <Input
                label="Full Name"
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
                label="Phone"
                type="tel"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
              />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={customerInfo.notes}
                  onChange={(e) => setCustomerInfo({ ...customerInfo, notes: e.target.value })}
                  placeholder="Any special requests, allergies, or preferences..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Booking Summary */}
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-indigo-900 mb-2">Booking Summary</h3>
              <div className="space-y-1 text-sm text-indigo-800">
                <p><strong>Service:</strong> {selectedService?.name}</p>
                <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                <p><strong>Time:</strong> {selectedTime}</p>
                <p><strong>Duration:</strong> {selectedService?.duration_minutes} minutes</p>
                {selectedStaff && <p><strong>Therapist:</strong> {selectedStaff.display_name}</p>}
                <p className="text-lg font-bold mt-2">Total: {formatCurrency(selectedService?.price || 0)}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleBook}
              loading={loading}
              disabled={!customerInfo.name || !customerInfo.email}
              size="lg"
            >
              Confirm Booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
