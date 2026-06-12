import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

// PUT /api/event-messages/:msgId - edit (within 20 min)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { msgId } = await params;
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: msg } = await db.from('event_messages').select('created_at, user_id').eq('id', parseInt(msgId)).maybeSingle();
  if (!msg || msg.user_id !== userId) return error("Message not found or you don't have permission to edit it", 403);

  const timeDiff = Date.now() - new Date(msg.created_at).getTime();
  if (timeDiff > 20 * 60 * 1000) return error('Cannot edit message after 20 minutes', 400);

  const body = await request.json().catch(() => ({}));
  const { content } = body;
  if (!content?.trim() || content.length > 5000) return error('Invalid content', 400);

  await db.from('event_messages').update({ content: sanitizeHtml(content.trim()), updated_at: new Date().toISOString() }).eq('id', parseInt(msgId));

  return json({ success: true });
}

// DELETE /api/event-messages/:msgId - delete (within 20 min)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { msgId } = await params;
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: msg } = await db.from('event_messages').select('created_at, user_id').eq('id', parseInt(msgId)).maybeSingle();
  if (!msg || msg.user_id !== userId) return error("Message not found or you don't have permission to delete it", 403);

  const timeDiff = Date.now() - new Date(msg.created_at).getTime();
  if (timeDiff > 20 * 60 * 1000) return error('Cannot delete message after 20 minutes', 400);

  // Delete related records
  await db.from('event_message_attachments').delete().eq('event_message_id', parseInt(msgId));
  await db.from('event_message_reactions').delete().eq('event_message_id', parseInt(msgId));
  await db.from('event_message_reads').delete().eq('event_message_id', parseInt(msgId));

  // Soft delete
  await db.from('event_messages').update({ is_deleted: true, content: '', updated_at: new Date().toISOString() }).eq('id', parseInt(msgId));

  return json({ success: true });
}
