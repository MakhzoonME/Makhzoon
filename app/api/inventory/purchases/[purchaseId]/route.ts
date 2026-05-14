import { NextRequest, NextResponse } from 'next/server'
import { resolveTenant } from '@/lib/platform/tenancy/resolve-tenant'
import { PurchasesService } from '@/lib/modules/inventory/purchases/purchases.service'
import { updatePurchaseSchema } from '@/lib/modules/inventory/purchases/schemas'

const service = new PurchasesService()

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { purchaseId } = await params
    const purchase = await service.getById(tenant, purchaseId)
    return NextResponse.json({ purchase })
  } catch (err) {
    if (err instanceof NextResponse) return err
    console.error('[GET /api/inventory/purchases/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { purchaseId } = await params
    const body = await req.json()
    const parsed = updatePurchaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const data = parsed.data
    await service.update(tenant, purchaseId, {
      supplierName: data.supplierName,
      supplierContact: data.supplierContact ?? null,
      invoiceNumber: data.invoiceNumber ?? null,
      invoiceDate: data.invoiceDate,
      notes: data.notes ?? null,
      updateItemUnitCost: data.updateItemUnitCost,
      lines: data.lines?.map((l) => ({
        itemId: l.itemId ?? null,
        itemName: l.itemName,
        sku: l.sku ?? null,
        barcode: l.barcode ? l.barcode : null,
        quantity: l.quantity,
        unitCost: l.unitCost,
        taxRateId: l.taxRateId || null,
        notes: l.notes ?? null,
      })),
    })
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[PATCH /api/inventory/purchases/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ purchaseId: string }> },
) {
  try {
    const tenant = await resolveTenant()
    const { purchaseId } = await params
    await service.delete(tenant, purchaseId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof NextResponse) return err
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[DELETE /api/inventory/purchases/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
