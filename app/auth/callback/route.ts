import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // NEXT_PUBLIC_APP_URL must match what's registered in Supabase + Google OAuth
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (code) {
    // Create the redirect response FIRST so we can write session cookies directly onto it.
    // Using NextResponse.redirect() + then setting cookies on a separate object causes the
    // cookies to be lost — the session must be set on the same response object that is returned.
    const response = NextResponse.redirect(`${appUrl}/auth/callback-complete`);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Write session cookies directly to the redirect response
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user from the just-exchanged session
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Use service client directly — we cannot forward request cookies because
        // the new session token is on `response`, not on the incoming request cookies.
        try {
          const db = getServiceClient();
          const userEmail = user.email || '';
          const isAdmin = userEmail === ADMIN_EMAIL;

          const { data: existingUser } = await db
            .from('users')
            .select('id, is_active, is_deleted')
            .eq('id', user.id)
            .single();

          if (!existingUser) {
            // Check for a previously deleted account with the same email
            const { data: deletedUser } = await db
              .from('users')
              .select('id')
              .eq('email', userEmail)
              .eq('is_deleted', true)
              .maybeSingle();

            if (deletedUser) {
              await db.from('users').update({ email: null }).eq('id', deletedUser.id);
            } else {
              // Check if blocked
              const { data: blockedUser } = await db
                .from('users')
                .select('id, is_deleted')
                .eq('email', userEmail)
                .eq('is_active', 0)
                .maybeSingle();

              if (blockedUser && !blockedUser.is_deleted) {
                return NextResponse.redirect(`${appUrl}/?error=blocked`);
              }
            }

            await db.from('users').insert({
              id: user.id,
              email: userEmail,
              is_admin: isAdmin,
              is_online: true,
              profile_completed: false,
            });
          } else {
            if (existingUser.is_active === 0 && !existingUser.is_deleted) {
              return NextResponse.redirect(`${appUrl}/?error=blocked`);
            }
            if (existingUser.is_deleted) {
              await db.from('users').update({
                name: null, room_number: null, avatar_url: null,
                is_deleted: false, is_active: 1, is_online: true,
                profile_completed: false, updated_at: new Date().toISOString(),
              }).eq('id', user.id);
            } else {
              await db.from('users').update({
                is_online: true,
                updated_at: new Date().toISOString(),
              }).eq('id', user.id);
            }
          }
        } catch {
          // Non-fatal — profile check page handles missing user records
        }
      }

      return response;
    }
  }

  return NextResponse.redirect(`${appUrl}/?error=auth`);
}
