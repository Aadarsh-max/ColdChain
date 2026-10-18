import mqtt from 'mqtt';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { runtimeState } from '../utils/runtimeState.js';

let client = null;

export const getClient = () => client;

export const topicFor = (deviceId, channel) => `${env.MQTT_TOPIC_PREFIX}/${deviceId}/${channel}`;

export const startMqtt = (onMessage) => {
  const options = {
    clientId: env.MQTT_CLIENT_ID,
    clean: false,
    reconnectPeriod: 3000,
    connectTimeout: 10000,
    keepalive: 30,
    resubscribe: true
  };

  if (env.MQTT_USERNAME) {
    options.username = env.MQTT_USERNAME;
    options.password = env.MQTT_PASSWORD;
  }

  client = mqtt.connect(env.MQTT_URL, options);

  const topics = ['telemetry', 'status', 'events'].map((channel) => `${env.MQTT_TOPIC_PREFIX}/+/${channel}`);

  client.on('connect', () => {
    runtimeState.mqttConnected = true;
    logger.info('MQTT connected');
    client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`MQTT subscribe failed: ${err.message}`);
      } else {
        logger.info(`MQTT subscribed: ${topics.join(', ')}`);
      }
    });
  });

  client.on('reconnect', () => logger.debug('MQTT reconnecting'));

  client.on('close', () => {
    runtimeState.mqttConnected = false;
    logger.warn('MQTT connection closed');
  });

  client.on('offline', () => {
    runtimeState.mqttConnected = false;
  });

  client.on('error', (err) => logger.error(`MQTT error: ${err.message}`));

  client.on('message', (topic, payload) => {
    Promise.resolve(onMessage(topic, payload)).catch((err) => {
      logger.error(`MQTT handler failed for ${topic}: ${err && err.stack ? err.stack : err}`);
    });
  });

  return client;
};

export const stopMqtt = () =>
  new Promise((resolve) => {
    if (!client) return resolve();
    client.end(false, {}, () => {
      runtimeState.mqttConnected = false;
      resolve();
    });
  });