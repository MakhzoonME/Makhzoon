'use client';
import { useState } from 'react';
import { useAssetNotes, useCreateAssetNote, useDeleteAssetNote } from '@/hooks/useAssetNotes';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/useToast';

function Trash2SVG() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M4 3.5l.75 8h4.5L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function MessageSquareSVG() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 2.5h12a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H5l-3 2V3.5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function AssetNotesSection({ assetId }: { assetId: string }) {
  const { user } = useAuthStore();
  const { data: notes = [], isLoading } = useAssetNotes(assetId);
  const createMut = useCreateAssetNote(assetId);
  const deleteMut = useDeleteAssetNote(assetId);
  const [text, setText] = useState('');

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'org_owner';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await createMut.mutateAsync(trimmed);
      setText('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    }
  }

  async function handleDelete(noteId: string) {
    try {
      await deleteMut.mutateAsync(noteId);
      toast.success('Note removed');
    } catch {
      toast.error('Failed to remove note');
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
        <MessageSquareSVG />
        <h2 className="text-sm font-semibold text-gray-900">Notes</h2>
        <span className="text-xs text-gray-400 ml-auto">{notes.length} total</span>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note about this asset…"
          rows={2}
          className="mb-2"
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={!text.trim() || createMut.isPending}>
            {createMut.isPending ? 'Adding…' : 'Add note'}
          </Button>
        </div>
      </form>

      <div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 text-center">No notes yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notes.map((note) => {
              const canDelete = isAdmin || note.createdBy === user?.uid;
              const timeAgo = note.createdAt
                ? formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })
                : '';
              return (
                <li key={note.id} className="px-5 py-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap flex-1 min-w-0">{note.text}</p>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                        title="Delete note"
                      >
                        <Trash2SVG />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {note.createdByEmail} · {timeAgo}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
