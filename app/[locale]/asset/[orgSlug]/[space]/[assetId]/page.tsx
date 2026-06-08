'use client';
import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, MapPin, Tag } from 'lucide-react';
import { MakhzoonMark } from '@/components/ui/MakhzoonLogo';
import { StatusBadge } from '@/components/shared/StatusBadge';

type PublicAsset = {
  id: string;
  name: string;
  category: string;
  status: string;
  serialNumber?: string | null;
  location?: string | null;
  organizationName: string;
  spaceName: string;
};

export default function GuestAssetViewPage({
  params,
}: {
  params: Promise<{ locale: string; orgSlug: string; space: string; assetId: string }>;
}) {
  const { orgSlug, space, assetId } = use(params);

  const { data, isLoading, isError } = useQuery<PublicAsset>({
    queryKey: ['guest-asset', orgSlug, space, assetId],
    queryFn: async () => {
      const res = await fetch(`/api/public/assets/${orgSlug}/${space}/${assetId}`);
      if (!res.ok) throw new Error('Not found');
      return res.json();
    },
    retry: false,
  });

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-surface-page">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-6">
          <MakhzoonMark size={28} radius={8} />
          <span className="text-sm font-semibold text-gray-900">Makhzoon</span>
        </div>

        <div className="bg-surface-card rounded-xl border border-border overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <div className="h-5 w-2/3 bg-surface-page rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-surface-page rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-surface-page rounded animate-pulse" />
            </div>
          ) : isError || !data ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Asset not found.
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-base font-semibold text-gray-900">{data.name}</h1>
                  <p className="text-xs text-gray-500 mt-0.5">{data.organizationName} · {data.spaceName}</p>
                </div>
                <StatusBadge status={data.status} marker="dot" />
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2.5 text-sm">
                  <Tag className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                  <span className="text-gray-600">{data.category}</span>
                </div>
                {data.serialNumber && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Boxes className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                    <span className="text-gray-600 font-mono">{data.serialNumber}</span>
                  </div>
                )}
                {data.location && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-4 h-4 text-gray-400" strokeWidth={1.75} />
                    <span className="text-gray-600">{data.location}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          Read-only view · scanned via QR
        </p>
      </div>
    </div>
  );
}
