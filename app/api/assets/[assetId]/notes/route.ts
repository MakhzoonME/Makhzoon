import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth-helpers';
import { getAssetById } from '@/lib/firestore/assets';
import { getAssetNotes, createAssetNote } from '@/lib/firestore/asset-notes';
import { writeAuditLog } from '@/lib/audit/logger';
import { assetNoteSchema } from '@/lib/validations/asset-note.schema';

export async function GET(_req: NextRequest, { params }: { params: { assetId: string } }) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const asset = await getAssetById(params.assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const notes = await getAssetNotes(user.organizationId, params.assetId);
  return NextResponse.json(notes);
}

export async function POST(req: NextRequest, { params }: { params: { assetId: string } }) {
  const user = await verifySessionCookie();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.organizationId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const asset = await getAssetById(params.assetId);
  if (!asset || asset.organizationId !== user.organizationId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = assetNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  const id = await createAssetNote({
    organizationId: user.organizationId,
    assetId: params.assetId,
    text: parsed.data.text,
    createdBy: user.uid,
    createdByEmail: user.email,
  });

  await writeAuditLog({
    organizationId: user.organizationId,
    userId: user.uid,
    role: user.role,
    action: 'ASSET_NOTE_ADDED',
    module: 'assets',
    recordId: params.assetId,
    newValue: { noteId: id, text: parsed.data.text },
  });

  return NextResponse.json({ id }, { status: 201 });
}
