/**
 * Shared helpers for Next.js API Route Handlers.
 * Replaces Hono/Cloudflare Worker patterns with Next.js equivalents.
 */

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from './supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export type { NextResponse };

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Get the Supabase service-role client (bypasses RLS) for use in API routes */
export function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Authenticate the request, returning the user's Supabase ID or null */
export async function authenticate(): Promise<string | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the app user record from our DB given a Supabase auth user ID.
 * Uses the service client so RLS doesn't block it.
 */
export async function getDbUser(supabaseUserId: string) {
  const db = getServiceClient();
  const { data } = await db.from('users').select('*').eq('id', supabaseUserId).single();
  return data;
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'deepak2shuttle@gmail.com';

export function isAdminEmail(email: string) {
  return email === ADMIN_EMAIL;
}

/** Sanitize HTML to prevent XSS (server-side, no DOMPurify) */
export function sanitizeHtml(content: string): string {
  if (!content) return '';
  return content
    .replace(/<[^>]*>/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/** Validate file upload */
export function validateFileUpload(file: File, type: 'image' | 'attachment') {
  const maxSize = 30 * 1024 * 1024;
  if (file.size > maxSize) return { valid: false, error: 'File size exceeds 30MB limit' };

  if (type === 'image') {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) return { valid: false, error: 'Invalid image type' };
  } else {
    const blocked = ['application/x-msdownload', 'application/x-executable', 'application/x-sh'];
    if (blocked.includes(file.type)) return { valid: false, error: 'Executable files are not allowed' };
    const blockedExt = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.dmg'];
    if (blockedExt.some(ext => file.name.toLowerCase().endsWith(ext))) {
      return { valid: false, error: 'Executable file extensions are not allowed' };
    }
  }
  return { valid: true };
}

/** Security headers to add to every response */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/** Wrap a handler function with security headers */
export function withHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
