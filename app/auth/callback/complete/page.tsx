'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackComplete() {
  const router = useRouter()
  const [status, setStatus] = useState('Completing sign in...')

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      setStatus('Session not found — redirecting...')
      router.replace('/?error=session')
    }, 3000)

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (timedOut) return

      if (session) {
        clearTimeout(timeout)
        // Check profile completion before deciding where to send the user
        try {
          const res = await fetch('/api/profile', { credentials: 'include' })
          if (res.ok) {
            const data = await res.json()
            router.replace(data.profile_completed ? '/chat' : '/profile/setup')
          } else {
            router.replace('/profile/setup')
          }
        } catch {
          router.replace('/profile/setup')
        }
      }
      // If no session yet, the timeout will handle the fallback
    }

    // Check immediately, then listen for the auth state change event in case
    // the cookie hasn't propagated to the browser client quite yet
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (timedOut) return
      if (session) {
        clearTimeout(timeout)
        fetch('/api/profile', { credentials: 'include' })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            router.replace(data?.profile_completed ? '/chat' : '/profile/setup')
          })
          .catch(() => router.replace('/profile/setup'))
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center">
      <div className="text-white text-xl">{status}</div>
    </div>
  )
}
