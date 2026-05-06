import { NextRequest } from 'next/server'

export function getTransferOrgId(req: NextRequest): string | null {
  return req.cookies.get('transferOrgId')?.value || null
}
