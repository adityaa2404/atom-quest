-- ========================================
-- ATOMQUEST GOAL PORTAL — DATABASE SCHEMA
-- Run this in the Supabase SQL Editor
-- ========================================

-- ========================================
-- USERS & ORG HIERARCHY
-- ========================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'admin')),
    department TEXT,
    manager_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- GOAL CYCLES (Admin configures these)
-- ========================================
CREATE TABLE public.cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    goal_setting_start DATE NOT NULL,
    goal_setting_end DATE NOT NULL,
    q1_start DATE, q1_end DATE,
    q2_start DATE, q2_end DATE,
    q3_start DATE, q3_end DATE,
    q4_start DATE, q4_end DATE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- THRUST AREAS
-- ========================================
CREATE TABLE public.thrust_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- ========================================
-- SHARED GOAL GROUPS
-- ========================================
CREATE TABLE public.shared_goal_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    thrust_area_id UUID REFERENCES public.thrust_areas(id),
    uom_type TEXT NOT NULL CHECK (uom_type IN ('min_numeric', 'min_percent', 'max_numeric', 'max_percent', 'timeline', 'zero')),
    target_value NUMERIC,
    target_date DATE,
    created_by UUID REFERENCES public.profiles(id),
    cycle_id UUID REFERENCES public.cycles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- GOAL SHEETS (one per employee per cycle)
-- ========================================
CREATE TABLE public.goal_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id),
    cycle_id UUID NOT NULL REFERENCES public.cycles(id),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'returned', 'approved', 'locked')),
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.profiles(id),
    return_comment TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(employee_id, cycle_id)
);

-- ========================================
-- INDIVIDUAL GOALS
-- ========================================
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_sheet_id UUID NOT NULL REFERENCES public.goal_sheets(id) ON DELETE CASCADE,
    shared_goal_group_id UUID REFERENCES public.shared_goal_groups(id),
    title TEXT NOT NULL,
    description TEXT,
    thrust_area_id UUID REFERENCES public.thrust_areas(id),
    uom_type TEXT NOT NULL CHECK (uom_type IN ('min_numeric', 'min_percent', 'max_numeric', 'max_percent', 'timeline', 'zero')),
    target_value NUMERIC,
    target_date DATE,
    weightage INTEGER NOT NULL CHECK (weightage >= 10),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- QUARTERLY ACHIEVEMENTS
-- ========================================
CREATE TABLE public.achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    actual_value NUMERIC,
    actual_date DATE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'on_track', 'completed')),
    computed_score NUMERIC,
    employee_comment TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(goal_id, quarter)
);

-- ========================================
-- MANAGER CHECK-INS
-- ========================================
CREATE TABLE public.checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_sheet_id UUID NOT NULL REFERENCES public.goal_sheets(id),
    quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    manager_id UUID NOT NULL REFERENCES public.profiles(id),
    comment TEXT NOT NULL,
    checked_in_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(goal_sheet_id, quarter)
);

-- ========================================
-- AUDIT LOG
-- ========================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- ESCALATION RULES (Admin configures)
-- ========================================
CREATE TABLE public.escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    condition_type TEXT NOT NULL CHECK (condition_type IN (
        'goal_not_submitted',
        'goal_not_approved',
        'checkin_not_completed'
    )),
    threshold_days INTEGER NOT NULL,
    level_2_after_days INTEGER DEFAULT 3,
    level_3_after_days INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    cycle_id UUID REFERENCES public.cycles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- ESCALATION LOG
-- ========================================
CREATE TABLE public.escalation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.escalation_rules(id),
    employee_id UUID REFERENCES public.profiles(id),
    current_level INTEGER DEFAULT 1 CHECK (current_level IN (1, 2, 3)),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    triggered_at TIMESTAMPTZ DEFAULT now(),
    escalated_to_l2_at TIMESTAMPTZ,
    escalated_to_l3_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id),
    notes TEXT
);

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX idx_goals_sheet ON public.goals(goal_sheet_id);
CREATE INDEX idx_achievements_goal ON public.achievements(goal_id);
CREATE INDEX idx_goal_sheets_employee ON public.goal_sheets(employee_id);
CREATE INDEX idx_goal_sheets_cycle ON public.goal_sheets(cycle_id);
CREATE INDEX idx_profiles_manager ON public.profiles(manager_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_escalation_logs_status ON public.escalation_logs(status);

-- ========================================
-- SEED DATA
-- ========================================

-- Active cycle: FY 2025-26
INSERT INTO public.cycles (id, name, goal_setting_start, goal_setting_end,
    q1_start, q1_end, q2_start, q2_end, q3_start, q3_end, q4_start, q4_end, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'FY 2025-26',
    '2025-05-01', '2025-06-30',
    '2025-07-01', '2025-07-31',
    '2025-10-01', '2025-10-31',
    '2026-01-01', '2026-01-31',
    '2026-03-01', '2026-04-30',
    true
);

-- Thrust areas
INSERT INTO public.thrust_areas (name, description) VALUES
('Revenue Growth', 'Goals related to increasing revenue and market share'),
('Operational Excellence', 'Process improvement, efficiency, cost optimization'),
('Customer Satisfaction', 'NPS, CSAT, customer retention metrics'),
('People & Culture', 'Team development, hiring, engagement'),
('Innovation', 'New products, R&D, technology adoption'),
('Safety & Compliance', 'Zero-incident targets, regulatory adherence');

-- Default escalation rules
INSERT INTO public.escalation_rules (name, condition_type, threshold_days, level_2_after_days, level_3_after_days, is_active, cycle_id) VALUES
('Goal Submission Overdue', 'goal_not_submitted', 14, 3, 5, true, 'a0000000-0000-0000-0000-000000000001'),
('Approval Pending Too Long', 'goal_not_approved', 7, 3, 5, true, 'a0000000-0000-0000-0000-000000000001'),
('Check-in Not Completed', 'checkin_not_completed', 10, 3, 5, true, 'a0000000-0000-0000-0000-000000000001');

-- ========================================
-- AFTER RUNNING THIS SCHEMA:
-- 1. Create test users in Supabase Auth dashboard:
--    employee@atomquest.com / Password123!
--    manager@atomquest.com  / Password123!
--    admin@atomquest.com    / Password123!
-- 2. Then insert their profiles with the auth UUIDs:
--
-- INSERT INTO public.profiles (id, email, full_name, role, department, manager_id)
-- VALUES
--   ('9a135be4-42ef-4df4-889e-5dfa460b0973', 'employee@atomquest.com', 'Aarya Agarwal',  'employee', 'Engineering', '08d0c133-8f7c-49dc-81d9-c633a4434934'),
--   ('08d0c133-8f7c-49dc-81d9-c633a4434934', 'manager@atomquest.com',  'Siddharth Wagh', 'manager',  'Engineering', NULL),
--   ('1ee2e52e-aa63-42e4-9a9c-57deb29dee0a', 'admin@atomquest.com',    'Vivek Patil',    'admin',    'HR',           NULL);
-- ========================================
