import { getServiceClient } from '@/src/lib/api-helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

export type BootstrapResult =
  | { status: 'ok'; user: Record<string, any> }
  | { status: 'blocked' };

export interface BootstrapOptions {
  /** True when the Supabase auth user is anonymous (Guest Access). */
  isAnonymous?: boolean;
}

/**
 * Ensure an app `users` row exists for the authenticated Supabase user and
 * return it (or signal that the account is blocked).
 *
 * Shared by /api/profile (GET) and the OAuth callback route so the user
 * creation / blocked / deleted-reset logic lives in exactly one place.
 *
 * Anonymous (guest) users get an auto-generated identity and a completed
 * profile so they skip /profile/setup and drop straight into the app. They are
 * flagged is_guest so /api/cron/purge-guests can clean them up later.
 */
export async function bootstrapUser(
  userId: string,
  userEmail: string | null,
  opts: BootstrapOptions = {}
): Promise<BootstrapResult> {
  const { isAnonymous = false } = opts;
  const db = getServiceClient();

  let { data: dbUser } = await db.from('users').select('*').eq('id', userId).single();

  if (!dbUser) {
    // First login — create the user record automatically.
    const isAdmin = userEmail ? userEmail === ADMIN_EMAIL : false;

    if (userEmail) {
      // Free up the email from any previously deleted account so the unique
      // constraint doesn't collide with this fresh sign-up.
      const { data: deletedUser } = await db
        .from('users').select('id').eq('email', userEmail).eq('is_deleted', true).maybeSingle();
      if (deletedUser) {
        await db.from('users').update({ email: null }).eq('id', deletedUser.id);
      }

      // Block list check by email
      const { data: blockedUser } = await db
        .from('users').select('id, is_deleted').eq('email', userEmail).eq('is_active', 0).maybeSingle();
      if (blockedUser && !blockedUser.is_deleted) {
        return { status: 'blocked' };
      }
    }

    if (isAnonymous) {
      // Guest: auto-generate an identity and mark the profile complete so they
      // bypass /profile/setup and go straight into the app.
      await db.from('users').insert({
        id: userId,
        email: null,
        is_admin: false,
        is_active: 1,
        is_online: true,
        is_guest: true,
        name: `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
        room_number: 'Visitor',
        profile_completed: true,
      });
    } else {
      await db.from('users').insert({
        id: userId,
        email: userEmail,
        is_admin: isAdmin,
        is_active: 1,
        is_online: true,
        profile_completed: false,
      });
    }

    const { data: newUser } = await db.from('users').select('*').eq('id', userId).single();
    dbUser = newUser;
  }

  if (!dbUser) {
    throw new Error('Failed to create user record');
  }

  // Blocked (but not deleted) — reject
  if (dbUser.is_active === 0 && !dbUser.is_deleted) {
    return { status: 'blocked' };
  }

  // Deleted user signs back in with same Google account — give them a fresh start
  if (dbUser.is_deleted) {
    await db.from('users').update({
      is_deleted: false,
      is_active: 1,
      profile_completed: false,
      name: null,
      room_number: null,
      avatar_url: null,
      email: userEmail,
      updated_at: new Date().toISOString(),
    }).eq('id', userId);
    const { data: resetUser } = await db.from('users').select('*').eq('id', userId).single();
    dbUser = resetUser;
  }

  // Touch online status
  await db.from('users')
    .update({ is_online: true, is_active: 1, last_seen_at: new Date().toISOString() })
    .eq('id', userId);

  return { status: 'ok', user: { ...dbUser, is_active: 1 } };
}
