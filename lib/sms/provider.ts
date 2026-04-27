// Twilio REST API — no npm package needed, works via plain fetch.
// Requires env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, TWILIO_WHATSAPP_FROM

function twilioPost(body: Record<string, string>): Promise<Response> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;

  const creds = Buffer.from(`${sid}:${token}`).toString('base64');
  return fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
}

export async function sendSms(to: string, message: string): Promise<boolean> {
  const from = process.env.TWILIO_SMS_FROM;
  if (!from) return false;
  const res = await twilioPost({ To: to, From: from, Body: message });
  if (!res) return false;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[sms] Twilio error:', err);
    return false;
  }
  return true;
}

export async function sendWhatsApp(to: string, message: string): Promise<boolean> {
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) return false;
  const res = await twilioPost({ To: `whatsapp:${to}`, From: `whatsapp:${from}`, Body: message });
  if (!res) return false;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[whatsapp] Twilio error:', err);
    return false;
  }
  return true;
}

export async function sendInviteMessage(
  channel: 'sms' | 'whatsapp',
  to: string,
  orgName: string,
  inviterName: string,
  acceptUrl: string
): Promise<boolean> {
  const message =
    `You've been invited to join ${orgName} on Makhzoon by ${inviterName}.\n` +
    `Accept your invitation here: ${acceptUrl}\n` +
    `This link expires in 7 days.`;

  return channel === 'whatsapp' ? sendWhatsApp(to, message) : sendSms(to, message);
}
