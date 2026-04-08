import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // --- diagnostic logging (visible in Vercel function logs) ---
  console.log('[auth/callback] code present:', !!code)
  console.log('[auth/callback] SUPABASE_URL prefix:', (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').slice(0, 10) || '(not set)')
  console.log('[auth/callback] ANON_KEY prefix:', (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').slice(0, 10) || '(not set)')

  if (!code) {
    console.error('[auth/callback] No code in request — redirecting to error')
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent('No authorization code received from Google.')}`)
  }

  const cookieStore = cookies()

  // Log whether the PKCE verifier cookie is present
  const allCookies = cookieStore.getAll()
  const pkceCookie = allCookies.find(c => c.name.includes('code-verifier') || c.name.includes('pkce'))
  console.log('[auth/callback] cookies count:', allCookies.length)
  console.log('[auth/callback] pkce verifier cookie:', pkceCookie ? `found (${pkceCookie.name})` : 'NOT FOUND')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession failed:', JSON.stringify({
      message: error.message,
      status: error.status,
      name: error.name,
    }))
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    )
  }

  console.log('[auth/callback] exchange succeeded — redirecting to complete')
  return NextResponse.redirect(`${origin}/auth/callback/complete`)
}
