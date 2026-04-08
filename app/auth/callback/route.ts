import { NextResponse } from 'next/server';
import { createClient } from '@/src/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if the user has completed their profile
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Upsert the user into our DB via the API (handled by POST /api/sessions)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;
        try {
          await fetch(`${appUrl}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': request.headers.get('cookie') || '' },
            body: JSON.stringify({ supabase_user_id: user.id, email: user.email }),
          });
        } catch {
          // Non-fatal — profile check will handle redirect
        }
      }

      // Redirect to auth callback page which checks profile completion
      return NextResponse.redirect(`${origin}/auth/callback-complete`);
    }
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
