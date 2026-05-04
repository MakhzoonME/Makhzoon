import { redirect } from 'next/navigation';

export default function EditInventoryItemPage({ params }: { params: { orgSlug: string; itemId: string } }) {
  redirect(`/${params.orgSlug}/inventory/${params.itemId}`);
}
