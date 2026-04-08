'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function AuthError() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') ?? 'An unknown authentication error occurred.'

  return (
    <div className="min-h-screen bg-[#021112] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white mb-3">
          Sign-in failed
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 font-mono break-all">
          {message}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
          Copy the error above and share it when reporting this issue.
        </p>
        <a
          href="/"
          className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-8 rounded-xl transition-all duration-200 shadow-md"
        >
          Try again
        </a>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthError />
    </Suspense>
  )
}
