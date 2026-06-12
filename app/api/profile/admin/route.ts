import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  // Public endpoint - no auth required to view the creator profile
  const db = getServiceClient();

  // Try ADMIN_EMAIL first, fall back to any admin user
  const adminEmail = process.env.ADMIN_EMAIL;
  let adminUser = null;

  if (adminEmail) {
    const { data } = await db
      .from('users')
      .select('id, name, email, room_number, avatar_url, description, creator_image_url, creator_link, is_admin')
      .eq('email', adminEmail)
      .maybeSingle();
    adminUser = data;
  }

  if (!adminUser) {
    // Fall back to first admin user
    const { data } = await db
      .from('users')
      .select('id, name, email, room_number, avatar_url, description, creator_image_url, creator_link, is_admin')
      .or('is_admin.eq.true,is_admin.eq.1')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    adminUser = data;
  }

  if (!adminUser) return error('Creator profile not found', 404);
  return json(adminUser);
}

export async function PATCH(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) {
    return error('Only admins can update the creator profile', 403);
  }

  const body = await request.json().catch(() => ({}));
  const { description, creator_image_url, creator_link } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (description !== undefined) updates.description = description;
  if (creator_image_url !== undefined) updates.creator_image_url = creator_image_url;
  if (creator_link !== undefined) updates.creator_link = creator_link;

  const { data: updatedUser, error: updateErr } = await db
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('id, name, email, room_number, avatar_url, description, creator_image_url, creator_link, is_admin')
    .single();

  if (updateErr) return error('Failed to update creator profile', 500);
  return json(updatedUser);
}
