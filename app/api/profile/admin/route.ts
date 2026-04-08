import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return error('Admin profile not found', 404);

  const { data: adminUser } = await db
    .from('users')
    .select('id, name, email, room_number, avatar_url, description, creator_image_url, creator_link, is_admin')
    .eq('email', adminEmail)
    .single();

  if (!adminUser) return error('Admin profile not found', 404);
  return json(adminUser);
}
