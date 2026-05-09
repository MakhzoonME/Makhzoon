import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ locale: string; orgSlug: string }>;
}

export default async function SettingsIndexPage(props: Props) {
  const params = await props.params;
  redirect(`/${params.locale}/${params.orgSlug}/settings/organization`);
}
