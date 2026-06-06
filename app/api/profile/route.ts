import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';
import { createClient } from '@/src/lib/supabase/server';
import { buildWelcomeEmail } from '@/src/lib/email-templates';
import { sendEmail } from '@/src/lib/send-email';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();

  // Get the Supabase auth user to obtain their email for first-time upsert
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const userEmail = authUser?.email || null;

  let { data: dbUser } = await db.from('users').select('*').eq('id', userId).single();

  if (!dbUser) {
    // First login — create the user record automatically.
    // /api/sessions is called separately but may not have run yet with implicit flow.
    const isAdmin = userEmail ? userEmail === ADMIN_EMAIL : false;

    // Check for a previously deleted account with the same email (only if email is provided)
    let deletedUser = null;
    if (userEmail) {
      const { data } = await db
        .from('users').select('id').eq('email', userEmail).eq('is_deleted', true).maybeSingle();
      deletedUser = data;
    }
    if (deletedUser) {
      await db.from('users').update({ email: null }).eq('id', deletedUser.id);
    }

    // Check if blocked (only if email is provided)
    let blockedUser = null;
    if (userEmail) {
      const { data } = await db
        .from('users').select('id, is_deleted').eq('email', userEmail).eq('is_active', 0).maybeSingle();
      blockedUser = data;
    }
    if (blockedUser && !blockedUser.is_deleted) {
      return error('Your account has been blocked', 403);
    }

    await db.from('users').insert({
      id: userId,
      email: userEmail,
      is_admin: isAdmin,
      is_active: 1,
      is_online: true,
      profile_completed: false,
    });

    const { data: newUser } = await db.from('users').select('*').eq('id', userId).single();
    dbUser = newUser;
  }

  if (!dbUser) return error('Failed to create user record', 500);

  // Blocked (but not deleted) — reject with 403
  if (dbUser.is_active === 0 && !dbUser.is_deleted) return error('Your account has been blocked', 403);

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

  return json({ ...dbUser, is_active: 1 });
}

// Accept both PUT and PATCH for profile updates
export async function PATCH(request: NextRequest) {
  return PUT(request);
}

export async function PUT(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const body = await request.json().catch(() => ({}));
  const { name, room_number, avatar_url, description, creator_image_url, creator_link } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (name !== undefined) updates.name = sanitizeHtml(name);
  if (room_number !== undefined) updates.room_number = sanitizeHtml(room_number);
  if (avatar_url !== undefined) updates.avatar_url = avatar_url || null;
  if (description !== undefined) updates.description = sanitizeHtml(description);
  if (creator_image_url !== undefined) updates.creator_image_url = creator_image_url || null;
  if (creator_link !== undefined) updates.creator_link = sanitizeHtml(creator_link);

  // Check current state before updating
  const { data: currentUser } = await db.from('users')
    .select('profile_completed, name, room_number').eq('id', userId).single();
  const wasIncomplete = !currentUser?.profile_completed;

  // Mark profile complete when both name and room_number are being set
  if (updates.name !== undefined && updates.room_number !== undefined) {
    updates.profile_completed = true;
  }

  await db.from('users').update(updates).eq('id', userId);

  // First-ever profile completion: system message + welcome email
  if (wasIncomplete && updates.profile_completed && updates.name && updates.room_number) {
    await db.from('system_messages').insert({
      type: 'user_joined',
      user_id: userId,
      message: `${updates.name} from Room ${updates.room_number} joined Next Door`,
      metadata: JSON.stringify({ name: updates.name, room_number: updates.room_number, avatar_url: avatar_url || null }),
    });

    // Send welcome email (fire-and-forget — don't block the response)
    const { data: userRecord } = await db.from('users').select('email').eq('id', userId).single();
    if (userRecord?.email?.includes('@')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';
      const { subject, html } = buildWelcomeEmail(updates.name as string, appUrl);
      sendEmail(userRecord.email, subject, html).catch(() => {});
    }
  }

  const { data: updatedUser } = await db.from('users').select('*').eq('id', userId).single();
  return json(updatedUser);
}
