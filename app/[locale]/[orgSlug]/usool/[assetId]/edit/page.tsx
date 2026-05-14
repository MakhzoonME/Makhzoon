import { redirect } from 'next/navigation';

export default async function EditAssetPage(props: { params: Promise<{ orgSlug: string; assetId: string }> }) {
  const params = await props.params;
  redirect(`/${params.orgSlug}/usool/${params.assetId}`);
}
