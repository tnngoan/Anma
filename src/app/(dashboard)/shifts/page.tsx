import { createClient } from '@/lib/supabase/server';
import { requireTenant } from '@/lib/tenant';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatTime } from '@/lib/utils';
import { ShiftFormModal } from './shift-form-modal';
import { ShiftTemplateManager } from './shift-template-manager';

export default async function ShiftsPage() {
  const { tenantId } = await requireTenant();
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const weekEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [shiftsResult, templatesResult, staffResult] = await Promise.all([
    supabase
      .from('shifts')
      .select('*, staff:staff_profiles(display_name, color)')
      .eq('tenant_id', tenantId)
      .gte('date', today)
      .lte('date', weekEnd)
      .order('date')
      .order('start_time'),
    supabase
      .from('shift_templates')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('staff_profiles')
      .select('id, display_name')
      .eq('tenant_id', tenantId)
      .eq('is_available', true),
  ]);

  const shifts = shiftsResult.data || [];
  const templates = templatesResult.data || [];
  const staffList = staffResult.data || [];

  // Group shifts by date
  const shiftsByDate = shifts.reduce<Record<string, typeof shifts>>((acc, shift) => {
    const date = shift.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts & Schedules"
        description="Manage staff work schedules"
        actions={
          <div className="flex gap-3">
            <ShiftTemplateManager tenantId={tenantId} templates={templates} />
            <ShiftFormModal tenantId={tenantId} staff={staffList} templates={templates} />
          </div>
        }
      />

      {Object.keys(shiftsByDate).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No shifts scheduled for the next 7 days.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(shiftsByDate).map(([date, dateShifts]) => (
            <Card key={date}>
              <CardHeader>
                <h3 className="font-semibold text-gray-900">
                  {formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-gray-100">
                  {dateShifts.map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: (shift.staff as { color: string })?.color || '#6366f1' }}
                        />
                        <span className="font-medium text-gray-900">
                          {(shift.staff as { display_name: string })?.display_name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </span>
                        <Badge variant={shift.status}>
                          {shift.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
