-- ====================================================================
-- ST. FRANCIS OF ASSISI CHURCH CONSTRUCTION MANAGEMENT SYSTEM
-- SECURE DATABASE SCHEMA & RLS OVERHAUL
-- ====================================================================

-- DROP EXISTING TABLES TO PREVENT TYPE MISMATCHES (Data-safe: non-profiles tables have 0 rows, profiles will auto-sync)
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.construction_phases CASCADE;
DROP TABLE IF EXISTS public.contributions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.fundraising_events CASCADE;
DROP TABLE IF EXISTS public.phase_updates CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.receipts CASCADE;
DROP TABLE IF EXISTS public.phase_photos CASCADE;
DROP TABLE IF EXISTS public.procurements CASCADE;
DROP TABLE IF EXISTS public.daily_verses CASCADE;
DROP TABLE IF EXISTS public.boq_line_items CASCADE;
DROP TABLE IF EXISTS public.pledges CASCADE;
DROP TABLE IF EXISTS public.member_feedback CASCADE;
DROP TABLE IF EXISTS public.building_committee CASCADE;
DROP TABLE IF EXISTS public.payment_details CASCADE;

-- 1. Profiles Table (Auth Users mapping)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'treasurer', 'coordinator')),
    phone TEXT CHECK (phone IS NULL OR phone = '' OR phone ~ '^\+?[0-9]{7,15}$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ====================================================================
-- ZERO-TRUST ROLE VERIFICATION FUNCTION (SECURITY DEFINER)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.check_user_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Construction Phases Table
CREATE TABLE IF NOT EXISTS public.construction_phases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    budget NUMERIC NOT NULL CHECK (budget >= 0),
    amount_collected NUMERIC DEFAULT 0 CHECK (amount_collected >= 0),
    amount_spent NUMERIC DEFAULT 0 CHECK (amount_spent >= 0),
    status TEXT DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'On Hold')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    contractor_name TEXT,
    contractor_email TEXT,
    engineer_name TEXT,
    required_materials TEXT,
    completion_date DATE,
    site_photos TEXT[] DEFAULT '{}',
    milestones JSONB DEFAULT '[]',
    updates JSONB DEFAULT '[]'
);

-- 3. Contributions Table
CREATE TABLE IF NOT EXISTS public.contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    purpose_type TEXT NOT NULL,
    purpose_name TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('Mobile Money', 'Bank Transfer', 'Cash')),
    reference TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    receipt_id TEXT,
    receipt_qr_code TEXT,
    signature TEXT,
    screenshot_url TEXT
);

-- Create Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
    id TEXT PRIMARY KEY,
    phase_id TEXT NOT NULL REFERENCES public.construction_phases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'Pending_Approval' CHECK (status IN ('Approved', 'Pending_Approval', 'Rejected')),
    submitted_by TEXT,
    approved_by TEXT,
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Select policy: authenticated users can read expenses
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
CREATE POLICY "expenses_select_policy" ON public.expenses FOR SELECT
    USING (auth.role() = 'authenticated');

-- Modify policy: admin, treasurer, coordinator can manage expenses
DROP POLICY IF EXISTS "expenses_modify_policy" ON public.expenses;
CREATE POLICY "expenses_modify_policy" ON public.expenses FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator', 'treasurer']));

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_expenses_phase_id ON public.expenses(phase_id);

-- 4. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action_type TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Member Feedback & Voice of Congregation Table
CREATE TABLE IF NOT EXISTS public.member_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    reply_message TEXT DEFAULT NULL,
    replied_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Replied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Phase Gallery Photos Table
CREATE TABLE IF NOT EXISTS public.phase_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id TEXT NOT NULL REFERENCES public.construction_phases(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.construction_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_photos ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- EXPLICIT ROW LEVEL SECURITY POLICIES
-- ====================================================================

-- --- Profiles Policies ---
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.check_user_role(ARRAY['admin', 'treasurer', 'coordinator']));

DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
CREATE POLICY "profiles_insert_policy" ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.check_user_role(ARRAY['admin']));

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles FOR DELETE
    USING (public.check_user_role(ARRAY['admin']));

