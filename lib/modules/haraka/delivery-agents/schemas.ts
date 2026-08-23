/**
 * @deprecated Compatibility shim — see delivery-agents.repository.ts.
 * New code should use `@/lib/modules/haraka/staff/schemas`.
 */
import { staffSchema, staffUpdateSchema, type StaffFormData } from '@/lib/modules/haraka/staff/schemas'

export const deliveryAgentSchema = staffSchema
export const deliveryAgentUpdateSchema = staffUpdateSchema
export type DeliveryAgentFormData = StaffFormData
