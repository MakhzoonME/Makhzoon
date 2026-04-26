import { redirect } from 'next/navigation';

export default function NewInventoryItemPage({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/inventory`);
}
