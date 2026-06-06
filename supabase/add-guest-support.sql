-- ============================================================================
-- Guest (anonymous) access support
-- Run this once in the Supabase SQL editor on an existing deployment.
-- (schema.sql already includes these for fresh installs.)
-- ============================================================================

-- Flag rows created from an anonymous "Guest Access" sign-in so they can be
-- auto-completed on entry and purged periodically by /api/cron/purge-guests.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);
