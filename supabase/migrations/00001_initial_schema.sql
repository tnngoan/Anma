-- ============================================================================
-- Migration: Initial Schema for Massage Booking & Shift Management Platform
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 1. TENANTS — The business/clinic
-- ============================================================================
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT UNIQUE NOT NULL,
    owner_user_id   UUID REFERENCES auth.users(id),
    email           TEXT NOT NULL,
    phone           TEXT,
    address_line1   TEXT,
    address_line2   TEXT,
    city            TEXT,
    state           TEXT,
    postal_code     TEXT,
    country         TEXT DEFAULT 'US',
    timezone        TEXT DEFAULT 'America/Los_Angeles',
    currency        TEXT DEFAULT 'USD',
    logo_url        TEXT,
    stripe_account_id TEXT,
    subscription_plan TEXT DEFAULT 'free',
    settings        JSONB DEFAULT '{}',
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. PROFILES — Extends Supabase auth.users
-- ============================================================================
CREATE TABLE public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. TENANT MEMBERS — Links users to tenants with roles
-- ============================================================================
CREATE TABLE tenant_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'masseuse', 'receptionist', 'customer')),
    is_active       BOOLEAN DEFAULT true,
    joined_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, user_id, role)
);

-- ============================================================================
-- 4. STAFF PROFILES — Extended info for staff members
-- ============================================================================
CREATE TABLE staff_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name    TEXT NOT NULL,
    bio             TEXT,
    specializations TEXT[],
    hourly_rate     DECIMAL(10,2),
    commission_pct  DECIMAL(5,2) DEFAULT 0,
    max_daily_hours INTEGER DEFAULT 8,
    is_available    BOOLEAN DEFAULT true,
    color           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, user_id)
);

-- ============================================================================
-- 5. SERVICE CATEGORIES & SERVICES
-- ============================================================================
CREATE TABLE service_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT true
);

CREATE TABLE services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES service_categories(id),
    name            TEXT NOT NULL,
    description     TEXT,
    duration_minutes INTEGER NOT NULL,
    buffer_minutes  INTEGER DEFAULT 10,
    price           DECIMAL(10,2) NOT NULL,
    deposit_amount  DECIMAL(10,2) DEFAULT 0,
    max_per_day     INTEGER,
    requires_room   BOOLEAN DEFAULT true,
    is_active       BOOLEAN DEFAULT true,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE staff_services (
    staff_id        UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    custom_price    DECIMAL(10,2),
    PRIMARY KEY (staff_id, service_id)
);

-- ============================================================================
-- 6. ROOMS — Treatment rooms
-- ============================================================================
CREATE TABLE rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT true,
    sort_order      INTEGER DEFAULT 0
);

-- ============================================================================
-- 7. SHIFT TEMPLATES & SHIFTS
-- ============================================================================
CREATE TABLE shift_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    break_start     TIME,
    break_end       TIME,
    days_of_week    INTEGER[] NOT NULL,
    is_active       BOOLEAN DEFAULT true
);

CREATE TABLE shifts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    template_id     UUID REFERENCES shift_templates(id),
    date            DATE NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    break_start     TIMESTAMPTZ,
    break_end       TIMESTAMPTZ,
    status          TEXT DEFAULT 'scheduled' CHECK (status IN (
                        'scheduled', 'checked_in', 'completed', 'no_show', 'cancelled'
                    )),
    notes           TEXT,
    actual_start    TIMESTAMPTZ,
    actual_end      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE time_off_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    reason          TEXT,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    reviewed_by     UUID REFERENCES auth.users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. CUSTOMER PROFILES — CRM data
