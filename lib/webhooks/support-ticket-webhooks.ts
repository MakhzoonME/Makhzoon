import crypto from 'crypto';
import { randomUUID } from 'crypto';

type TicketCreatedPayload = {
  event: 'ticket.created';
  eventId: string;
  timestamp: string;
  ticketId: string;
  organizationId: string;
  organizationName: string;
  subject: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'OPEN';
  createdById: string;
  createdByName: string;
  ticketUrl: string;
};

type TicketStatusChangedPayload = {
  event: 'ticket.status_changed';
  eventId: string;
  timestamp: string;
  ticketId: string;
  oldStatus: string;
  newStatus: string;
  changedById?: string;
  changedByName?: string;
};

type TicketCommentAddedPayload = {
  event: 'ticket.comment_added';
  eventId: string;
  timestamp: string;
  ticketId: string;
  messageId: string;
  body: string;
  authorId: string;
  authorName: string;
  authorRole: 'ORG_USER' | 'MAKHZOON_SUPPORT';
};

type SupportTicketWebhookPayload =
  | TicketCreatedPayload
  | TicketStatusChangedPayload
  | TicketCommentAddedPayload;

type SupportTicketWebhookInput =
  | Omit<TicketCreatedPayload, 'eventId' | 'timestamp'>
  | Omit<TicketStatusChangedPayload, 'eventId' | 'timestamp'>
  | Omit<TicketCommentAddedPayload, 'eventId' | 'timestamp'>;

const CONNECT_TIMEOUT_MS = 5000;

function signPayload(timestamp: string, rawBody: string, secret: string): string {
  const hmac = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `sha256=${hmac}`;
}

/**
 * Fire-and-forget: never awaited by callers. A single delivery attempt —
 * failures are logged, not retried (no persisted-queue infra exists yet for
 * this to survive a serverless function freeze between attempts).
 */
export function dispatchSupportTicketWebhook(payload: SupportTicketWebhookInput): void {
  const url = process.env.SUPPORT_AUTOMATION_WEBHOOK_URL;
  const secret = process.env.SUPPORT_AUTOMATION_WEBHOOK_SECRET;
  if (!url || !secret) return;

  const fullPayload = {
    ...payload,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
  } as SupportTicketWebhookPayload;

  const rawBody = JSON.stringify(fullPayload);
  const signature = signPayload(fullPayload.timestamp, rawBody, secret);

  (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Makhzoon-Signature': signature,
        },
        body: rawBody,
        signal: controller.signal,
      });
      console.log(
        `[support-ticket-webhook] ${fullPayload.event} ticket=${fullPayload.ticketId} eventId=${fullPayload.eventId} status=${res.status}`,
      );
    } catch (err) {
      console.error(
        `[support-ticket-webhook] ${fullPayload.event} ticket=${fullPayload.ticketId} eventId=${fullPayload.eventId} failed:`,
        err,
      );
    } finally {
      clearTimeout(timer);
    }
  })();
}

export function buildTicketUrl(locale: string, orgSubdomain: string, ticketId: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.makhzoon.me').replace(/\/$/, '');
  return `${baseUrl}/${locale}/${orgSubdomain}/support/${ticketId}`;
}
