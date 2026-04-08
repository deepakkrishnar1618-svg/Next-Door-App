import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json } from '@/src/lib/api-helpers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();

  if (userId) {
    const db = getServiceClient();
    await db.from('users').update({ is_online: false, last_seen_at: new Date().toISOString() }).eq('id', userId);
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
