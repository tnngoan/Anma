export type Role = 'owner' | 'manager' | 'masseuse' | 'receptionist' | 'customer';

export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type BookingType = 'online' | 'walk_in' | 'phone';
export type ShiftStatus = 'scheduled' | 'checked_in' | 'completed' | 'no_show' | 'cancelled';
export type PaymentMethod = 'credit_card' | 'debit_card' | 'cash' | 'digital_wallet' | 'gift_card' | 'membership' | 'package';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type TimeOffStatus = 'pending' | 'approved' | 'denied';
export type MembershipType = 'subscription' | 'package';
export type MembershipStatus = 'active' | 'paused' | 'expired' | 'cancelled';
export type InventoryTxnType = 'purchase' | 'sale' | 'usage' | 'adjustment' | 'return' | 'waste';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  email: string;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  timezone: string;
  currency: string;
  logo_url: string | null;
  stripe_account_id: string | null;
  subscription_plan: string;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: Role;
  is_active: boolean;
  joined_at: string;
}

export interface StaffProfile {
  id: string;
  tenant_id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  specializations: string[];
  hourly_rate: number | null;
  commission_pct: number;
  max_daily_hours: number;
  is_available: boolean;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Service {
  id: string;
  tenant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  buffer_minutes: number;
  price: number;
  deposit_amount: number;
  max_per_day: number | null;
  requires_room: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: ServiceCategory;
}

export interface Room {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface ShiftTemplate {
  id: string;
  tenant_id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  days_of_week: number[];
  is_active: boolean;
}

export interface Shift {
  id: string;
  tenant_id: string;
  staff_id: string;
  template_id: string | null;
  date: string;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  status: ShiftStatus;
  notes: string | null;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
  updated_at: string;
  staff?: StaffProfile;
}

export interface CustomerProfile {
  id: string;
  tenant_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  medical_notes: string | null;
  preferences: Record<string, unknown>;
  tags: string[];
  loyalty_points: number;
  total_visits: number;
  total_spent: number;
  last_visit_at: string | null;
  notes: string | null;
  source: string;
  referred_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  tenant_id: string;
  customer_id: string;
  staff_id: string | null;
  room_id: string | null;
  booking_number: string;
  date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  booking_type: BookingType;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  deposit_paid: number;
  notes: string | null;
  internal_notes: string | null;
  source: string;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
  customer?: CustomerProfile;
  staff?: StaffProfile;
  room?: Room;
  services?: BookingService[];
}

export interface BookingService {
  id: string;
  booking_id: string;
  service_id: string;
  staff_id: string | null;
  price: number;
  duration_minutes: number;
  sort_order: number;
  service?: Service;
}

export interface Payment {
  id: string;
  tenant_id: string;
  booking_id: string | null;
  customer_id: string | null;
  amount: number;
  tip_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  status: PaymentStatus;
  stripe_payment_id: string | null;
  stripe_refund_id: string | null;
  refund_amount: number;
  refund_reason: string | null;
  notes: string | null;
  processed_by: string | null;
  created_at: string;
  updated_at: string;
  booking?: Booking;
  customer?: CustomerProfile;
}

export interface Commission {
  id: string;
  tenant_id: string;
  staff_id: string;
  booking_id: string;
  payment_id: string | null;
  service_amount: number;
  commission_pct: number;
  commission_amount: number;
  tip_amount: number;
  status: 'pending' | 'approved' | 'paid';
  paid_at: string | null;
  pay_period_start: string | null;
  pay_period_end: string | null;
  created_at: string;
}

export interface MembershipPlan {
  id: string;
  tenant_id: string;
  name: string;
  type: MembershipType;
  price: number;
  billing_period: string | null;
  sessions_included: number | null;
  discount_pct: number;
  services_included: string[];
  loyalty_multiplier: number;
  is_active: boolean;
  created_at: string;
}

export interface CustomerMembership {
  id: string;
  tenant_id: string;
  customer_id: string;
  plan_id: string;
  status: MembershipStatus;
  sessions_remaining: number | null;
  stripe_subscription_id: string | null;
  start_date: string;
  end_date: string | null;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
  plan?: MembershipPlan;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  unit_cost: number | null;
  retail_price: number | null;
  quantity_on_hand: number;
  reorder_level: number;
  reorder_quantity: number;
  supplier: string | null;
  is_retail: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  tenant_id: string;
  item_id: string;
  type: InventoryTxnType;
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  item?: InventoryItem;
}

export interface TimeOffRequest {
  id: string;
  tenant_id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  status: TimeOffStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  staff?: StaffProfile;
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  staff_id: string;
  staff_name: string;
  room_id: string;
  room_name: string;
}
