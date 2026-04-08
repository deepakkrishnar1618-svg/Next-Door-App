import { NextRequest, NextResponse } from 'next/server';
import { authenticate, getServiceClient, error } from '@/src/lib/api-helpers';
import { createServiceClient } from '@/src/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { key } = await params;
  const keyPath = key.join('/');

  // Prevent path traversal
  if (keyPath.includes('..') || keyPath.includes('//')) return error('Invalid file path', 400);

  const pathParts = keyPath.split('/');
  if (pathParts.length < 2) return error('Invalid file path', 400);

  const { data: caller } = await getServiceClient().from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  // Determine bucket from key prefix
  // key format: bucket/path or just path
  // We stored file_key as "bucket/path", so bucket is first segment
  const bucket = pathParts[0];
  const filePath = pathParts.slice(1).join('/');

  const supabase = await createServiceClient();
  const { data, error: downloadError } = await supabase.storage.from(bucket).download(filePath);

  if (downloadError || !data) return error('File not found', 404);

  const headers = new Headers();
  headers.set('Content-Type', data.type || 'application/octet-stream');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline';");
  headers.set('Content-Disposition', 'inline');

  return new NextResponse(data, { headers });
}
