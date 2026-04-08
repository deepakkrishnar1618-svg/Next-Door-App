import { NextRequest, NextResponse } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can export user data', 403);

  const format = request.nextUrl.searchParams.get('format') || 'csv';

  const { data: users } = await db
    .from('users')
    .select('id, name, room_number, email, avatar_url, created_at, is_admin, is_online, is_active')
    .eq('profile_completed', true)
    .order('name', { ascending: true });

  if (format === 'json') {
    return json({ users: users || [], exportedAt: new Date().toISOString() });
  }

  // CSV
  const headers = ['Name', 'Room Number', 'Email', 'Avatar URL', 'Admin', 'Online', 'Active', 'Joined Date'];
  const rows = [headers.join(',')];
  for (const u of (users || []) as Record<string, unknown>[]) {
    rows.push([
      `"${String(u.name || '').replace(/"/g, '""')}"`,
      `"${String(u.room_number || '').replace(/"/g, '""')}"`,
      `"${String(u.email || '').replace(/"/g, '""')}"`,
      `"${String(u.avatar_url || '').replace(/"/g, '""')}"`,
      (u.is_admin === 1 || u.is_admin === true) ? 'Yes' : 'No',
      (u.is_online === 1 || u.is_online === true) ? 'Yes' : 'No',
      (u.is_active === 1 || u.is_active === true) ? 'Yes' : 'No',
      `"${new Date(u.created_at as string).toLocaleDateString()}"`,
    ].join(','));
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="nextdoor-users-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
