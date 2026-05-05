import { redirect } from 'next/navigation';

interface Props {
  params: { locale: string; orgSlug: string };
}

export default function SettingsIndexPage({ params }: Props) {
  redirect(`/${params.locale}/${params.orgSlug}/settings/organization`);
}
