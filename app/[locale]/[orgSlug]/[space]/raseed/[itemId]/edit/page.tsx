import { redirect } from 'next/navigation';

export default async function EditInventoryItemPage(props: { params: Promise<{ orgSlug: string; space: string; itemId: string }> }) {
  const params = await props.params;
  redirect(`/${params.orgSlug}/${params.space}/raseed/${params.itemId}`);
}
