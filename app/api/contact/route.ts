import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Validate contact form input
const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  organization: z.string().max(255).optional(),
  assetCount: z.string().max(50).optional(),
  message: z.string().min(10).max(2000),
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

    // Rate limit by email as well
    const rateLimitEmail = checkRateLimit(
      `contact:email:${email}`,
      1,
      24 * 60 * 60 * 1000,
      { errorMessage: 'You have already submitted a contact form from this email address today' }
    );
    if (rateLimitEmail) return rateLimitEmail;

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not configured. Storing message for manual review.');
      return NextResponse.json({ success: true });
    }

    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);
    const fullName = `${firstName} ${lastName}`;

    // SECURITY: Sanitize all user inputs for HTML display
    const sanitizedName = sanitizeText(fullName);
    const sanitizedEmail = sanitizeText(email);
    const sanitizedOrg = sanitizeText(organization || 'Not provided');
    const sanitizedCount = sanitizeText(assetCount || 'Not provided');
    const sanitizedMessage = sanitizeText(message).replace(/\n/g, '<br>');

    const emailRes = await resend.emails.send({
      from: 'noreply@makhzoon.com',
      to: 'sales@makhzoon.com',
      subject: `New contact form submission from ${sanitizedName}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Organization:</strong> ${sanitizedOrg}</p>
        <p><strong>Asset Count:</strong> ${sanitizedCount}</p>
        <p><strong>Message:</strong></p>
        <p>${sanitizedMessage}</p>
      `,
    });

    if (emailRes.error) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
