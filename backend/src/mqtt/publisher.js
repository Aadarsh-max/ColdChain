import { logger } from '../config/logger.js';
import { getClient, topicFor } from './client.js';

const publish = (topic, payload, options) =>
  new Promise((resolve) => {
    const client = getClient();
    if (!client || !client.connected) {
      logger.warn(`MQTT publish skipped, not connected: ${topic}`);
      return resolve(false);
    }
    client.publish(topic, JSON.stringify(payload), options, (err) => {
      if (err) {
        logger.error(`MQTT publish failed on ${topic}: ${err.message}`);
        return resolve(false);
      }
      resolve(true);
    });
  });

export const publishAck = (deviceId, ack) =>
  publish(topicFor(deviceId, 'ack'), { ...ack, ackedAt: new Date().toISOString() }, { qos: 1, retain: false });

export const publishConfig = (deviceId, config) =>
  publish(topicFor(deviceId, 'config'), config, { qos: 1, retain: true });

export const publishCommand = (deviceId, command) =>
  publish(topicFor(deviceId, 'commands'), command, { qos: 1, retain: false });