'use client'

/**
 * Auth callback completion page (referenced by other parts of the app).
 * The real session pickup happens in /auth/callback/page.tsx which sits
 * at the URL Google actually redirects to, preserving the hash fragment.
 * This page just shows a loading state and waits for the session that the
 * parent page already established.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackComplete() {
  const router = useRouter()
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState('Signing you in…')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: 'implicit' } }
    )

    let cancelled = false
    let attemptCount = 0
    const MAX_ATTEMPTS = 15

    const redirectToApp = async () => {
      try {
        const { data } = await fetch('/api/profile', { credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null)
        router.replace(data?.profile_completed ? '/chat' : '/profile/setup')
      } catch {
        router.replace('/profile/setup')
      }
    }

    // Listen for auth state change — fires as soon as the hash token is parsed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (session) {
        cancelled = true
        redirectToApp()
      }
    })

    // Also poll getSession() in case onAuthStateChange already fired before we subscribed
    const poll = async () => {
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
        if (attemptCount >= MAX_ATTEMPTS) break
        await new Promise(r => setTimeout(r, 1000))
      }
      if (!cancelled) {
        setStatus('Could not sign in — please try again.')
        await new Promise(r => setTimeout(r, 2000))
        router.replace('/')
      }
    }

    poll()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
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
