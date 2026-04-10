import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) return error('Only admins can delete reminders', 403);

  // Get the reminder to find the linked message_id
  const { data: reminder } = await db.from('reminders').select('message_id').eq('id', id).single();

  await db.from('reminders').delete().eq('id', id);

  // Bidirectional: also clear the announcement flag on the message
  if (reminder?.message_id) {
    await db.from('messages').update({
      is_active_announcement: false,
      updated_at: new Date().toISOString(),
    }).eq('id', reminder.message_id);

    // Remove announcement notifications for all users linked to this message
    await db.from('notifications').delete()
      .eq('message_id', reminder.message_id)
      .eq('type', 'mention'); // clear any mention-type notifications for this message
  }

  return json({ success: true });
}
