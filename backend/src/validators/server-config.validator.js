import { z } from 'zod';

export const updateServerConfigSchema = z.object({
  channelId: z.string().optional(),
  commandToggles: z.record(z.string(), z.boolean()).optional(),
  mirrorEnabled: z.boolean().optional(),
});
