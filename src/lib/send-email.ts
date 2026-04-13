export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[sendEmail] RESEND_API_KEY not configured');
    return false;
  }
  if (!to?.includes('@')) {
    console.error('[sendEmail] Invalid recipient address:', to);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Next Door <noreply@nextdoor.website>',
        reply_to: 'deepakkrishnar1618@gmail.com',
        to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error(`[sendEmail] Resend error ${res.status}:`, body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[sendEmail] Fetch error:', err);
    return false;
  }
}
