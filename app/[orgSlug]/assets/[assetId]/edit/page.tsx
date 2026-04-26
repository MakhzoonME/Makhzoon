import { redirect } from 'next/navigation';

export default function EditAssetPage({ params }: { params: { orgSlug: string; assetId: string } }) {
  redirect(`/${params.orgSlug}/assets/${params.assetId}`);
}
