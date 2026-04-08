import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'deepak2shuttle@gmail.com';

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const body = await request.json().catch(() => ({}));
  const userEmail: string = body.email || '';

  const { data: existingUser } = await db.from('users').select('*').eq('id', userId).single();
  const isAdmin = userEmail === ADMIN_EMAIL;

  if (!existingUser) {
    // Check for deleted user with same email
    const { data: deletedUser } = await db.from('users')
      .select('*').eq('email', userEmail).eq('is_deleted', true).maybeSingle();

    if (deletedUser) {
      await db.from('users').update({ email: null }).eq('id', deletedUser.id);
      await db.from('users').insert({
        id: userId, email: userEmail, is_admin: isAdmin, is_active: 1, is_online: true, profile_completed: false,
      });
    } else {
      // Check if blocked
      const { data: blockedUser } = await db.from('users')
        .select('*').eq('email', userEmail).eq('is_active', 0).maybeSingle();
      if (blockedUser && !blockedUser.is_deleted) {
        return error('Your account has been blocked', 403);
      }
      await db.from('users').insert({
        id: userId, email: userEmail, is_admin: isAdmin, is_active: 1, is_online: true, profile_completed: false,
      });
    }
  } else {
    if (existingUser.is_active === 0 && !existingUser.is_deleted) {
      return error('Your account has been blocked', 403);
    }
    if (existingUser.is_deleted) {
      await db.from('users').update({
        name: null, room_number: null, avatar_url: null,
        is_deleted: false, is_active: 1, is_online: true, profile_completed: false,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
    } else {
      await db.from('users').update({ is_online: true, updated_at: new Date().toISOString() }).eq('id', userId);
    }
  }

  return json({ success: true });
}
