import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkOrigin } from '@/lib/csrf';
import { createContactSalesEntry } from '@/lib/db/contact-sales';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Validate contact form input
const contactSchema = z.object({
  name: z.string().min(1).max(200),
  organizationName: z.string().min(1).max(255),
  phone: z.string().min(1).max(30),
  email: z.string().email(),
  notes: z.string().max(2000).optional(),
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

    const { name, organizationName, phone, email, notes } = parsed.data;

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
    } else {

    const { Resend } = await import('resend');
    const resend = new Resend(RESEND_API_KEY);

    const sanitizedName = sanitizeText(name);
    const sanitizedOrg = sanitizeText(organizationName);
    const sanitizedPhone = sanitizeText(phone);
    const sanitizedEmail = sanitizeText(email);
    const sanitizedNotes = notes ? sanitizeText(notes).replace(/\n/g, '<br>') : 'None';

    const emailRes = await resend.emails.send({
      from: 'noreply@makhzoon.com',
      to: 'sales@makhzoon.com',
      subject: `New sales inquiry from ${sanitizedName} — ${sanitizedOrg}`,
      html: `
        <h2>New Sales Inquiry</h2>
        <p><strong>Name:</strong> ${sanitizedName}</p>
        <p><strong>Organization:</strong> ${sanitizedOrg}</p>
        <p><strong>Phone:</strong> ${sanitizedPhone}</p>
        <p><strong>Email:</strong> ${sanitizedEmail}</p>
        <p><strong>Additional Notes:</strong></p>
        <p>${sanitizedNotes}</p>
      `,
    });

    if (emailRes.error) {
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      );
    }
    }

    await createContactSalesEntry({
      name,
      organizationName,
      phone,
      email,
      notes: notes || undefined,
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
