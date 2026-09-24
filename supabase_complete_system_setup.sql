-- ====================================================================
-- MAMTA HOSPITAL - COMPLETELY ISOLATED SYSTEM DATABASE SCHEMA
-- Target: Supabase PostgreSQL Database
-- Purpose: Creates 100% independent project tables with ZERO dependency
--          on pre-existing database tables (users, checklist, master, etc.).
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 1. Table: public.app_users (Independent Project User Master)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.app_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL DEFAULT '121212',
    name TEXT NOT NULL,
    email TEXT,
    mobile TEXT,
    employee_id TEXT,
    role TEXT DEFAULT 'User', -- 'Admin' | 'User'
    department TEXT DEFAULT 'General',
    designation TEXT,
    status TEXT DEFAULT 'Active', -- 'Active' | 'Inactive'
    can_self_assign BOOLEAN DEFAULT false,
    profile_image TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_appusers_username ON public.app_users(username);
CREATE INDEX IF NOT EXISTS idx_appusers_role ON public.app_users(role);
CREATE INDEX IF NOT EXISTS idx_appusers_department ON public.app_users(department);

-- Seed initial default project users (Admin & Demo Users)
INSERT INTO public.app_users (id, username, password, name, email, mobile, role, department, designation, can_self_assign)
VALUES 
    ('1', 'admin', '121212', 'System Administrator', 'admin@mamtahospital.com', '9876543210', 'Admin', 'Management', 'Hospital Admin', true),
    ('2', 'dr_sharma', '121212', 'Dr. Rajesh Sharma', 'sharma@mamtahospital.com', '9876543211', 'User', 'Cardiology', 'Senior Consultant', true),
    ('3', 'nurse_priya', '121212', 'Priya Patel', 'priya@mamtahospital.com', '9876543212', 'User', 'ICU', 'Head Nurse', false),
    ('4', 'sahil_it', '121212', 'Sahil Mirza', 'sahil@mamtahospital.com', '9876543213', 'User', 'IT & Infrastructure', 'IT Executive', true)
ON CONFLICT (id) DO NOTHING;


