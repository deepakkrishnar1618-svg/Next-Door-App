import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, validateFileUpload } from '@/src/lib/api-helpers';
import { isRateLimited, getClientIp } from '@/src/lib/rate-limit';

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'files:post', 20)) return error('Too many requests', 429);
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { data: caller } = await getServiceClient().from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const formData = await request.formData().catch(() => null);
  if (!formData) return error('Invalid form data', 400);

  const file = formData.get('file') as File | null;
  const type = formData.get('type') as string | null;

  if (!file) return error('No file provided', 400);

  const maxFileSize = 4 * 1024 * 1024; // 4MB
  if (file.size > maxFileSize) return error('File size exceeds 4MB limit', 413);

  const validation = validateFileUpload(file, type === 'profile' ? 'image' : 'attachment');
  if (!validation.valid) return error(validation.error || 'Invalid file', 400);

  // Sanitize filename — strip to safe chars, cap length
  const rawName = file.name.slice(0, 200);
  const sanitizedFilename = rawName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const timestamp = Date.now();
  const prefix = type === 'profile' ? 'profiles' : 'uploads';
  const bucket = type === 'profile' ? 'avatars' : 'attachments';
  const path = `${prefix}/${userId}/${timestamp}-${sanitizedFilename}`;

  const supabase = getServiceClient();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) return error('Failed to upload file', 500);

  const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);

  return json({
    file_key: `${bucket}/${path}`,
    filename: sanitizedFilename,
    file_size: file.size,
    content_type: file.type,
    url: publicUrl,
  });
}
