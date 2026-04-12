import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

const DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
  'text/plain',
];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id: targetId } = await params;
  const db = getServiceClient();

  const { data: userMsgIds } = await db
    .from('messages')
    .select('id')
    .eq('user_id', targetId)
    .eq('group_id', 'main')
    .or('is_deleted.is.null,is_deleted.eq.false');

  const idSet = new Set((userMsgIds || []).map((m: { id: number }) => m.id));
  if (idSet.size === 0) return json([]);

  const { data: attachmentRows } = await db
    .from('attachments')
    .select('id, filename, file_key, file_size, content_type, created_at')
    .in('message_id', Array.from(idSet))
    .in('content_type', DOC_TYPES)
    .order('created_at', { ascending: false });

  const docs = (attachmentRows || []).map((a: Record<string, unknown>) => ({
    id: a.id,
    filename: a.filename,
    file_key: a.file_key,
    file_size: a.file_size,
    content_type: a.content_type,
    created_at: a.created_at,
    url: `/api/files/${a.file_key}`,
  }));

  return json(docs);
}