-- ====================================================================
-- 2. Table: public."groupUser" / public.app_group_users (Group User Mapping)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public."groupUser" (
    id TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    username TEXT,
    email TEXT,
    mobile TEXT,
    "groupId" TEXT,
    "subgroupId" TEXT,
    role TEXT DEFAULT 'User',
    status TEXT DEFAULT 'Active',
    "canSelfAssign" BOOLEAN DEFAULT false,
    "assignedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_groupuser_userid ON public."groupUser"("userId");
CREATE INDEX IF NOT EXISTS idx_groupuser_groupid ON public."groupUser"("groupId");

-- Auto Trigger: Syncs new project users from app_users into groupUser
CREATE OR REPLACE FUNCTION public.sync_appuser_to_groupuser()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."groupUser" (
        id, "userId", username, email, mobile, "groupId", "subgroupId", role, status, "canSelfAssign", "assignedAt", "updatedAt"
    )
    VALUES (
        'GU-' || NEW.id,
        NEW.id,
        NEW.username,
        COALESCE(NEW.email, ''),
        COALESCE(NEW.mobile, ''),
        COALESCE(NEW.department, 'General'),
        COALESCE(NEW.designation, ''),
        NEW.role,
        NEW.status,
        NEW.can_self_assign,
        COALESCE(NEW.created_at, timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        email = EXCLUDED.email,
        mobile = EXCLUDED.mobile,
        "groupId" = EXCLUDED."groupId",
        "subgroupId" = EXCLUDED."subgroupId",
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        "canSelfAssign" = EXCLUDED."canSelfAssign",
        "updatedAt" = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_appuser_to_groupuser ON public.app_users;
CREATE TRIGGER trigger_sync_appuser_to_groupuser
AFTER INSERT OR UPDATE ON public.app_users
FOR EACH ROW EXECUTE FUNCTION public.sync_appuser_to_groupuser();

-- Initial sync from app_users into groupUser
INSERT INTO public."groupUser" (
    id, "userId", username, email, mobile, "groupId", "subgroupId", role, status, "canSelfAssign", "assignedAt", "updatedAt"
)
SELECT 
    'GU-' || u.id AS id,
    u.id AS "userId",
    u.username,
    COALESCE(u.email, ''),
    COALESCE(u.mobile, ''),
    COALESCE(u.department, 'General') AS "groupId",
    COALESCE(u.designation, '') AS "subgroupId",
    u.role,
    u.status,
    u.can_self_assign AS "canSelfAssign",
    u.created_at AS "assignedAt",
    timezone('utc'::text, now()) AS "updatedAt"
FROM public.app_users u
ON CONFLICT (id) DO NOTHING;


-- ====================================================================
-- 3. Table: public."grouptask" (Core Tasks Table)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public."grouptask" (
    id TEXT PRIMARY KEY,
    "taskId" TEXT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'General Operations',
    subcategory TEXT DEFAULT 'General',
    priority TEXT DEFAULT 'Medium',
    "taskType" TEXT DEFAULT 'Checklist',
    "assignmentLevel" TEXT DEFAULT 'Individual User',
    "groupId" TEXT,
    "subgroupId" TEXT,
    department TEXT,
    "givenBy" TEXT,
    "assignBy" TEXT,
    "assignedUserIds" JSONB DEFAULT '[]'::jsonb,
    "assignedUsers" TEXT,
    "startDate" TEXT,
    "dueDate" TEXT,
    frequency TEXT DEFAULT 'Daily',
    status TEXT DEFAULT 'Pending',
    "checklistItems" JSONB DEFAULT '[]'::jsonb,
    "requiredAttachment" BOOLEAN DEFAULT false,
    attachment JSONB,
    remarks TEXT,
    "completedAt" TIMESTAMPTZ,
    "completedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_grouptask_status ON public."grouptask"(status);
CREATE INDEX IF NOT EXISTS idx_grouptask_groupid ON public."grouptask"("groupId");
CREATE INDEX IF NOT EXISTS idx_grouptask_duedate ON public."grouptask"("dueDate");


-- ====================================================================
-- 4. Table: public."taskAssignments" (Task Assignment Mapping)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public."taskAssignments" (
    id TEXT PRIMARY KEY,
    "taskId" TEXT NOT NULL REFERENCES public."grouptask"(id) ON DELETE CASCADE,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    status TEXT DEFAULT 'Assigned'
);

CREATE INDEX IF NOT EXISTS idx_taskassignments_taskid ON public."taskAssignments"("taskId");
CREATE INDEX IF NOT EXISTS idx_taskassignments_userid ON public."taskAssignments"("userId");


-- ====================================================================
-- 5. Table: public."taskInstances" (Task Execution Instances & Checklist Items)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public."taskInstances" (
    id TEXT PRIMARY KEY,
    "taskId" TEXT NOT NULL REFERENCES public."grouptask"(id) ON DELETE CASCADE,
    "assignedUserId" TEXT NOT NULL,
    "assignedUserName" TEXT,
    "dueDate" TEXT,
    status TEXT DEFAULT 'Pending',
    "checklistItemsStatus" JSONB DEFAULT '[]'::jsonb,
    "requiredAttachment" BOOLEAN DEFAULT false,
    attachment JSONB,
    remarks TEXT,
    "completedAt" TIMESTAMPTZ,
    "completedBy" TEXT,
    "createdAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    "updatedAt" TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_taskinstances_taskid ON public."taskInstances"("taskId");
CREATE INDEX IF NOT EXISTS idx_taskinstances_assigneduserid ON public."taskInstances"("assignedUserId");
CREATE INDEX IF NOT EXISTS idx_taskinstances_status ON public."taskInstances"(status);


-- ====================================================================
-- 6. Table: public."taskHistory" (Audit Trail & Activity Log)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public."taskHistory" (
    id TEXT PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "instanceId" TEXT,
    action TEXT NOT NULL,
    "performedBy" TEXT NOT NULL,
    "performedByName" TEXT,
    details JSONB,
    note TEXT,
    "timestamp" TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_taskhistory_taskid ON public."taskHistory"("taskId");
CREATE INDEX IF NOT EXISTS idx_taskhistory_instanceid ON public."taskHistory"("instanceId");


-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Clean access control policies for project system tables
-- ====================================================================

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."groupUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."grouptask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."taskAssignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."taskInstances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."taskHistory" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to app_users" ON public.app_users;
CREATE POLICY "Allow all access to app_users" ON public.app_users FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to groupUser" ON public."groupUser";
CREATE POLICY "Allow all access to groupUser" ON public."groupUser" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to grouptask" ON public."grouptask";
CREATE POLICY "Allow all access to grouptask" ON public."grouptask" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to taskAssignments" ON public."taskAssignments";
CREATE POLICY "Allow all access to taskAssignments" ON public."taskAssignments" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to taskInstances" ON public."taskInstances";
CREATE POLICY "Allow all access to taskInstances" ON public."taskInstances" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to taskHistory" ON public."taskHistory";
CREATE POLICY "Allow all access to taskHistory" ON public."taskHistory" FOR ALL TO public USING (true) WITH CHECK (true);


-- ====================================================================
-- SUPABASE REALTIME PUBLICATION SETUP
-- Realtime live sync for task and user tables
-- ====================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'app_users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'groupUser') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."groupUser";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'grouptask') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."grouptask";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'taskAssignments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."taskAssignments";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'taskInstances') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."taskInstances";
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'taskHistory') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."taskHistory";
  END IF;
END $$;
