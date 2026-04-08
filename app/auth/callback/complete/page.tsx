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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'implicit',
        },
      }
    )

    let timedOut = false

    const timeout = setTimeout(() => {
      timedOut = true
      setStatus('Session not found — redirecting...')
      router.replace('/?error=session')
    }, 5000)

    const navigate = (session: { user: unknown } | null) => {
      if (timedOut) return
      clearTimeout(timeout)
      if (!session) {
        router.replace('/?error=session')
        return
      }
      fetch('/api/profile', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          router.replace(data?.profile_completed ? '/chat' : '/profile/setup')
        })
        .catch(() => router.replace('/profile/setup'))
    }

    // onAuthStateChange fires with SIGNED_IN as soon as the implicit flow
    // tokens from the URL hash are detected by the Supabase client.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate(session)
    })

    // Also check immediately in case the event already fired
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(session)
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
