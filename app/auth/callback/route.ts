import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  // With implicit flow, Supabase returns tokens as a URL hash fragment
  // (e.g. #access_token=...&refresh_token=...). Hash fragments are never
  // sent to the server, so there is nothing to exchange here.
  // Redirect to the client-side complete page which calls getSession()
  // to pick up the tokens from the hash.
  return NextResponse.redirect(`${origin}/auth/callback/complete`)
}