-- ============================================================================
CREATE TABLE customer_profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES auth.users(id),
    full_name       TEXT NOT NULL,
    email           TEXT,
    phone           TEXT,
    date_of_birth   DATE,
    gender          TEXT,
    address         TEXT,
    medical_notes   TEXT,
    preferences     JSONB DEFAULT '{}',
    tags            TEXT[],
    loyalty_points  INTEGER DEFAULT 0,
    total_visits    INTEGER DEFAULT 0,
    total_spent     DECIMAL(12,2) DEFAULT 0,
    last_visit_at   TIMESTAMPTZ,
    notes           TEXT,
    source          TEXT DEFAULT 'walk_in',
    referred_by     UUID REFERENCES customer_profiles(id),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, email)
);

-- ============================================================================
-- 9. BOOKINGS
-- ============================================================================
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customer_profiles(id),
    staff_id        UUID REFERENCES staff_profiles(id),
    room_id         UUID REFERENCES rooms(id),
    booking_number  TEXT NOT NULL,
    date            DATE NOT NULL,
    start_time      TIMESTAMPTZ NOT NULL,
    end_time        TIMESTAMPTZ NOT NULL,
    status          TEXT DEFAULT 'pending' CHECK (status IN (
                        'pending', 'confirmed', 'checked_in', 'in_progress',
                        'completed', 'cancelled', 'no_show'
                    )),
    booking_type    TEXT DEFAULT 'online' CHECK (booking_type IN ('online', 'walk_in', 'phone')),
    subtotal        DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount      DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL DEFAULT 0,
    deposit_paid    DECIMAL(10,2) DEFAULT 0,
    notes           TEXT,
    internal_notes  TEXT,
    source          TEXT DEFAULT 'web',
    cancelled_at    TIMESTAMPTZ,
    cancellation_reason TEXT,
    reminder_sent   BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE booking_services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    service_id      UUID NOT NULL REFERENCES services(id),
    staff_id        UUID REFERENCES staff_profiles(id),
    price           DECIMAL(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    sort_order      INTEGER DEFAULT 0
);

-- ============================================================================
-- 10. PAYMENTS & COMMISSIONS
-- ============================================================================
CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id      UUID REFERENCES bookings(id),
    customer_id     UUID REFERENCES customer_profiles(id),
    amount          DECIMAL(10,2) NOT NULL,
    tip_amount      DECIMAL(10,2) DEFAULT 0,
    tax_amount      DECIMAL(10,2) DEFAULT 0,
    total_amount    DECIMAL(10,2) NOT NULL,
    payment_method  TEXT NOT NULL CHECK (payment_method IN (
                        'credit_card', 'debit_card', 'cash', 'digital_wallet',
                        'gift_card', 'membership', 'package'
                    )),
    status          TEXT DEFAULT 'pending' CHECK (status IN (
                        'pending', 'completed', 'failed', 'refunded', 'partially_refunded'
                    )),
    stripe_payment_id TEXT,
    stripe_refund_id  TEXT,
    refund_amount   DECIMAL(10,2) DEFAULT 0,
    refund_reason   TEXT,
    notes           TEXT,
    processed_by    UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE commissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    staff_id        UUID NOT NULL REFERENCES staff_profiles(id),
    booking_id      UUID NOT NULL REFERENCES bookings(id),
    payment_id      UUID REFERENCES payments(id),
    service_amount  DECIMAL(10,2) NOT NULL,
    commission_pct  DECIMAL(5,2) NOT NULL,
    commission_amount DECIMAL(10,2) NOT NULL,
    tip_amount      DECIMAL(10,2) DEFAULT 0,
    status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    paid_at         TIMESTAMPTZ,
    pay_period_start DATE,
    pay_period_end  DATE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 11. MEMBERSHIPS & PACKAGES
-- ============================================================================
CREATE TABLE membership_plans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL CHECK (type IN ('subscription', 'package')),
    price           DECIMAL(10,2) NOT NULL,
    billing_period  TEXT CHECK (billing_period IN ('monthly', 'quarterly', 'yearly')),
    sessions_included INTEGER,
    discount_pct    DECIMAL(5,2) DEFAULT 0,
    services_included UUID[],
    loyalty_multiplier DECIMAL(3,2) DEFAULT 1.0,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customer_memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customer_profiles(id),
    plan_id         UUID NOT NULL REFERENCES membership_plans(id),
    status          TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'cancelled')),
    sessions_remaining INTEGER,
    stripe_subscription_id TEXT,
    start_date      DATE NOT NULL,
    end_date        DATE,
    auto_renew      BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 12. INVENTORY
