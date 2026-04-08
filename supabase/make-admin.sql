-- Run this once in Supabase SQL Editor to grant admin privileges.
-- Also fixes any existing rows that were inserted without is_active set.

UPDATE users
SET is_admin = true
WHERE email = 'deepakkrishnar1618@gmail.com';

-- Fix any users with null is_active (inserted before the is_active fix)
UPDATE users
SET is_active = 1
WHERE (is_active IS NULL) AND (is_deleted = false OR is_deleted IS NULL);
