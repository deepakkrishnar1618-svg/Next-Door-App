import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id: targetId } = await params;
  const db = getServiceClient();

  const { data: messages } = await db
    .from('messages')
    .select('id, content, created_at')
    .eq('user_id', targetId)
    .eq('group_id', 'main')
    .or('is_deleted.is.null,is_deleted.eq.false')
    .or('content.ilike.%http://%,content.ilike.%https://%')
    .order('created_at', { ascending: false })
    .limit(200);

  const urlRegex = /(https?:\/\/[^\s]+)/g;

  const links: Array<{ id: number; url: string; snippet: string; created_at: string }> = [];
  for (const msg of (messages || [])) {
    const rec = msg as Record<string, unknown>;
    const content = (rec.content as string) || '';
    const urls = content.match(urlRegex);
    if (!urls) continue;
    for (const url of urls) {
      links.push({
        id: rec.id as number,
        url,
        snippet: content.length > 80 ? content.slice(0, 80) + '…' : content,
        created_at: rec.created_at as string,
      });
    }
  }

  return json(links);
}