-- ============================================================================
CREATE TABLE inventory_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    sku             TEXT,
    category        TEXT,
    description     TEXT,
    unit_cost       DECIMAL(10,2),
    retail_price    DECIMAL(10,2),
    quantity_on_hand INTEGER DEFAULT 0,
    reorder_level   INTEGER DEFAULT 5,
    reorder_quantity INTEGER DEFAULT 20,
    supplier        TEXT,
    is_retail       BOOLEAN DEFAULT false,
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    item_id         UUID NOT NULL REFERENCES inventory_items(id),
    type            TEXT NOT NULL CHECK (type IN (
                        'purchase', 'sale', 'usage', 'adjustment', 'return', 'waste'
                    )),
    quantity        INTEGER NOT NULL,
    unit_cost       DECIMAL(10,2),
    total_cost      DECIMAL(10,2),
    reference_id    UUID,
    notes           TEXT,
    performed_by    UUID REFERENCES auth.users(id),
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 13. INDEXES
-- ============================================================================
CREATE INDEX idx_bookings_availability ON bookings (tenant_id, staff_id, date, start_time, end_time)
    WHERE status NOT IN ('cancelled', 'no_show');

CREATE INDEX idx_bookings_date_staff ON bookings (tenant_id, date, staff_id)
    WHERE status NOT IN ('cancelled');

CREATE INDEX idx_shifts_date ON shifts (tenant_id, date, staff_id);

CREATE INDEX idx_payments_date ON payments (tenant_id, created_at);

CREATE INDEX idx_customers_search ON customer_profiles
    USING gin(to_tsvector('english', full_name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));

CREATE INDEX idx_tenant_members_user ON tenant_members (user_id, tenant_id);
CREATE INDEX idx_tenant_members_tenant ON tenant_members (tenant_id, role);
CREATE INDEX idx_staff_profiles_tenant ON staff_profiles (tenant_id);
CREATE INDEX idx_services_tenant ON services (tenant_id, is_active);
CREATE INDEX idx_bookings_customer ON bookings (customer_id);
CREATE INDEX idx_inventory_tenant ON inventory_items (tenant_id, is_active);

-- ============================================================================
-- 14. HELPER FUNCTIONS
-- ============================================================================

-- Get current user's role for a tenant
CREATE OR REPLACE FUNCTION get_user_role(p_tenant_id UUID)
RETURNS TEXT AS $$
    SELECT role FROM tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Get current user's tenant IDs
CREATE OR REPLACE FUNCTION get_user_tenant_ids()
RETURNS SETOF UUID AS $$
    SELECT tenant_id FROM tenant_members
    WHERE user_id = auth.uid()
      AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    today_count INTEGER;
    booking_num TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO today_count
    FROM bookings
    WHERE tenant_id = p_tenant_id AND date = CURRENT_DATE;

    booking_num := 'BK-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(today_count::TEXT, 3, '0');
    RETURN booking_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER tr_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_staff_profiles_updated_at BEFORE UPDATE ON staff_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_services_updated_at BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_shifts_updated_at BEFORE UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_customer_memberships_updated_at BEFORE UPDATE ON customer_memberships FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 15. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE USING (id = auth.uid());

-- Tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their tenant"
    ON tenants FOR SELECT
    USING (id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners can update their tenant"
    ON tenants FOR UPDATE
    USING (owner_user_id = auth.uid());

-- Tenant Members
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view tenant members"
    ON tenant_members FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage members"
    ON tenant_members FOR ALL
    USING (
        get_user_role(tenant_id) IN ('owner', 'manager')
    );

-- Staff Profiles
ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff visible to tenant members"
    ON staff_profiles FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage staff"
    ON staff_profiles FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

-- Services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Services visible to all tenant members"
    ON services FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage services"
    ON services FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

CREATE POLICY "Categories visible to all tenant members"
    ON service_categories FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage categories"
    ON service_categories FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

-- Staff Services
ALTER TABLE staff_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff services visible to tenant"
    ON staff_services FOR SELECT
    USING (
        staff_id IN (
            SELECT id FROM staff_profiles WHERE tenant_id IN (SELECT get_user_tenant_ids())
        )
    );

-- Rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms visible to tenant members"
    ON rooms FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage rooms"
    ON rooms FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

-- Shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shifts visible to tenant members"
    ON shifts FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage shifts"
    ON shifts FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

CREATE POLICY "Shift templates visible to tenant members"
    ON shift_templates FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Owners/managers can manage shift templates"
    ON shift_templates FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

-- Time Off Requests
ALTER TABLE time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own time off"
    ON time_off_requests FOR SELECT
    USING (
        staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
        OR get_user_role(tenant_id) IN ('owner', 'manager')
    );

CREATE POLICY "Staff can create time off requests"
    ON time_off_requests FOR INSERT
    WITH CHECK (
        staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Owners/managers can manage time off"
    ON time_off_requests FOR UPDATE
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

-- Bookings
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tenant bookings"
    ON bookings FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Staff can create bookings"
    ON bookings FOR INSERT
    WITH CHECK (
        get_user_role(tenant_id) IN ('owner', 'manager', 'receptionist', 'masseuse')
    );

CREATE POLICY "Staff can update bookings"
    ON bookings FOR UPDATE
    USING (
        get_user_role(tenant_id) IN ('owner', 'manager', 'receptionist', 'masseuse')
    );

-- Booking Services
ALTER TABLE booking_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking services visible with booking"
    ON booking_services FOR SELECT
    USING (
        booking_id IN (SELECT id FROM bookings WHERE tenant_id IN (SELECT get_user_tenant_ids()))
    );

-- Customer Profiles
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tenant customers"
    ON customer_profiles FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Staff can manage customers"
    ON customer_profiles FOR ALL
    USING (
        get_user_role(tenant_id) IN ('owner', 'manager', 'receptionist')
    );

-- Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view tenant payments"
    ON payments FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Staff can create payments"
    ON payments FOR INSERT
    WITH CHECK (
        get_user_role(tenant_id) IN ('owner', 'manager', 'receptionist')
    );

-- Commissions
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own commissions"
    ON commissions FOR SELECT
    USING (
        staff_id IN (SELECT id FROM staff_profiles WHERE user_id = auth.uid())
        OR get_user_role(tenant_id) IN ('owner', 'manager')
    );

-- Inventory
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory visible to tenant"
    ON inventory_items FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Managers can manage inventory"
    ON inventory_items FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

CREATE POLICY "Inventory txns visible to tenant"
    ON inventory_transactions FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Managers can create inventory txns"
    ON inventory_transactions FOR INSERT
    WITH CHECK (get_user_role(tenant_id) IN ('owner', 'manager'));

-- Memberships
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans visible to tenant"
    ON membership_plans FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Managers can manage plans"
    ON membership_plans FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

CREATE POLICY "Memberships visible to tenant"
    ON customer_memberships FOR SELECT
    USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Managers can manage memberships"
    ON customer_memberships FOR ALL
    USING (get_user_role(tenant_id) IN ('owner', 'manager'));

-- ============================================================================
-- 16. PUBLIC ACCESS POLICIES (for booking pages)
-- ============================================================================

-- Allow public to view active services for a tenant (booking page)
CREATE POLICY "Public can view active services"
    ON services FOR SELECT
    USING (is_active = true);

-- Allow public to view active staff (booking page)
CREATE POLICY "Public can view active staff"
    ON staff_profiles FOR SELECT
    USING (is_available = true);