-- --- Construction Phases Policies ---
DROP POLICY IF EXISTS "phases_select_policy" ON public.construction_phases;
CREATE POLICY "phases_select_policy" ON public.construction_phases FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "phases_modify_policy" ON public.construction_phases;
CREATE POLICY "phases_modify_policy" ON public.construction_phases FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator']));

-- --- Contributions Policies ---
DROP POLICY IF EXISTS "contributions_select_policy" ON public.contributions;
CREATE POLICY "contributions_select_policy" ON public.contributions FOR SELECT
    USING (user_id = auth.uid() OR public.check_user_role(ARRAY['admin', 'treasurer']));

DROP POLICY IF EXISTS "contributions_insert_policy" ON public.contributions;
CREATE POLICY "contributions_insert_policy" ON public.contributions FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.check_user_role(ARRAY['admin', 'treasurer']));

DROP POLICY IF EXISTS "contributions_update_policy" ON public.contributions;
CREATE POLICY "contributions_update_policy" ON public.contributions FOR UPDATE
    USING (public.check_user_role(ARRAY['admin', 'treasurer']));

DROP POLICY IF EXISTS "contributions_delete_policy" ON public.contributions;
CREATE POLICY "contributions_delete_policy" ON public.contributions FOR DELETE
    USING (public.check_user_role(ARRAY['admin']));

-- --- Audit Logs Policies (INSERT ONLY for users, SELECT for Admin, NO UPDATE/DELETE) ---
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs FOR SELECT
    USING (public.check_user_role(ARRAY['admin']));

-- --- Member Feedback Policies ---
DROP POLICY IF EXISTS "feedback_select_policy" ON public.member_feedback;
CREATE POLICY "feedback_select_policy" ON public.member_feedback FOR SELECT
    USING (member_id = auth.uid() OR public.check_user_role(ARRAY['admin', 'treasurer', 'coordinator']));

DROP POLICY IF EXISTS "feedback_insert_policy" ON public.member_feedback;
CREATE POLICY "feedback_insert_policy" ON public.member_feedback FOR INSERT
    WITH CHECK (member_id = auth.uid());

DROP POLICY IF EXISTS "feedback_update_policy" ON public.member_feedback;
CREATE POLICY "feedback_update_policy" ON public.member_feedback FOR UPDATE
    USING (public.check_user_role(ARRAY['admin', 'treasurer', 'coordinator']));

DROP POLICY IF EXISTS "feedback_delete_policy" ON public.member_feedback;
CREATE POLICY "feedback_delete_policy" ON public.member_feedback FOR DELETE
    USING (public.check_user_role(ARRAY['admin']));

-- --- Phase Photos Policies ---
DROP POLICY IF EXISTS "photos_select_policy" ON public.phase_photos;
CREATE POLICY "photos_select_policy" ON public.phase_photos FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "photos_modify_policy" ON public.phase_photos;
CREATE POLICY "photos_modify_policy" ON public.phase_photos FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator']));

-- ====================================================================
-- SUPABASE STORAGE BUCKETS SECURITY POLICIES
-- ====================================================================

-- Enable RLS on storage objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- --- Bucket: payment-proofs policies ---
DROP POLICY IF EXISTS "proofs_select_policy" ON storage.objects;
CREATE POLICY "proofs_select_policy" ON storage.objects FOR SELECT
    USING (bucket_id = 'payment-proofs' AND (auth.uid() = owner OR public.check_user_role(ARRAY['admin', 'treasurer'])));

DROP POLICY IF EXISTS "proofs_insert_policy" ON storage.objects;
CREATE POLICY "proofs_insert_policy" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'payment-proofs' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "proofs_update_policy" ON storage.objects;
CREATE POLICY "proofs_update_policy" ON storage.objects FOR UPDATE
    USING (bucket_id = 'payment-proofs' AND auth.uid() = owner);

