import { z } from 'zod';
import { ALERT_TYPES, CONNECTION_STATUSES, DATA_SOURCES } from '../config/constants.js';
import { deviceIdSchema } from './telemetry.schema.js';
import { dateRangeSchema } from './query.schema.js';

const boolString = z.enum(['true', 'false']).transform((value) => value === 'true');

const MAX_RANGE_MS = 90 * 86400000;

const rangeRules = (data, ctx) => {
  if (data.from && data.to) {
    if (data.from > data.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'from must be before to', path: ['from'] });
    } else if (data.to.getTime() - data.from.getTime() > MAX_RANGE_MS) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Range cannot exceed 90 days', path: ['to'] });
    }
  }
};

export const devicesQuerySchema = z.object({
  status: z.enum(CONNECTION_STATUSES).optional(),
  isSimulated: boolString.optional()
});

export const seriesQuerySchema = dateRangeSchema
  .extend({
    shipmentId: z.string().trim().max(40).optional(),
    points: z.coerce.number().int().min(10).max(1000).default(300)
  })
  .superRefine(rangeCheckWrapper(rangeRules));

function rangeCheckWrapper(rule) {
  return (data, ctx) => rule(data, ctx);
}

export const readingsCsvQuerySchema = dateRangeSchema
  .extend({
    deviceId: deviceIdSchema.optional(),
    shipmentId: z.string().trim().max(40).optional(),
    dataSource: z.enum(DATA_SOURCES).optional(),
    isSimulated: boolString.optional()
  })
  .superRefine((data, ctx) => {
    rangeRules(data, ctx);
    if (!data.deviceId && !data.shipmentId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'deviceId or shipmentId is required',
        path: ['deviceId']
      });
    }
  });

export const alertsCsvQuerySchema = dateRangeSchema
  .extend({
    deviceId: deviceIdSchema.optional(),
    shipmentId: z.string().trim().max(40).optional(),
    type: z.enum(ALERT_TYPES).optional()
  })
  .superRefine(rangeRules);

export const acknowledgeBodySchema = z.object({
  acknowledgedBy: z.string().trim().min(1).max(60).optional()
});

const pct = z.number().min(1).max(100);

export const updateSettingsSchema = z
  .object({
    defaultMinTempC: z.number().min(-80).max(60),
    defaultMaxTempC: z.number().min(-80).max(60),
    hysteresisC: z.number().min(0).max(5),
    excursionDebounceSamples: z.number().int().min(1).max(20),
    criticalExcursionMinutes: z.number().min(1).max(10080),
    sampleIntervalSeconds: z.number().int().min(1).max(3600),
    staleAfterSeconds: z.number().int().min(5).max(86400),
    offlineAfterSeconds: z.number().int().min(10).max(86400),
    lowBatteryPct: pct,
    criticalBatteryPct: pct,
    shockThresholdG: z.number().min(0.1).max(16),
    gpsExpected: z.boolean(),
    alertPreferences: z
      .object({
        lidOpened: z.boolean(),
        shock: z.boolean(),
        lowBattery: z.boolean(),
        deviceOffline: z.boolean(),
        gpsUnavailable: z.boolean(),
        sensorFailure: z.boolean(),
        buzzerEnabled: z.boolean()
      })
      .partial()
      .strict()
  })
  .partial()
  .strict()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });