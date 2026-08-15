'use client';
import { useMutation } from '@tanstack/react-query';

export interface OcrAccountUsage {
  callsThisMonth: number;
  totalCallsAllowed: number | null;
  resetsOn: string | null;
}

export interface OcrUsageByOrg {
  organizationId: string;
  organizationName: string;
  callsThisMonth: number;
  callsTotal: number;
}

export interface OcrUsageResponse {
  account: OcrAccountUsage;
  byOrg: OcrUsageByOrg[];
}

// On-demand only (button click) — hits Plate Recognizer's own API, not
// worth polling automatically.
export function useCheckOcrUsage() {
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/superadmin/notification-config/ocr-usage');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(typeof err.error === 'string' ? err.error : 'Failed to fetch usage');
      }
      return res.json() as Promise<OcrUsageResponse>;
    },
  });
}
