import { z } from 'zod';

export const assetNoteSchema = z.object({
  text: z.string().min(1, 'Note cannot be empty').max(2000, 'Note must be at most 2000 characters'),
});

export type AssetNoteFormData = z.infer<typeof assetNoteSchema>;
