import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'

/**
 * Google OAuth callback (PKCE flow) — server route handler.
 *
 * Supabase's browser client (@supabase/ssr) forces flowType: "pkce" and
 * detectSessionInUrl: true, and is a cached singleton. Exchanging the code in a
 * client component therefore raced the client's own auto-exchange for the same
 * single-use code/verifier and failed. Doing the exchange here, server-side, is
 * the canonical SSR pattern: it runs exactly once and writes session cookies the
 * server (middleware, /api/profile) can read.
 *
 * The PKCE code verifier was stored as a (non-httpOnly) cookie by the browser
 * client when sign-in started, so it is sent with this request and is readable here.
 *
 * After a successful exchange we hand off to /auth/callback/complete, which calls
 * /api/profile to route the user to /chat, /profile/setup, or /blocked.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?error=oauth`)
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/?error=exchange`)
  }

  // Session cookies are now set. The completion page decides where to go next.
  return NextResponse.redirect(`${origin}/auth/callback/complete`)
}
