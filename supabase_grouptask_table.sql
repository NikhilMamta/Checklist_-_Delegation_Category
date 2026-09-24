-- ====================================================================
-- Table: public."grouptask" in Supabase
-- Description: Stores all assigned hospital tasks, checklists & delegations
-- ====================================================================

-- 1. Create the "grouptask" table
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

-- 2. Indexes for fast filtering and dashboard queries
CREATE INDEX IF NOT EXISTS idx_grouptask_status ON public."grouptask"(status);
CREATE INDEX IF NOT EXISTS idx_grouptask_groupid ON public."grouptask"("groupId");
CREATE INDEX IF NOT EXISTS idx_grouptask_subgroupid ON public."grouptask"("subgroupId");
CREATE INDEX IF NOT EXISTS idx_grouptask_duedate ON public."grouptask"("dueDate");
CREATE INDEX IF NOT EXISTS idx_grouptask_priority ON public."grouptask"(priority);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public."grouptask" ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow anon and authenticated users full access
DROP POLICY IF EXISTS "Allow all access to grouptask" ON public."grouptask";
CREATE POLICY "Allow all access to grouptask" 
ON public."grouptask" 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- 5. Enable Realtime updates for live task board syncing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'grouptask'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."grouptask";
  END IF;
END $$;
