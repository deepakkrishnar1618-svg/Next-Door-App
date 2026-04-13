'use client'

/**
 * Google OAuth callback page.
 *
 * Supabase can return tokens in two ways depending on the project's auth settings:
 *
 *   Implicit flow:  /auth/callback#access_token=xxx&refresh_token=yyy
 *   PKCE flow:      /auth/callback?code=xxx
 *
 * Hash fragments (#...) are NEVER sent to the server — only readable client-side.
 * That's why this must be a client component at the exact URL Google redirects to.
 *
 * Strategy:
 *  1. If ?code= is in the URL → exchange it (handles PKCE / Supabase default)
 *  2. If #access_token is in the hash → createBrowserClient auto-parses it (implicit)
 *  3. Poll getSession() as a fallback for both paths
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [status, setStatus] = useState('Signing you in…')
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
          detectSessionInUrl: true,
        },
      }
    )

    let cancelled = false
    let attemptCount = 0
    const MAX_ATTEMPTS = 15

    const redirectToApp = async () => {
      try {
        const res = await fetch('/api/profile', { credentials: 'include' })
        const data = res.ok ? await res.json() : null
        if (data?.profile_completed) {
          router.replace('/chat')
        } else {
          // New user — show onboarding welcome screens before profile setup
          router.replace('/onboarding')
        }
      } catch {
        router.replace('/onboarding')
      }
    }

    const run = async () => {
      // Path 1: PKCE — exchange ?code= for a session
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        setStatus('Exchanging code…')
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error && !cancelled) {
          cancelled = true
          await redirectToApp()
          return
        }
      }

      // Path 2: Implicit — onAuthStateChange fires when hash is parsed on mount
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (cancelled) return
        if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
          cancelled = true
          subscription.unsubscribe()
          redirectToApp()
        }
      })

      // Path 3: Poll getSession() — catches both paths if event already fired
      while (attemptCount < MAX_ATTEMPTS && !cancelled) {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) break
        if (session) {
          cancelled = true
          subscription.unsubscribe()
          await redirectToApp()
          return
        }
        attemptCount++
        setAttempts(attemptCount)
        await new Promise(r => setTimeout(r, 1000))
      }

      if (!cancelled) {
        subscription.unsubscribe()
        setStatus('Could not sign in — please try again.')
        await new Promise(r => setTimeout(r, 2000))
        router.replace('/')
      }
    }

    run()
  }, [router])

  return (
    <div className="min-h-screen bg-[#021112] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <div className="text-white text-lg">{status}</div>
      {attempts > 0 && attempts < 15 && (
        <div className="text-slate-400 text-sm">Waiting for session… ({attempts}/15)</div>
      )}
    </div>
  )
}
