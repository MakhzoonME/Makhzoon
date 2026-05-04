import { redirect } from 'next/navigation';

export default function EditWarrantyPage({ params }: { params: { orgSlug: string; warrantyId: string } }) {
  redirect(`/${params.orgSlug}/warranties`);
}