DROP POLICY IF EXISTS "proofs_delete_policy" ON storage.objects;
CREATE POLICY "proofs_delete_policy" ON storage.objects FOR DELETE
    USING (bucket_id = 'payment-proofs' AND (auth.uid() = owner OR public.check_user_role(ARRAY['admin'])));

-- --- Bucket: construction-media policies ---
DROP POLICY IF EXISTS "media_select_policy" ON storage.objects;
CREATE POLICY "media_select_policy" ON storage.objects FOR SELECT
    USING (bucket_id = 'construction-media' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "media_insert_policy" ON storage.objects;
CREATE POLICY "media_insert_policy" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'construction-media' AND public.check_user_role(ARRAY['admin', 'coordinator']));

DROP POLICY IF EXISTS "media_delete_policy" ON storage.objects;
CREATE POLICY "media_delete_policy" ON storage.objects FOR DELETE
    USING (bucket_id = 'construction-media' AND public.check_user_role(ARRAY['admin', 'coordinator']));

-- ====================================================================
-- 7. Fundraising Events Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.fundraising_events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL CHECK (target_amount >= 0),
    budget NUMERIC NOT NULL DEFAULT 0,
    expenses NUMERIC NOT NULL DEFAULT 0,
    income NUMERIC NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed')),
    linked_phase_name TEXT,
    date DATE,
    logistics JSONB DEFAULT '[]',
    committees JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fundraising_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_policy" ON public.fundraising_events;
CREATE POLICY "events_select_policy" ON public.fundraising_events FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "events_modify_policy" ON public.fundraising_events;
CREATE POLICY "events_modify_policy" ON public.fundraising_events FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator', 'treasurer']));

-- ====================================================================
-- 8. Announcements Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date DATE,
    sender_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_select_policy" ON public.announcements;
CREATE POLICY "announcements_select_policy" ON public.announcements FOR SELECT
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "announcements_modify_policy" ON public.announcements;
CREATE POLICY "announcements_modify_policy" ON public.announcements FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator']));

-- ====================================================================
-- 9. Documents Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATE,
    url TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy" ON public.documents FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documents_modify_policy" ON public.documents;
CREATE POLICY "documents_modify_policy" ON public.documents FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator']));

-- ====================================================================
-- 10. Pledges Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.pledges (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    amount_paid NUMERIC DEFAULT 0 CHECK (amount_paid >= 0),
    target_date DATE,
    purpose TEXT NOT NULL,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pledges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pledges_select_policy" ON public.pledges;
CREATE POLICY "pledges_select_policy" ON public.pledges FOR SELECT
    USING (user_id = auth.uid() OR public.check_user_role(ARRAY['admin', 'treasurer']));

DROP POLICY IF EXISTS "pledges_modify_policy" ON public.pledges;
CREATE POLICY "pledges_modify_policy" ON public.pledges FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'treasurer']));

