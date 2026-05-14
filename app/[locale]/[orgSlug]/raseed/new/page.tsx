import { redirect } from 'next/navigation';

export default async function NewInventoryItemPage(props: { params: Promise<{ orgSlug: string }> }) {
  const params = await props.params;
  redirect(`/${params.orgSlug}/raseed`);
}
