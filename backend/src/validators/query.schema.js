import { z } from 'zod';
import { ALERT_STATUSES, ALERT_TYPES, DATA_SOURCES, SEVERITIES, SHIPMENT_STATUSES } from '../config/constants.js';
import { deviceIdSchema } from './telemetry.schema.js';

const boolString = z.enum(['true', 'false']).transform((value) => value === 'true');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50)
});

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional()
});

const rangeCheck = (data, ctx) => {
  if (data.from && data.to && data.from > data.to) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'from must be before to', path: ['from'] });
  }
};

export const deviceParamsSchema = z.object({
  deviceId: deviceIdSchema
});

export const alertParamsSchema = z.object({
  alertId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid alertId')
});

export const readingsQuerySchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    shipmentId: z.string().trim().max(40).optional(),
    dataSource: z.enum(DATA_SOURCES).optional(),
    isSimulated: boolString.optional(),
    sort: z.enum(['asc', 'desc']).default('desc')
  })
  .superRefine(rangeCheck);

export const eventsQuerySchema = paginationSchema
  .merge(dateRangeSchema)
  .extend({
    type: z.enum(ALERT_TYPES).optional(),
    severity: z.enum(SEVERITIES).optional(),
    status: z.enum(ALERT_STATUSES).optional(),
    acknowledged: boolString.optional()
  })
  .superRefine(rangeCheck);

export const alertsQuerySchema = eventsQuerySchema.and(
  z.object({
    deviceId: deviceIdSchema.optional(),
    shipmentId: z.string().trim().max(40).optional(),
    isSimulated: boolString.optional()
  })
);

export const shipmentsQuerySchema = paginationSchema.extend({
  status: z.enum(SHIPMENT_STATUSES).optional(),
  deviceId: deviceIdSchema.optional(),
  search: z.string().trim().max(60).optional(),
  isSimulated: boolString.optional()
});