-- ====================================================================
-- 10b. Procurements Table
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.procurements (
    id TEXT PRIMARY KEY,
    item TEXT NOT NULL,
    quantity TEXT NOT NULL,
    phase_id TEXT REFERENCES public.construction_phases(id) ON DELETE CASCADE,
    priority TEXT CHECK (priority IN ('Low', 'Medium', 'High')),
    status TEXT DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval', 'Approved', 'Dispatched', 'Delivered')),
    date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.procurements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "procurements_select_policy" ON public.procurements;
CREATE POLICY "procurements_select_policy" ON public.procurements FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "procurements_modify_policy" ON public.procurements;
CREATE POLICY "procurements_modify_policy" ON public.procurements FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator', 'treasurer']));


-- ====================================================================
-- OPTIMIZED PERFORMANCE INDEXES (FOR LARGE DATASETS)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_phases_status ON public.construction_phases(status);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON public.contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON public.contributions(status);
CREATE INDEX IF NOT EXISTS idx_contributions_date ON public.contributions(date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_member_id ON public.member_feedback(member_id);
CREATE INDEX IF NOT EXISTS idx_photos_phase_id ON public.phase_photos(phase_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.fundraising_events(status);
CREATE INDEX IF NOT EXISTS idx_pledges_user_id ON public.pledges(user_id);

-- ====================================================================
-- 11. Daily Verses Table (Scripture Engine for Member Dashboard)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.daily_verses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL,
    scripture_text TEXT NOT NULL,
    simple_explanation TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Generosity',
    display_day INTEGER NOT NULL CHECK (display_day >= 1 AND display_day <= 31),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT daily_verses_display_day_unique UNIQUE (display_day)
);

ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read daily verses
DROP POLICY IF EXISTS "daily_verses_select_policy" ON public.daily_verses;
CREATE POLICY "daily_verses_select_policy" ON public.daily_verses FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only admins can insert/update/delete verses
DROP POLICY IF EXISTS "daily_verses_insert_policy" ON public.daily_verses;
CREATE POLICY "daily_verses_insert_policy" ON public.daily_verses FOR INSERT
    WITH CHECK (public.check_user_role(ARRAY['admin']));

DROP POLICY IF EXISTS "daily_verses_update_policy" ON public.daily_verses;
CREATE POLICY "daily_verses_update_policy" ON public.daily_verses FOR UPDATE
    USING (public.check_user_role(ARRAY['admin']));

DROP POLICY IF EXISTS "daily_verses_delete_policy" ON public.daily_verses;
CREATE POLICY "daily_verses_delete_policy" ON public.daily_verses FOR DELETE
    USING (public.check_user_role(ARRAY['admin']));

-- Index for fast day-of-month lookup
CREATE INDEX IF NOT EXISTS idx_daily_verses_display_day ON public.daily_verses(display_day);

-- ====================================================================
-- AUTOMATIC ROLE-BASED EMAIL VERIFICATION & PROFILE SYNC TRIGGERS
-- ====================================================================

-- 1. Trigger function to automatically confirm emails for all users (instant access)
CREATE OR REPLACE FUNCTION public.auto_confirm_special_roles()
RETURNS TRIGGER AS $$
BEGIN
    NEW.email_confirmed_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the auto-confirm trigger to auth.users (runs BEFORE insert)
DROP TRIGGER IF EXISTS tr_auto_confirm_special_roles ON auth.users;
CREATE TRIGGER tr_auto_confirm_special_roles
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_special_roles();

-- 2. Trigger function to automatically create a profile in public.profiles when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
        NULLIF(NEW.raw_user_meta_data->>'phone', '')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind the profile handler trigger to auth.users (runs AFTER insert)
DROP TRIGGER IF EXISTS tr_handle_new_user_profile ON auth.users;
CREATE TRIGGER tr_handle_new_user_profile
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_profile();

-- ====================================================================
-- 12. BILL OF QUANTITIES (BOQ) TRACKING TABLES
-- ====================================================================

-- Update construction_phases to support boq_budget
ALTER TABLE public.construction_phases ADD COLUMN IF NOT EXISTS boq_budget NUMERIC DEFAULT 0;

-- Create boq_line_items table referencing construction_phases
CREATE TABLE IF NOT EXISTS public.boq_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id TEXT NOT NULL REFERENCES public.construction_phases(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    unit TEXT,
    quantity NUMERIC DEFAULT 0,
    rate NUMERIC DEFAULT 0,
    estimated_amount NUMERIC GENERATED ALWAYS AS (quantity * rate) STORED,
    actual_spent NUMERIC DEFAULT 0 CHECK (actual_spent >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS and define Policies
ALTER TABLE public.boq_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "boq_select_policy" ON public.boq_line_items;
CREATE POLICY "boq_select_policy" ON public.boq_line_items FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "boq_modify_policy" ON public.boq_line_items;
CREATE POLICY "boq_modify_policy" ON public.boq_line_items FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator']));

-- Create Index for fast lookups by phase_id
CREATE INDEX IF NOT EXISTS idx_boq_items_phase_id ON public.boq_line_items(phase_id);


-- ====================================================================
-- 12b. BUILDING COMMITTEE & PAYMENT DETAILS TABLES
-- ====================================================================

-- Create Building Committee Table
CREATE TABLE IF NOT EXISTS public.building_committee (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    role_title TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    profile_photo_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Building Committee
ALTER TABLE public.building_committee ENABLE ROW LEVEL SECURITY;

-- SELECT policy: all authenticated users and anon can read (publicly visible)
DROP POLICY IF EXISTS "committee_select_policy" ON public.building_committee;
CREATE POLICY "committee_select_policy" ON public.building_committee FOR SELECT
    USING (true);

-- INSERT/UPDATE/DELETE policy: only admin role can manage
DROP POLICY IF EXISTS "committee_modify_policy" ON public.building_committee;
CREATE POLICY "committee_modify_policy" ON public.building_committee FOR ALL
    USING (public.check_user_role(ARRAY['admin']));

-- Create Payment Details Table
CREATE TABLE IF NOT EXISTS public.payment_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_type TEXT NOT NULL CHECK (payment_type IN ('Mobile Money', 'Bank Transfer')),
    provider_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    bank_branch TEXT,
    swift_code TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for Payment Details
ALTER TABLE public.payment_details ENABLE ROW LEVEL SECURITY;

-- SELECT policy: all authenticated users and anon can view
DROP POLICY IF EXISTS "payment_details_select_policy" ON public.payment_details;
CREATE POLICY "payment_details_select_policy" ON public.payment_details FOR SELECT
    USING (true);

-- INSERT/UPDATE/DELETE policy: only admin and coordinator roles can manage
DROP POLICY IF EXISTS "payment_details_modify_policy" ON public.payment_details;
CREATE POLICY "payment_details_modify_policy" ON public.payment_details FOR ALL
    USING (public.check_user_role(ARRAY['admin', 'coordinator']));


-- ====================================================================
-- 13. EXPLICIT ROLE PRIVILEGE GRANTS (FOR WEB CLIENT API ACCESS)
-- ====================================================================

-- Grant general schema usage to standard roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant complete read/write access to all tables
GRANT ALL ON TABLE public.profiles TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.construction_phases TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.contributions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.expenses TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.audit_logs TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.member_feedback TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.phase_photos TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.fundraising_events TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.announcements TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.documents TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.pledges TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.procurements TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.daily_verses TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.boq_line_items TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.building_committee TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.payment_details TO postgres, anon, authenticated, service_role;

-- Grant privileges on database sequences and functions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Sync profiles table from auth.users to restore existing users
INSERT INTO public.profiles (id, email, full_name, role, phone)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', ''), 
    COALESCE(raw_user_meta_data->>'role', 'member'), 
    COALESCE(raw_user_meta_data->>'phone', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- HYBRID ADVERTISING & BUSINESS DIRECTORY SYSTEM
-- ==========================================
CREATE TABLE IF NOT EXISTS public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  contact_info VARCHAR(255),
  description TEXT,
  ad_type VARCHAR(50) NOT NULL DEFAULT 'banner' CHECK (ad_type IN ('banner', 'directory', 'classified')),
  placement VARCHAR(50) NOT NULL DEFAULT 'dashboard' CHECK (placement IN ('dashboard', 'announcements', 'all')),
  image_url TEXT,
  target_url TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_advertisements_active_dates ON public.advertisements(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON public.advertisements(placement);

DROP POLICY IF EXISTS "Public and authenticated can read active ads" ON public.advertisements;
CREATE POLICY "Public and authenticated can read active ads"
  ON public.advertisements
  FOR SELECT
  USING (
    is_active = true 
    AND start_date <= CURRENT_DATE 
    AND end_date >= CURRENT_DATE
  );

DROP POLICY IF EXISTS "Admins have full CRUD access to advertisements" ON public.advertisements;
CREATE POLICY "Admins have full CRUD access to advertisements"
  ON public.advertisements
  FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

DROP TRIGGER IF EXISTS trigger_advertisements_updated_at ON public.advertisements;
CREATE TRIGGER trigger_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW
  EXECUTE FUNCTION update_advertisements_modtime();

GRANT ALL ON TABLE public.advertisements TO postgres, anon, authenticated, service_role;
