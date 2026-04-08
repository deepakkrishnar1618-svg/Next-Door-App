import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { id } = await params;
  const db = getServiceClient();
  const { data: msg } = await db.from('messages').select('*').eq('id', parseInt(id)).single();
  if (!msg) return error('Message not found', 404);

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  const isAdmin = caller?.is_admin === 1 || caller?.is_admin === true;
  if (msg.user_id !== userId && !isAdmin) return error('Not authorized', 403);

  // 20-minute edit window (non-admins)
  if (!isAdmin) {
    const created = new Date(msg.created_at).getTime();
    if (Date.now() - created > 20 * 60 * 1000) return error('Edit window has expired', 403);
  }

  const body = await request.json().catch(() => ({}));
  const sanitized = sanitizeHtml(body.content || '');
  if (!sanitized) return error('Content is required', 400);

  await db.from('messages').update({ content: sanitized, is_edited: true, updated_at: new Date().toISOString() }).eq('id', parseInt(id));
  return json({ success: true });
}

// Frontend sends PUT for edits
export const PUT = PATCH;

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { id } = await params;
  const db = getServiceClient();
  const { data: msg } = await db.from('messages').select('*').eq('id', parseInt(id)).single();
  if (!msg) return error('Message not found', 404);

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  const isAdmin = caller?.is_admin === 1 || caller?.is_admin === true;
  if (msg.user_id !== userId && !isAdmin) return error('Not authorized', 403);

  await db.from('messages').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', parseInt(id));
  await db.from('reactions').delete().eq('message_id', parseInt(id));
  await db.from('message_reads').delete().eq('message_id', parseInt(id));
  return json({ success: true });
}
