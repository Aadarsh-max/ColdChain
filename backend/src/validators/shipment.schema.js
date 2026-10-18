import { z } from 'zod';
import { SHIPMENT_STATUSES } from '../config/constants.js';
import { deviceIdSchema } from './telemetry.schema.js';

const point = z.object({
  name: z.string().trim().min(1).max(120),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional()
});

const baseShipment = z.object({
  shipmentId: z.string().trim().regex(/^[A-Za-z0-9_-]{3,40}$/, 'Invalid shipmentId'),
  trackingCode: z.string().trim().max(60).optional(),
  productName: z.string().trim().min(1).max(120),
  productCategory: z.string().trim().max(80).optional(),
  minTempC: z.number().min(-80).max(60),
  maxTempC: z.number().min(-80).max(60),
  origin: point,
  destination: point,
  startTime: z.coerce.date().nullable().optional(),
  expectedArrival: z.coerce.date().nullable().optional(),
  deviceId: deviceIdSchema.nullable().optional(),
  status: z.enum(SHIPMENT_STATUSES).optional(),
  statusNote: z.string().trim().max(200).optional(),
  statusLocation: z.string().trim().max(120).optional(),
  metadata: z.record(z.unknown()).optional(),
  isSimulated: z.boolean().optional()
});

const checkRules = (data, ctx) => {
  if (data.minTempC !== undefined && data.maxTempC !== undefined && data.minTempC >= data.maxTempC) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'maxTempC must be greater than minTempC',
      path: ['maxTempC']
    });
  }
  if (data.startTime && data.expectedArrival && data.expectedArrival <= data.startTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'expectedArrival must be after startTime',
      path: ['expectedArrival']
    });
  }
};

export const createShipmentSchema = baseShipment.superRefine(checkRules);

export const updateShipmentSchema = baseShipment
  .omit({ shipmentId: true })
  .partial()
  .superRefine(checkRules)
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

export const shipmentParamsSchema = z.object({
  shipmentId: z.string().trim().min(1).max(40)
});