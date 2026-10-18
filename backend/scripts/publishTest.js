import mqtt from 'mqtt';
import { env } from '../src/config/env.js';

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i].startsWith('--')) {
    const next = argv[i + 1];
    args[argv[i].slice(2)] = next && !next.startsWith('--') ? next : 'true';
  }
}

const device = args.device || 'CC-001';
const count = Number(args.count || 1);
const temp = args.temp === undefined ? 5.2 : Number(args.temp);
const battery = args.battery === undefined ? 80 : Number(args.battery);
const lid = args.lid === 'true';
const shock = args.shock === 'true';
const dup = args.dup === 'true';
const sensorError = args.sensor === 'error';
const gps = args.gps === 'true';
const ageSeconds = Number(args.age || 0);
const source = args.source === 'synchronized' ? 'synchronized' : 'live';

const prefix = env.MQTT_TOPIC_PREFIX;
const telemetryTopic = `${prefix}/${device}/telemetry`;
const ackTopic = `${prefix}/${device}/ack`;

const options = { clientId: `ccg-test-${Date.now()}`, clean: true };
if (env.MQTT_USERNAME) {
  options.username = env.MQTT_USERNAME;
  options.password = env.MQTT_PASSWORD;
}

const client = mqtt.connect(env.MQTT_URL, options);

let expected = 0;
let received = 0;
let finished = false;

const finish = () => {
  if (finished) return;
  finished = true;
  client.end(false, {}, () => process.exit(0));
};

const buildRecord = (index, recordId) => {
  const offsetSeconds = ageSeconds + (count - 1 - index) * 5;
  return {
    schemaVersion: 1,
    deviceId: device,
    recordId,
    timestamp: new Date(Date.now() - offsetSeconds * 1000).toISOString(),
    timeValid: true,
    temperatureC: sensorError ? null : temp,
    humidityPct: 61,
    ambientTemperatureC: 24.5,
    latitude: gps ? 19.076 : null,
    longitude: gps ? 72.8777 : null,
    gpsFix: gps,
    gpsSatellites: gps ? 7 : 0,
    speedKmph: gps ? 42 : null,
    batteryVoltage: 3.85,
    batteryPct: battery,
    lidOpen: lid,
    motionDetected: false,
    shockDetected: shock,
    accel: { x: 0.02, y: 0.01, z: 1.0 },
    sensors: {
      ds18b20: sensorError ? 'error' : 'ok',
      dht22: 'ok',
      mpu6050: 'ok',
      gps: gps ? 'ok' : 'no_fix'
    },
    network: { wifiConnected: true, mqttConnected: true },
    queuedRecords: 0,
    dataSource: source,
    isSimulated: true
  };
};

client.on('connect', () => {
  client.subscribe(ackTopic, { qos: 1 }, () => {
    const runId = Date.now();
    for (let i = 0; i < count; i += 1) {
      const recordId = `test-${runId}-${i}`;
      const payload = JSON.stringify(buildRecord(i, recordId));
      client.publish(telemetryTopic, payload, { qos: 1 });
      expected += 1;
      if (dup) {
        client.publish(telemetryTopic, payload, { qos: 1 });
        expected += 1;
      }
    }
    console.log(`Published ${expected} message(s) to ${telemetryTopic}`);
  });
});

client.on('message', (topic, buffer) => {
  received += 1;
  console.log(`ACK ${buffer.toString()}`);
  if (received >= expected) finish();
});

client.on('error', (err) => {
  console.error(`MQTT error: ${err.message}`);
  finish();
});

setTimeout(() => {
  if (received < expected) console.log(`Timed out: got ${received} of ${expected} acks`);
  finish();
}, 6000);