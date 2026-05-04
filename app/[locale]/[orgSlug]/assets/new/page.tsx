import { redirect } from 'next/navigation';

export default function NewAssetPage({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/assets`);
}
