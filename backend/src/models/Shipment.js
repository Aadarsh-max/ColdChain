import mongoose from 'mongoose';
import { SHIPMENT_STATUSES } from '../config/constants.js';

const pointSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null }
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    status: { type: String, enum: SHIPMENT_STATUSES, required: true },
    location: { type: String, default: '' },
    note: { type: String, default: '' },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    shipmentId: { type: String, required: true, unique: true, trim: true },
    trackingCode: { type: String, trim: true, default: '' },
    productName: { type: String, required: true, trim: true },
    productCategory: { type: String, trim: true, default: '' },
    minTempC: { type: Number, required: true },
    maxTempC: { type: Number, required: true },
    origin: { type: pointSchema, required: true },
    destination: { type: pointSchema, required: true },
    startTime: { type: Date, default: null },
    expectedArrival: { type: Date, default: null },
    deviceId: { type: String, default: null, index: true },
    status: { type: String, enum: SHIPMENT_STATUSES, default: 'planned', index: true },
    history: { type: [historySchema], default: [] },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    isSimulated: { type: Boolean, default: false }
  },
  { timestamps: true }
);

shipmentSchema.pre('validate', function () {
  if (this.minTempC >= this.maxTempC) {
    this.invalidate('maxTempC', 'maxTempC must be greater than minTempC');
  }
});

shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ deviceId: 1, status: 1 });

export const Shipment = mongoose.model('Shipment', shipmentSchema);