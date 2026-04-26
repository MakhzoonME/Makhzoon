import { redirect } from 'next/navigation';

export default function NewWarrantyPage({ params }: { params: { orgSlug: string } }) {
  redirect(`/${params.orgSlug}/warranties`);
}
