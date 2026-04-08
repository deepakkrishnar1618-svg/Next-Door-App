import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: dbUser } = await db.from('users').select('*').eq('id', userId).single();

  if (!dbUser) return error('User not found', 404);
  if (dbUser.is_active === 0) {
    if (dbUser.is_deleted) return error('Your account has been deleted', 403);
    return error('Your account has been deactivated', 403);
  }

  await db.from('users').update({ is_online: true, last_seen_at: new Date().toISOString() }).eq('id', userId);
  return json(dbUser);
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

  // Check if first-time profile completion
  const { data: currentUser } = await db.from('users').select('profile_completed, name, room_number').eq('id', userId).single();
  const isFirstTimeComplete = currentUser?.profile_completed === false || currentUser?.profile_completed === 0;

  if (updates.name !== undefined && updates.room_number !== undefined) {
    updates.profile_completed = true;
  }

  await db.from('users').update(updates).eq('id', userId);

  // Create join system message on first profile completion
  if (isFirstTimeComplete && updates.name && updates.room_number) {
    await db.from('system_messages').insert({
      type: 'user_joined',
      user_id: userId,
      message: `${updates.name} from Room ${updates.room_number} joined Next Door`,
      metadata: JSON.stringify({ name: updates.name, room_number: updates.room_number, avatar_url: avatar_url || null }),
    });
  }

  const { data: updatedUser } = await db.from('users').select('*').eq('id', userId).single();
  return json(updatedUser);
}
