import { type NextRequest } from 'next/server';
import { updateSession } from '@/src/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - auth/callback  ← MUST be excluded: middleware's getUser() can invalidate
     *                    the PKCE code_verifier cookie before the route handler
     *                    gets to exchange it, silently breaking OAuth sign-in.
     * - _next/static, _next/image  (Next.js internals)
     * - favicon.ico and common static asset extensions
     * - api/  (API routes handle their own auth via authenticate())
     */
    '/((?!auth/callback|_next/static|_next/image|favicon\\.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
