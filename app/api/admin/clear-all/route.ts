import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function DELETE(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can clear all data', 403);

  // Main chat
  await db.from('reactions').delete().neq('id', 0);
  await db.from('attachments').delete().neq('id', 0);
  await db.from('message_reads').delete().neq('id', 0);
  await db.from('notifications').delete().neq('id', 0);
  await db.from('messages').delete().neq('id', 0);
  await db.from('system_messages').delete().neq('id', 0);
  await db.from('users').update({ last_read_message_id: null }).neq('id', '');

  // Events
  await db.from('event_message_reactions').delete().neq('id', 0);
  await db.from('event_message_attachments').delete().neq('id', 0);
  await db.from('event_message_reads').delete().neq('id', 0);
  await db.from('event_messages').delete().neq('id', 0);
  await db.from('event_members').delete().neq('id', 0);
  await db.from('events').delete().neq('id', 0);
  await db.from('event_history_attendees').delete().neq('id', 0);
  await db.from('event_history').delete().neq('id', 0);

  // Listings
  await db.from('listing_message_reactions').delete().neq('id', 0);
  await db.from('listing_message_attachments').delete().neq('id', 0);
  await db.from('listing_message_reads').delete().neq('id', 0);
  await db.from('listing_messages').delete().neq('id', 0);
  await db.from('market_listing_interested').delete().neq('id', 0);
  await db.from('market_listing_images').delete().neq('id', 0);
  await db.from('market_listings').delete().neq('id', 0);
  await db.from('market_listing_history_interested').delete().neq('id', 0);
  await db.from('market_listing_history').delete().neq('id', 0);
  await db.from('market_transactions').delete().neq('id', 0);

  await db.from('typing_status').delete().neq('id', 0);

  return json({ success: true });
}
