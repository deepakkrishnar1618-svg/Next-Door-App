import { createClient } from './supabase/client';

/**
 * Upload a file to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadFile(
  file: File,
  bucket: 'attachments' | 'avatars' | 'listings',
  path: string
): Promise<string> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(
  bucket: 'attachments' | 'avatars' | 'listings',
  path: string
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

/**
 * Get the public URL for a file in Supabase Storage.
 */
export function getFileUrl(
  bucket: 'attachments' | 'avatars' | 'listings',
  path: string
): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
