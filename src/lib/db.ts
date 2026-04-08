/**
 * Typed database helper using Supabase client.
 * Mirrors D1 query patterns from the original worker files.
 * All functions accept a supabase client so they work in both
 * server routes (service role) and client contexts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Re-export types for convenience
export type { SupabaseClient };

/**
 * Thin wrapper that converts Supabase errors to thrown exceptions,
 * matching the D1 pattern of throwing on failure.
 */
export async function dbQuery<T = unknown>(
  client: SupabaseClient,
  query: string,
  params?: unknown[]
): Promise<T[]> {
  const { data, error } = await client.rpc('execute_query', {
    query_text: query,
    query_params: params ?? [],
  });
  if (error) throw new Error(error.message);
  return (data as T[]) ?? [];
}

/**
 * Helper to run a Supabase select with `.eq` / `.filter` chain.
 * For complex raw SQL, use `.rpc()` or `.from().select()` directly.
 */
export async function getOne<T = unknown>(
  client: SupabaseClient,
  table: string,
  match: Record<string, unknown>
): Promise<T | null> {
  let query = client.from(table).select('*');
  for (const [col, val] of Object.entries(match)) {
    query = query.eq(col, val as string);
  }
  const { data, error } = await query.single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return (data as T) ?? null;
}
