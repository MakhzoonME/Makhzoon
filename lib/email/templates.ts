interface WarrantyItem {
  assetName: string;
  vendor: string;
  endDate: string;
  daysLeft: number;
  assetUrl: string;
}

export function warrantyAlertEmail(params: { orgName: string; items: WarrantyItem[]; dashboardUrl: string }) {
  const { orgName, items, dashboardUrl } = params;
  const rows = items
    .map((i) => {
      const color = i.daysLeft < 0 ? '#DC2626' : i.daysLeft <= 30 ? '#EA580C' : '#CA8A04';
      const label = i.daysLeft < 0 ? `Expired ${Math.abs(i.daysLeft)}d ago` : `${i.daysLeft}d left`;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;">
            <a href="${i.assetUrl}" style="color:#2563EB;text-decoration:none;font-weight:500;">${escapeHtml(i.assetName)}</a>
            <div style="color:#6B7280;font-size:12px;">${escapeHtml(i.vendor)} · ends ${i.endDate}</div>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #E5E7EB;text-align:right;color:${color};font-weight:600;white-space:nowrap;">${label}</td>
        </tr>`;
    })
    .join('');

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:18px;margin:0 0 4px;">Warranty alerts — ${escapeHtml(orgName)}</h1>
      <p style="color:#6B7280;font-size:14px;margin:0 0 16px;">${items.length} warranty item${items.length === 1 ? '' : 's'} need attention.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;"><a href="${dashboardUrl}" style="background:#2563EB;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:14px;">Open dashboard</a></p>
      <p style="color:#9CA3AF;font-size:12px;margin-top:24px;">You are receiving this because you are an admin of ${escapeHtml(orgName)}.</p>
    </div>`;

  const text = `Warranty alerts — ${orgName}\n\n${items
    .map((i) => `- ${i.assetName} (${i.vendor}) — ${i.daysLeft < 0 ? `expired ${Math.abs(i.daysLeft)} days ago` : `${i.daysLeft} days left`}`)
    .join('\n')}\n\n${dashboardUrl}`;

  return { html, text };
}

export function inviteEmail(params: { orgName: string; inviterName: string; acceptUrl: string; role: string }) {
  const { orgName, inviterName, acceptUrl, role } = params;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:20px;margin:0 0 8px;">You're invited to ${escapeHtml(orgName)}</h1>
      <p style="color:#374151;font-size:14px;line-height:1.5;">${escapeHtml(inviterName)} invited you to join <strong>${escapeHtml(orgName)}</strong> as a <strong>${escapeHtml(role)}</strong>.</p>
      <p style="margin:24px 0;">
        <a href="${acceptUrl}" style="background:#2563EB;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px;font-weight:500;">Accept invitation</a>
      </p>
      <p style="color:#6B7280;font-size:12px;margin-top:24px;">If you did not expect this invite, you can ignore this email. The link expires in 7 days.</p>
    </div>`;
  const text = `You're invited to ${orgName}\n\n${inviterName} invited you to join ${orgName} as a ${role}.\n\nAccept: ${acceptUrl}\n\nThe link expires in 7 days.`;
  return { html, text };
}

export function supportTicketNotificationEmail(params: {
  orgName: string;
  subject: string;
  description: string;
  priority: string;
  createdBy: string;
  ticketId: string;
}) {
  const { orgName, subject, description, priority, createdBy, ticketId } = params;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:18px;margin:0 0 4px;">New Support Ticket</h1>
      <p style="color:#6B7280;font-size:14px;margin:0 0 16px;">A new ticket was submitted from <strong>${escapeHtml(orgName)}</strong>.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <tbody>
          <tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;width:130px;">Ticket ID</td>
            <td style="padding:8px 12px;font-size:13px;font-family:monospace;">${escapeHtml(ticketId)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;">Organization</td>
            <td style="padding:8px 12px;font-size:13px;">${escapeHtml(orgName)}</td>
          </tr>
          <tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;">Subject</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:500;">${escapeHtml(subject)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;">Priority</td>
            <td style="padding:8px 12px;font-size:13px;">${escapeHtml(priority)}</td>
          </tr>
          <tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;">Submitted By</td>
            <td style="padding:8px 12px;font-size:13px;">${escapeHtml(createdBy)}</td>
          </tr>
        </tbody>
      </table>
      <div style="border:1px solid #E5E7EB;border-radius:8px;padding:12px;">
        <p style="font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;margin:0 0 8px;">Description</p>
        <p style="font-size:14px;color:#374151;margin:0;white-space:pre-wrap;">${escapeHtml(description)}</p>
      </div>
    </div>`;
  const text = `New Support Ticket\n\nOrganization: ${orgName}\nTicket ID: ${ticketId}\nSubject: ${subject}\nPriority: ${priority}\nSubmitted By: ${createdBy}\n\nDescription:\n${description}`;
  return { html, text };
}

export function supportTicketReplyEmail(params: {
  orgName: string;
  subject: string;
  ticketId: string;
  authorName: string;
  message: string;
  ticketUrl: string;
}) {
  const { orgName, subject, ticketId, authorName, message, ticketUrl } = params;
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827;">
      <h1 style="font-size:18px;margin:0 0 4px;">New reply on support ticket</h1>
      <p style="color:#6B7280;font-size:14px;margin:0 0 16px;">${escapeHtml(authorName)} replied to <strong>${escapeHtml(subject)}</strong> from ${escapeHtml(orgName)}.</p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <tbody>
          <tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;width:130px;">Ticket ID</td>
            <td style="padding:8px 12px;font-size:13px;font-family:monospace;">${escapeHtml(ticketId)}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;">Organization</td>
            <td style="padding:8px 12px;font-size:13px;">${escapeHtml(orgName)}</td>
          </tr>
          <tr style="background:#F9FAFB;">
            <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;">Subject</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:500;">${escapeHtml(subject)}</td>
          </tr>
        </tbody>
      </table>
      <div style="border:1px solid #E5E7EB;border-radius:8px;padding:12px;">
        <p style="font-size:12px;font-weight:600;color:#6B7280;text-transform:uppercase;margin:0 0 8px;">Message</p>
        <p style="font-size:14px;color:#374151;margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <p style="margin:20px 0 0;"><a href="${ticketUrl}" style="background:#2563EB;color:#fff;text-decoration:none;padding:8px 14px;border-radius:6px;font-size:14px;">View ticket</a></p>
    </div>`;
  const text = `New reply on support ticket\n\nOrganization: ${orgName}\nTicket ID: ${ticketId}\nSubject: ${subject}\nAuthor: ${authorName}\n\nMessage:\n${message}\n\nView: ${ticketUrl}`;
  return { html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
