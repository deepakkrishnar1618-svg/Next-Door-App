import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';
import { createClient } from '@/src/lib/supabase/server';
import { bootstrapUser } from '@/src/lib/user-bootstrap';
import { buildWelcomeEmail } from '@/src/lib/email-templates';
import { sendEmail } from '@/src/lib/send-email';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  // Get the Supabase auth user to obtain their email for first-time upsert
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  const userEmail = authUser?.email || null;
  const isAnonymous = authUser?.is_anonymous ?? false;

  let result;
  try {
    result = await bootstrapUser(userId, userEmail, { isAnonymous });
  } catch {
    return error('Failed to create user record', 500);
  }
  if (result.status === 'blocked') return error('Your account has been blocked', 403);

  return json(result.user);
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
