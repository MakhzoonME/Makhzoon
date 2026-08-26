import { redirect } from 'next/navigation';

/**
 * The delivery-agent directory became the general staff directory in migration
 * 0067 (`haraka_delivery_agents` → `haraka_staff`). This route stays so old
 * bookmarks and links keep working; the UI lives at /haraka/staff.
 */
export default async function DeliveryAgentsRedirect({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string; space: string }>;
}) {
  const { locale, orgSlug, space } = await params;
  redirect(`/${locale}/${orgSlug}/${space}/haraka/staff`);
}
