import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssetNoteById, deleteAssetNote } from '@/lib/firestore/asset-notes';
import { writeAuditLog } from '@/lib/audit/logger';

export async function DELETE(_req: NextRequest, { params }: { params: { assetId: string; noteId: string } }) {
  try {
    const user = await verifySessionCookie();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

    const note = await getAssetNoteById(params.noteId);
    if (!note || note.organizationId !== user.organizationId || note.assetId !== params.assetId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin && note.createdBy !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteAssetNote(params.noteId);

    await writeAuditLog({
      organizationId: user.organizationId,
      userId: user.uid,
      role: user.role,
      action: 'ASSET_NOTE_DELETED',
      module: 'assets',
      recordId: params.assetId,
      oldValue: { noteId: params.noteId, text: note.text },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/assets/[assetId]/notes/[noteId]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
