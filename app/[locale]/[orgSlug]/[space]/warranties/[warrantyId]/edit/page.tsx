import { redirect } from 'next/navigation';

export default async function EditWarrantyPage(props: { params: Promise<{ orgSlug: string; warrantyId: string }> }) {
  const params = await props.params;
  redirect(`/${params.orgSlug}/warranties`);
}
