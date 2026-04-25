'use client';
import { useParams } from 'next/navigation';

export function useOrgSlug(): string {
  const params = useParams();
  return (params?.orgSlug as string) ?? '';
}
