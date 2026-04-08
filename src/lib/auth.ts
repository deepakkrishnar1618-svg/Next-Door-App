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
 * Require authentication — redirects to / if not logged in.
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
export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${APP_URL}/auth/callback`,
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
