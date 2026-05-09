import { NextRequest, NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant';
import { getAssetNoteById, deleteAssetNote } from '@/lib/db/asset-notes';
import { auditLog } from '@/lib/platform/audit';

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ assetId: string; noteId: string }> }
) {
  const params = await props.params;
  try {
    const tenant = await resolveTenant();
    const user = tenant.user;

    const note = await getAssetNoteById(params.noteId);
    if (!note || note.organizationId !== user.organizationId || note.assetId !== params.assetId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const isAdmin = user.role === 'admin' || user.role === 'super_admin' || user.role === 'org_owner';
    if (!isAdmin && note.createdBy !== user.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteAssetNote(params.noteId);

    auditLog.queue({
      tenant,
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
