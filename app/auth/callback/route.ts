import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/src/lib/supabase/server'
import { bootstrapUser } from '@/src/lib/user-bootstrap'

/**
 * Google OAuth callback (PKCE flow) - server route handler.
 *
 * Supabase's browser client (@supabase/ssr) forces flowType: "pkce" and
 * detectSessionInUrl: true, and is a cached singleton. Exchanging the code in a
 * client component therefore raced the client's own auto-exchange for the same
 * single-use code/verifier and failed. Doing the exchange here, server-side, is
 * the canonical SSR pattern: it runs exactly once and writes session cookies the
 * server (middleware, /api/profile) can read.
 *
 * We also resolve the final destination here - /chat, /profile/setup, or
 * /blocked - using the service client directly. Previously this was deferred to
 * a client page that re-checked the session via the browser client, which raced
 * cookie propagation and intermittently bounced new sign-ins back to the home
 * page (so a second attempt was needed). Deciding the route server-side, on the
 * same response that sets the session cookies, removes that race entirely.
 *
 * The PKCE code verifier was stored as a (non-httpOnly) cookie by the browser
 * client when sign-in started, so it is sent with this request and readable here.
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
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/?error=exchange`)
  }

  // Session cookies are now set on this response. Resolve where to send the user.
  let result
  try {
    result = await bootstrapUser(data.user.id, data.user.email ?? null)
  } catch {
    return NextResponse.redirect(`${origin}/?error=bootstrap`)
  }

  if (result.status === 'blocked') {
    return NextResponse.redirect(`${origin}/blocked`)
  }

  return NextResponse.redirect(
    `${origin}${result.user.profile_completed ? '/chat' : '/profile/setup'}`
  )
}
