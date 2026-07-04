import { z } from 'zod';

// Defense-in-depth only: the Ed25519 signature already guarantees this body
// came from Discord. This just guards against a malformed-but-signed payload.
export const interactionSchema = z.object({
  type: z.number(),
  id: z.string(),
  token: z.string().optional(),
  guild_id: z.string().optional(),
  channel_id: z.string().optional(),
  member: z
    .object({
      user: z.object({ id: z.string(), username: z.string() }).optional(),
    })
    .optional(),
  data: z
    .object({
      name: z.string(),
      options: z
        .array(z.object({ name: z.string(), value: z.unknown().optional() }))
        .optional(),
    })
    .optional(),
});
