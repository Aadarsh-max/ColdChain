import { z } from 'zod';
import { deviceIdSchema } from './telemetry.schema.js';

export const deviceEventSchema = z.object({
  deviceId: deviceIdSchema,
  event: z.string().trim().min(1).max(60),
  detail: z.string().trim().max(300).optional(),
  timestamp: z
    .string()
    .datetime({ offset: true })
    .transform((value) => new Date(value))
    .optional()
});