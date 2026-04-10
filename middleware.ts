import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Check if blocked user is trying to access app (skip /blocked, /api/*, and auth routes)
  if (user && !pathname.startsWith('/blocked') && !pathname.startsWith('/api/') && pathname !== '/') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=is_active`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
          },
        }
      )
      const rows: Array<{ is_active: number | null }> = await res.json()
      if (Array.isArray(rows) && rows.length > 0 && rows[0].is_active === 0) {
        const blockedUrl = request.nextUrl.clone()
        blockedUrl.pathname = '/blocked'
        return NextResponse.redirect(blockedUrl)
      }
    } catch {
      // If DB check fails, allow through — don't block users due to middleware errors
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
