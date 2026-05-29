'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/ui';
import { Camera, Loader2, X } from 'lucide-react';

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  fallbackText?: string;
}

export function AvatarUpload({ value, onChange, fallbackText }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function pick() {
    inputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ACCEPTED.includes(file.type)) {
      toast.error('Only JPEG, PNG, or WebP images are allowed');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'avatar');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? 'Upload failed');
      }
      const data = (await res.json()) as { url: string };
      onChange(data.url);
      toast.success('Picture uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    onChange(null);
  }

  const initial = fallbackText?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <div className="h-20 w-20 overflow-hidden rounded-full border border-border bg-surface-card">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Profile picture" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-500">
              {initial}
            </div>
          )}
        </div>
        {value && !uploading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Remove picture"
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface-card text-gray-500 shadow ring-1 ring-border hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button type="button" size="sm" variant="outline" onClick={pick} disabled={uploading}>
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
          ) : (
            <Camera className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
          <span className="ms-1">{uploading ? 'Uploading…' : value ? 'Change picture' : 'Upload picture'}</span>
        </Button>
        <p className="text-[11px] text-gray-500">JPEG, PNG, or WebP up to 5 MB.</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(',')}
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
