import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';
import { isRateLimited, getClientIp } from '@/src/lib/rate-limit';
import { buildBaseTemplate } from '@/src/lib/email-templates';
import { sendEmail } from '@/src/lib/send-email';

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'admin:test-email', 5)) return error('Too many requests', 429);
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin, email').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can send test emails', 403);

  if (!process.env.RESEND_API_KEY) return json({ success: false, error: 'RESEND_API_KEY is not configured' }, 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';
  const adminEmail = caller.email as string;

  const content = `
    <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">Test Email ✅</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">This is a test email from Next Door. If you received this, your email configuration is working correctly.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${appUrl}/chat" style="display:inline-block;background:linear-gradient(135deg,#10B981,#0D9488);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;">Open Next Door →</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">Sent from the admin panel.</p>
  `;

  const html = buildBaseTemplate(content, appUrl);
  const ok = await sendEmail(adminEmail, '[TEST] 🏠 Next Door - Test Email', html);

  if (ok) {
    return json({ success: true, message: `Test email sent to ${adminEmail}` });
  } else {
    return json({ success: false, error: 'Failed to send email - check server logs' }, 500);
  }
}
