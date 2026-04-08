import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { id } = await params;
  const db = getServiceClient();
  const { data: user } = await db
    .from('users')
    .select('id, name, room_number, avatar_url, is_admin, is_active, is_deleted, created_at')
    .eq('id', id)
    .single();

  if (!user) return error('User not found', 404);
  return json(user);
}
