import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function DELETE(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can delete messages', 403);

  const body = await request.json().catch(() => ({}));
  const { months_old } = body;
  if (!months_old || typeof months_old !== 'number') return error('months_old is required', 400);

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - months_old);
  const cutoffTimestamp = cutoffDate.toISOString();

  // Delete old main messages and related data
  const { data: oldMessages } = await db.from('messages').select('id').lt('created_at', cutoffTimestamp);
  const messageIds = (oldMessages || []).map((m: { id: number }) => m.id);
  let deletedCount = messageIds.length;

  if (messageIds.length > 0) {
    await db.from('reactions').delete().in('message_id', messageIds);
    await db.from('attachments').delete().in('message_id', messageIds);
    await db.from('message_reads').delete().in('message_id', messageIds);
    await db.from('notifications').delete().in('message_id', messageIds);
    await db.from('messages').delete().in('id', messageIds);
  }

  // Delete old event messages
  const { data: oldEventMsgs } = await db.from('event_messages').select('id').lt('created_at', cutoffTimestamp);
  const evtMsgIds = (oldEventMsgs || []).map((m: { id: number }) => m.id);
  if (evtMsgIds.length > 0) {
    await db.from('event_message_reactions').delete().in('event_message_id', evtMsgIds);
    await db.from('event_message_attachments').delete().in('event_message_id', evtMsgIds);
    await db.from('event_message_reads').delete().in('event_message_id', evtMsgIds);
    await db.from('event_messages').delete().in('id', evtMsgIds);
  }

  // Delete old listing messages
  const { data: oldListingMsgs } = await db.from('listing_messages').select('id').lt('created_at', cutoffTimestamp);
  const lstMsgIds = (oldListingMsgs || []).map((m: { id: number }) => m.id);
  if (lstMsgIds.length > 0) {
    await db.from('listing_message_reactions').delete().in('listing_message_id', lstMsgIds);
    await db.from('listing_message_attachments').delete().in('listing_message_id', lstMsgIds);
    await db.from('listing_message_reads').delete().in('listing_message_id', lstMsgIds);
    await db.from('listing_messages').delete().in('id', lstMsgIds);
  }

  // Delete old history
  const { data: oldEventHistory } = await db.from('event_history').select('id').lt('ended_at', cutoffTimestamp);
  const evtHistIds = (oldEventHistory || []).map((h: { id: number }) => h.id);
  if (evtHistIds.length > 0) {
    await db.from('event_history_attendees').delete().in('event_history_id', evtHistIds);
    await db.from('event_history').delete().in('id', evtHistIds);
  }

  const { data: oldListingHistory } = await db.from('market_listing_history').select('id').lt('ended_at', cutoffTimestamp);
  const lstHistIds = (oldListingHistory || []).map((h: { id: number }) => h.id);
  if (lstHistIds.length > 0) {
    await db.from('market_listing_history_interested').delete().in('listing_history_id', lstHistIds);
    await db.from('market_listing_history').delete().in('id', lstHistIds);
  }

  await db.from('market_transactions').delete().lt('closed_at', cutoffTimestamp);

  return json({ success: true, deleted_count: deletedCount });
}
