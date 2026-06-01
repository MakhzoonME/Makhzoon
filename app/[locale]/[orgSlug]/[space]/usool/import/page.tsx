import { redirect } from 'next/navigation';

export default async function ImportAssetsPage(props: {
  params: Promise<{ locale: string; orgSlug: string; space: string }>;
}) {
  const { locale, orgSlug, space } = await props.params;
  redirect(`/${locale}/${orgSlug}/${space}/usool/list`);
}
