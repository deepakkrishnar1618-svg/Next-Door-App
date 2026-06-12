'use server';

import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Get the currently logged-in Supabase user (server-side).
 * Returns null if not logged in.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

/**
 * Require authentication - redirects to / if not logged in.
 * Use this in Server Components / Server Actions.
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }
  return user;
}

/**
 * Trigger Google OAuth sign-in via Supabase.
 */
export async function signInWithGoogle(requestOrigin?: string) {
  const supabase = await createClient();
  // Prefer explicit APP_URL env var; fall back to the request's origin so the
  // redirectTo is always an absolute URL (Supabase rejects relative URLs).
  const baseUrl = APP_URL || requestOrigin || 'http://localhost:3000';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${baseUrl}/auth/callback`,
    },
  });

  if (error) throw error;
  if (data.url) redirect(data.url);
}

/**
 * Sign out the current user and redirect to /.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
