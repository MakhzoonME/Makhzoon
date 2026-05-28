import { z } from 'zod';
import { LIST_KEYS } from '@/types';

const listKeyEnum = z.enum(LIST_KEYS as [string, ...string[]]);
const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex like #22c55e');

/** Create a platform default item (superadmin). */
export const platformListItemSchema = z.object({
  listKey: listKeyEnum,
  value: z.string().min(1, 'Value is required').max(100),
  label: z.string().min(1, 'Label is required').max(100),
  labelAr: z.string().max(100).nullable().optional(),
  color: hexColor.nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  enabled: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});

/** Update a platform item. value omitted here — locked for system items and
 *  controlled separately to avoid orphaning stored records. */
export const platformListItemUpdateSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  labelAr: z.string().max(100).nullable().optional(),
  color: hexColor.nullable().optional(),
  sortOrder: z.coerce.number().int().optional(),
  enabled: z.boolean().optional(),
});

/** Upsert a per-org override/addition (org manager). */
export const orgListItemSchema = z.object({
  listKey: listKeyEnum,
  value: z.string().min(1, 'Value is required').max(100),
  label: z.string().min(1).max(100).nullable().optional(),
  labelAr: z.string().max(100).nullable().optional(),
  color: hexColor.nullable().optional(),
  sortOrder: z.coerce.number().int().nullable().optional(),
  enabled: z.boolean().optional(),
  isCustom: z.boolean().optional(),
});

export const orgListItemDeleteSchema = z.object({
  listKey: listKeyEnum,
  value: z.string().min(1),
});

export type PlatformListItemInput = z.infer<typeof platformListItemSchema>;
export type OrgListItemInput = z.infer<typeof orgListItemSchema>;
