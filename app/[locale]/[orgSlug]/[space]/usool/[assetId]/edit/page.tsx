import { redirect } from 'next/navigation';

export default async function EditAssetPage(props: { params: Promise<{ orgSlug: string; space: string; assetId: string }> }) {
  const params = await props.params;
  redirect(`/${params.orgSlug}/${params.space}/usool/${params.assetId}`);
}
