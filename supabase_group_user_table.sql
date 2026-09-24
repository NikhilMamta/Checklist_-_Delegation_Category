-- ====================================================================
-- Clean SQL: One Single 'username' Column (No Duplicate userName)
-- Target: public."groupUser"
-- ====================================================================

-- 1. Remove the duplicate case-sensitive "userName" column if it exists
ALTER TABLE public."groupUser" DROP COLUMN IF EXISTS "userName";

-- 2. Ensure table schema has only ONE single 'username' column
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

-- 3. Clear out any dummy/seed test records
DELETE FROM public."groupUser" 
WHERE id NOT IN (SELECT 'GU-' || id::text FROM public.users);

-- 4. Dynamic migration directly from real users table into single 'username' column
INSERT INTO public."groupUser" (
    id,
    "userId",
    username,
    email,
    mobile,
    "groupId",
    "subgroupId",
    role,
    status,
    "canSelfAssign",
    "assignedAt",
    "updatedAt"
)
SELECT 
    'GU-' || u.id::text AS id,
    u.id::text AS "userId",
    COALESCE(NULLIF(u.user_name, ''), NULLIF(u.username, ''), 'User ' || u.id::text) AS username,
    COALESCE(u.email_id, '') AS email,
    COALESCE(u.number, '') AS mobile,
    COALESCE(NULLIF(u.department, ''), 'General') AS "groupId",
    COALESCE(u."Designation", '') AS "subgroupId",
    CASE WHEN LOWER(COALESCE(u.role, 'user')) = 'admin' THEN 'Admin' ELSE 'User' END AS role,
    CASE WHEN LOWER(COALESCE(u.status, 'active')) = 'inactive' THEN 'Inactive' ELSE 'Active' END AS status,
    COALESCE(u.can_self_assign, false) AS "canSelfAssign",
    COALESCE(u.created_at, timezone('utc'::text, now())) AS "assignedAt",
    timezone('utc'::text, now()) AS "updatedAt"
FROM public.users u
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

-- 5. Automatic Database Trigger: Automatically syncs new/updated users into 'groupUser'
CREATE OR REPLACE FUNCTION public.sync_user_to_groupuser()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public."groupUser" (
        id, "userId", username, email, mobile, "groupId", "subgroupId", role, status, "canSelfAssign", "assignedAt", "updatedAt"
    )
    VALUES (
        'GU-' || NEW.id::text,
        NEW.id::text,
        COALESCE(NULLIF(NEW.user_name, ''), NULLIF(NEW.username, ''), 'User ' || NEW.id::text),
        COALESCE(NEW.email_id, ''),
        COALESCE(NEW.number, ''),
        COALESCE(NULLIF(NEW.department, ''), 'General'),
        COALESCE(NEW."Designation", ''),
        CASE WHEN LOWER(COALESCE(NEW.role, 'user')) = 'admin' THEN 'Admin' ELSE 'User' END,
        CASE WHEN LOWER(COALESCE(NEW.status, 'active')) = 'inactive' THEN 'Inactive' ELSE 'Active' END,
        COALESCE(NEW.can_self_assign, false),
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

DROP TRIGGER IF EXISTS trigger_sync_user_to_groupuser ON public.users;
CREATE TRIGGER trigger_sync_user_to_groupuser
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.sync_user_to_groupuser();
