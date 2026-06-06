import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkOrigin } from '@/lib/csrf';
import { createContactSalesEntry } from '@/lib/db/contact-sales';
import { sendEmail } from '@/lib/email/resend';

// Validate contact form input
const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  organization: z.string().max(255).optional(),
  assetCount: z.string().max(50).optional(),
  message: z.string().min(1).max(2000),
});

/**
 * Sanitize text for safe HTML display (escape all HTML characters).
 */
function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limit contact form (5 per IP per hour, 1 per email per day)
    const clientIp = getClientIp(req);
    const rateLimitIp = checkRateLimit(
      `contact:ip:${clientIp}`,
      5,
      60 * 60 * 1000,
      { action: 'submit contact form' }
    );
    if (rateLimitIp) return rateLimitIp;

    // SECURITY: Validate origin to prevent CSRF
    const originCheck = checkOrigin(req);
    if (originCheck) return originCheck;

    const body = await req.json();

    // SECURITY: Validate input with schema
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { firstName, lastName, email, organization, assetCount, message } = parsed.data;
    const name = `${firstName} ${lastName}`.trim();

    // Rate limit by email as well
    const rateLimitEmail = checkRateLimit(
      `contact:email:${email}`,
      1,
      24 * 60 * 60 * 1000,
      { errorMessage: 'You have already submitted a contact form from this email address today' }
    );
    if (rateLimitEmail) return rateLimitEmail;

    const sanitizedName = sanitizeText(name);
    const sanitizedOrg = sanitizeText(organization ?? '');
    const sanitizedEmail = sanitizeText(email);
    const sanitizedAssetCount = sanitizeText(assetCount ?? 'Not specified');
    const sanitizedMessage = sanitizeText(message).replace(/\n/g, '<br>');

    await sendEmail({
      to: 'info@makhzoon.me',
      subject: `New contact inquiry from ${sanitizedName}${sanitizedOrg ? ` — ${sanitizedOrg}` : ''}`,
      html: `
        <h2>New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        ${sanitizedOrg ? `<p><strong>Organization:</strong> ${sanitizedOrg}</p>` : ''}
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Approximate asset count:</strong> ${sanitizedAssetCount}</p>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage}</p>
      `,
      text: `New Contact Inquiry\nName: ${name}\n${organization ? `Organization: ${organization}\n` : ''}Email: ${email}\nAsset count: ${assetCount ?? 'Not specified'}\n\nMessage:\n${message}`,
    });

    await createContactSalesEntry({
      name,
      firstName,
      lastName,
      organizationName: organization ?? '',
      phone: '',
      email,
      notes: [assetCount ? `Asset count: ${assetCount}` : '', message].filter(Boolean).join('\n\n') || undefined,
      ip: clientIp,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
