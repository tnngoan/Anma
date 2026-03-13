'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Booking } from '@/types/database';
import { MoreVertical, CheckCircle, XCircle, LogIn, Play, Ban } from 'lucide-react';

interface BookingActionsProps {
  booking: Booking;
}

export function BookingActions({ booking }: BookingActionsProps) {
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);

  const updateStatus = async (status: string) => {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from('bookings')
      .update({
        status,
        ...(status === 'cancelled' ? {
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancellationReason,
        } : {}),
      })
      .eq('id', booking.id);
    setLoading(false);
    setShowMenu(false);
    setShowCancel(false);
    router.refresh();
  };

  const statusActions: Record<string, Array<{ label: string; status: string; icon: React.ReactNode }>> = {
    pending: [
      { label: 'Confirm', status: 'confirmed', icon: <CheckCircle className="h-3.5 w-3.5" /> },
      { label: 'Cancel', status: 'cancel', icon: <XCircle className="h-3.5 w-3.5" /> },
    ],
    confirmed: [
      { label: 'Check In', status: 'checked_in', icon: <LogIn className="h-3.5 w-3.5" /> },
      { label: 'Cancel', status: 'cancel', icon: <XCircle className="h-3.5 w-3.5" /> },
    ],
    checked_in: [
      { label: 'Start Session', status: 'in_progress', icon: <Play className="h-3.5 w-3.5" /> },
      { label: 'No Show', status: 'no_show', icon: <Ban className="h-3.5 w-3.5" /> },
    ],
    in_progress: [
      { label: 'Complete', status: 'completed', icon: <CheckCircle className="h-3.5 w-3.5" /> },
    ],
  };

  const actions = statusActions[booking.status] || [];

  if (actions.length === 0) return null;

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
          <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => {
                  if (action.status === 'cancel') {
                    setShowMenu(false);
                    setShowCancel(true);
                  } else {
                    updateStatus(action.status);
                  }
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                  action.status === 'cancel' ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Modal open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Booking" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Cancel booking <strong>{booking.booking_number}</strong>?
          </p>
          <textarea
            value={cancellationReason}
            onChange={(e) => setCancellationReason(e.target.value)}
            placeholder="Reason for cancellation (optional)"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            rows={3}
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancel(false)}>
              Keep Booking
            </Button>
            <Button variant="danger" onClick={() => updateStatus('cancelled')} loading={loading}>
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
