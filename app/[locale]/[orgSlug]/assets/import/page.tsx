import { redirect } from 'next/navigation';

export default function ImportAssetsPage({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/assets`);
}
