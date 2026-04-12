import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

const emailHtml = (appUrl: string) => `
<!DOCTYPE html><html><body style="font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px;">
<div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden;">
  <div style="background: linear-gradient(135deg, #10B981, #0D9488); padding: 32px 24px; text-align: center;">
    <h1 style="margin: 0; color: #fff; font-size: 28px;">🏠 Next Door</h1>
    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Your community is waiting</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="margin: 0 0 16px; color: #1a1a1a;">You have new activity!</h2>
    <p style="margin: 0 0 24px; color: #4a4a4a; line-height: 1.6;">There are unread messages and new events from your neighbors.</p>
    <div style="text-align: center; padding: 8px 0 24px;">
      <a href="${appUrl}/chat" style="display: inline-block; background: linear-gradient(135deg, #10B981, #0D9488); color: #fff; text-decoration: none; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px;">Open Next Door →</a>
    </div>
  </div>
</div>
</body></html>
`;

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin, email').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can send test emails', 403);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ success: false, error: 'RESEND_API_KEY is not configured' }, 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';
  const adminEmail = caller.email as string;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Next Door <noreply@nextdoor.website>',
      reply_to: 'deepakkrishnar1618@gmail.com',
      to: adminEmail,
      subject: `[TEST] 🏠 Next Door - You have new activity!`,
      html: emailHtml(appUrl),
    }),
  });

  if (res.ok) {
    return json({ success: true, message: `Test email sent to ${adminEmail}` });
  } else {
    const errBody = await res.text();
    return json({ success: false, error: errBody }, 500);
  }
}
