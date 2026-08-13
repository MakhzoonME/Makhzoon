import { z } from 'zod'

export const createServiceVehicleSchema = z.object({
  customerId:  z.string().uuid().nullable().optional(),
  plateNumber: z.string().trim().min(1).max(30),
  make:        z.string().trim().max(60).nullable().optional(),
  model:       z.string().trim().max(60).nullable().optional(),
  color:       z.string().trim().max(40).nullable().optional(),
  notes:       z.string().trim().max(1000).nullable().optional(),
})

export const updateServiceVehicleSchema = createServiceVehicleSchema.partial()

export type CreateServiceVehiclePayload = z.infer<typeof createServiceVehicleSchema>
export type UpdateServiceVehiclePayload = z.infer<typeof updateServiceVehicleSchema>
