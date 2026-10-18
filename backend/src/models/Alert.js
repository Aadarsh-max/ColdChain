import mongoose from 'mongoose';
import { ALERT_STATUSES, ALERT_TYPES, SEVERITIES } from '../config/constants.js';

const alertSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true },
    shipmentId: { type: String, default: null },
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: SEVERITIES, required: true },
    status: { type: String, enum: ALERT_STATUSES, default: 'active' },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, default: null },
    durationSeconds: { type: Number, default: 0, min: 0 },
    peakValue: { type: Number, default: null },
    lowestValue: { type: Number, default: null },
    thresholdValue: { type: Number, default: null },
    description: { type: String, default: '' },
    probableCauses: { type: [String], default: [] },
    acknowledged: { type: Boolean, default: false },
    acknowledgedAt: { type: Date, default: null },
    acknowledgedBy: { type: String, default: null },
    relatedRecordIds: { type: [String], default: [] },
    isSimulated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

alertSchema.index({ deviceId: 1, type: 1, status: 1 });
alertSchema.index({ shipmentId: 1, startedAt: -1 });
alertSchema.index({ status: 1, severity: 1, startedAt: -1 });
alertSchema.index({ acknowledged: 1, startedAt: -1 });
alertSchema.index({ startedAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);