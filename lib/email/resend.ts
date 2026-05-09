import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  _resend = new Resend(key);
  return _resend;
}

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id: string | null; skipped: boolean }> {
  const client = getResend();
  const from = process.env.RESEND_FROM_EMAIL;

  if (!client || !from) {
    // Log in production too so the deployment misconfiguration is visible in
    // CloudWatch instead of failing silently. Don't include the key value.
    console.warn(
      '[email] Skipping send — missing config:',
      !client ? 'RESEND_API_KEY' : '',
      !from ? 'RESEND_FROM_EMAIL' : '',
      `(to=${Array.isArray(params.to) ? params.to.join(',') : params.to})`,
    );
    return { id: null, skipped: true };
  }

  const result = await client.emails.send({ from, ...params });
  if (result.error) throw new Error(result.error.message);
  return { id: result.data?.id ?? null, skipped: false };
}
