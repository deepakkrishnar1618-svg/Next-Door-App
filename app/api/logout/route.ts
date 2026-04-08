import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json } from '@/src/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();

  if (userId) {
    const db = getServiceClient();
    // Get the latest message ID to save as read position before logging out
    const { data: latest } = await db.from('messages')
      .select('id')
      .or('group_id.eq.main,group_id.is.null')
      .order('id', { ascending: false })
      .limit(1)
      .single();
    await db.from('users').update({
      is_online: false,
      last_seen_at: new Date().toISOString(),
      ...(latest ? { last_read_message_id: latest.id } : {}),
    }).eq('id', userId);
  }

  // Sign out from Supabase
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  await supabase.auth.signOut();

  return json({ success: true });
}
