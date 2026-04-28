import { z } from 'zod';

const hexColorRegex = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export const statusInputSchema = z.object({
  label: z.string().min(1, 'Label is required').max(40),
  color: z.string().regex(hexColorRegex, 'Color must be a valid hex code (e.g. #22c55e)'),
});

export const statusPatchSchema = statusInputSchema.partial();

export const locationInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
});

export const locationPatchSchema = locationInputSchema.partial();

export const categoryInputSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
});

export const categoryPatchSchema = categoryInputSchema.partial();

export type StatusInput = z.infer<typeof statusInputSchema>;
export type LocationInput = z.infer<typeof locationInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
