import { redirect } from 'next/navigation';

export default async function EditInventoryItemPage(props: { params: Promise<{ orgSlug: string; itemId: string }> }) {
  const params = await props.params;
  redirect(`/${params.orgSlug}/raseed/${params.itemId}`);
}
