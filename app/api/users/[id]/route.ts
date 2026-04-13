import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';
import { buildAccountDeletedEmail } from '@/src/lib/email-templates';
import { sendEmail } from '@/src/lib/send-email';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { id } = await params;
  const db = getServiceClient();
  const { data: user } = await db
    .from('users')
    .select('id, name, room_number, avatar_url, is_admin, is_active, is_deleted, created_at')
    .eq('id', id)
    .single();

  if (!user) return error('User not found', 404);
  return json(user);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) return error('Only admins can delete users', 403);

  const { id: targetId } = await params;
  if (targetId === userId) return error('You cannot delete your own account', 400);

  // Fetch email BEFORE anonymizing — needed for deletion notification
  const { data: targetUser } = await db.from('users').select('name, email, room_number').eq('id', targetId).single();

  // Clean up user associations (keep messages — anonymized below)
  await db.from('reactions').delete().eq('user_id', targetId);
  await db.from('notifications').delete().or(`user_id.eq.${targetId},mentioned_by_user_id.eq.${targetId}`);
  await db.from('message_reads').delete().eq('user_id', targetId);
  await db.from('system_messages').delete().eq('user_id', targetId);
  await db.from('event_message_reads').delete().eq('user_id', targetId);
  await db.from('event_message_reactions').delete().eq('user_id', targetId);
  await db.from('email_notification_users').delete().eq('user_id', targetId);
  await db.from('event_members').delete().eq('user_id', targetId);

  // Delete active events created by this user
  const { data: userEvents } = await db.from('events').select('id').eq('creator_user_id', targetId);
  for (const evt of (userEvents || [])) {
    await db.from('event_members').delete().eq('event_id', evt.id);
    await db.from('events').delete().eq('id', evt.id);
  }

  // Anonymize the user record
  await db.from('users').update({
    name: 'Deleted User',
    email: `deleted_${targetId}@deleted.com`,
    avatar_url: null,
    room_number: null,
    is_deleted: true,
    is_active: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', targetId);

  // Invalidate session immediately but keep Supabase Auth account so they can re-register
  await db.auth.admin.signOut(targetId, 'global');

  if (targetUser) {
    await db.from('system_messages').insert({
      type: 'user_deleted', user_id: targetId,
      message: `${(targetUser as Record<string, unknown>).name || 'User'} was deleted`,
      metadata: JSON.stringify({ message_type: 'user_deleted', name: (targetUser as Record<string, unknown>).name, room_number: (targetUser as Record<string, unknown>).room_number }),
    });
    // Notify the user by email (send before auth record is removed)
    const email = (targetUser as Record<string, unknown>).email as string | null;
    if (email?.includes('@')) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';
      const { subject, html } = buildAccountDeletedEmail(
        ((targetUser as Record<string, unknown>).name as string) || 'there',
        appUrl,
      );
      await sendEmail(email, subject, html);
    }
  }

  return json({ success: true });
}
