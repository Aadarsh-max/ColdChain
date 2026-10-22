import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    defaultMinTempC: { type: Number, default: 10 },
    defaultMaxTempC: { type: Number, default: 15 },
    hysteresisC: { type: Number, default: 0.3, min: 0 },
    excursionDebounceSamples: { type: Number, default: 3, min: 1 },
    criticalExcursionMinutes: { type: Number, default: 30, min: 1 },
    sampleIntervalSeconds: { type: Number, default: 5, min: 1 },
    staleAfterSeconds: { type: Number, default: 120, min: 5 },
    offlineAfterSeconds: { type: Number, default: 300, min: 10 },
    lowBatteryPct: { type: Number, default: 20, min: 1, max: 100 },
    criticalBatteryPct: { type: Number, default: 10, min: 1, max: 100 },
    shockThresholdG: { type: Number, default: 2.5, min: 0.1 },
    gpsExpected: { type: Boolean, default: true },
    alertPreferences: {
      lidOpened: { type: Boolean, default: true },
      shock: { type: Boolean, default: true },
      lowBattery: { type: Boolean, default: true },
      deviceOffline: { type: Boolean, default: true },
      gpsUnavailable: { type: Boolean, default: false },
      sensorFailure: { type: Boolean, default: true },
      buzzerEnabled: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

settingSchema.statics.getGlobal = function () {
  return this.findOneAndUpdate(
    { key: 'global' },
    { $setOnInsert: { key: 'global' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

export const Setting = mongoose.model('Setting', settingSchema);