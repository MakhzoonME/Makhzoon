import { z } from 'zod';

/** Validates a DocumentRef persisted on an entity (see types/document.types.ts). */
export const documentRefSchema = z.object({
  bucket: z.string().min(1),
  path: z.string().min(1),
  name: z.string().min(1),
  contentType: z.string().min(1),
  url: z.string().optional(),
  public: z.boolean(),
});

export const documentsSchema = z.array(documentRefSchema).optional();
