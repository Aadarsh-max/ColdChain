import { Setting } from '../models/Setting.js';
import { Device } from '../models/Device.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../config/logger.js';
import { publishConfig } from '../mqtt/publisher.js';
import { invalidateSettings } from './settingsService.js';

export const getSettingsDoc = () => Setting.getGlobal().lean();

const pushConfigToDevices = async (settings) => {
  const devices = await Device.find({ isSimulated: { $ne: true } }).select('deviceId').lean();
  const config = {
    sampleIntervalSeconds: settings.sampleIntervalSeconds,
    shockThresholdG: settings.shockThresholdG,
    lowBatteryPct: settings.lowBatteryPct,
    criticalBatteryPct: settings.criticalBatteryPct,
    buzzerEnabled: settings.alertPreferences ? settings.alertPreferences.buzzerEnabled !== false : true,
    updatedAt: new Date().toISOString()
  };
  await Promise.allSettled(devices.map((device) => publishConfig(device.deviceId, config)));
};

export const updateSettings = async (changes) => {
  const current = await Setting.getGlobal().lean();
  const merged = { ...current, ...changes };

  if (merged.defaultMinTempC >= merged.defaultMaxTempC) {
    throw new AppError(400, 'defaultMaxTempC must be greater than defaultMinTempC');
  }
  if (merged.criticalBatteryPct > merged.lowBatteryPct) {
    throw new AppError(400, 'criticalBatteryPct cannot be greater than lowBatteryPct');
  }

  const $set = {};
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'alertPreferences') {
      for (const [prefKey, prefValue] of Object.entries(value)) {
        $set[`alertPreferences.${prefKey}`] = prefValue;
      }
    } else {
      $set[key] = value;
    }
  }

  const updated = await Setting.findOneAndUpdate({ key: 'global' }, { $set }, { new: true, runValidators: true }).lean();
  invalidateSettings();

  pushConfigToDevices(updated).catch((err) => logger.warn(`Config push failed: ${err.message}`));

  return updated;
};