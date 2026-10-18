import { parseArgs } from 'node:util';
import { VirtualDevice } from './device.js';
import { createLink } from './link.js';
import { scenarios } from './scenarios.js';

const OPTIONS = {
  scenario: { type: 'string', short: 's' },
  device: { type: 'string', short: 'd' },
  interval: { type: 'string', short: 'i' },
  ticks: { type: 'string', short: 't' },
  count: { type: 'string' },
  gap: { type: 'string' },
  battery: { type: 'string' },
  'route-speed': { type: 'string' },
  'ack-timeout': { type: 'string' },
  drain: { type: 'string' },
  seed: { type: 'string' },
  url: { type: 'string' },
  loop: { type: 'boolean', default: false },
  verbose: { type: 'boolean', short: 'v', default: false },
  'keep-online': { type: 'boolean', default: false },
  'allow-real-id': { type: 'boolean', default: false },
  list: { type: 'boolean', default: false },
  help: { type: 'boolean', short: 'h', default: false }
};

const HELP = `
Cold-Chain Guardian simulator (synthetic data only)

Usage: node src/index.js --scenario <name> [options]

  -s, --scenario <name>   scenario to run (default: normal), see --list
  -d, --device <id>       device id, must start with SIM- (default: SIM-001)
  -i, --interval <sec>    seconds between records (default: 5)
  -t, --ticks <n>         number of records, overrides the scenario default
      --count <n>         backlog size for offline-sync (default: 60)
      --gap <sec>         offline duration for wifi-drop (default: 150)
      --battery <pct>     starting battery estimate (default: 85)
      --route-speed <n>   GPS route speed multiplier (default: 20)
      --ack-timeout <s>   resend unacknowledged records after this long (default: 12)
      --drain <sec>       wait this long for outstanding acks at the end (default: 20)
      --seed <n>          repeatable random readings
      --url <mqtt url>    broker url (default: MQTT_URL or mqtt://127.0.0.1:1893)
      --loop              repeat the scenario until Ctrl+C
      --keep-online       do not publish an offline status on exit
      --allow-real-id     allow device ids that do not start with SIM-
  -v, --verbose           print every acknowledgement
      --list              list scenarios
  -h, --help              show this help
`;

const num = (value, fallback, min, max, name) => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`--${name} must be a number between ${min} and ${max}`);
  }
  return parsed;
};

const printList = () => {
  console.log('\nAvailable scenarios:\n');
  for (const [name, scenario] of Object.entries(scenarios)) {
    const length = scenario.ticks ? ` (${scenario.ticks} records)` : '';
    console.log(`  ${name.padEnd(16)} ${scenario.description}${length}`);
  }
  console.log('');
};

const stamp = () => new Date().toTimeString().slice(0, 8);
const log = (message) => console.log(`${stamp()}  ${message}`);

const show = (value, unit = '') => (value === null || value === undefined ? '--' : `${value}${unit}`);

const main = async () => {
  const { values } = parseArgs({ options: OPTIONS, allowPositionals: false });

  if (values.help) {
    console.log(HELP);
    return 0;
  }
  if (values.list) {
    printList();
    return 0;
  }

  const name = values.scenario || 'normal';
  const scenario = scenarios[name];
  if (!scenario) {
    console.error(`Unknown scenario "${name}". Use --list to see the options.`);
    return 1;
  }

  const deviceId = values.device || 'SIM-001';
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(deviceId)) throw new Error('Invalid device id');
  if (!deviceId.startsWith('SIM-') && !values['allow-real-id']) {
    throw new Error('Device id must start with SIM- so simulated data stays separate. Use --allow-real-id to override.');
  }

  const options = {
    scenario: name,
    deviceId,
    interval: num(values.interval, 5, 0.2, 3600, 'interval'),
    ticks: values.ticks === undefined ? undefined : Math.round(num(values.ticks, 1, 1, 100000, 'ticks')),
    count: Math.round(num(values.count, 60, 1, 2000, 'count')),
    gap: num(values.gap, 150, 5, 3600, 'gap'),
    ackTimeout: num(values['ack-timeout'], 12, 1, 600, 'ack-timeout'),
    drain: num(values.drain, 20, 0, 600, 'drain'),
    battery: num(values.battery, 85, 0, 100, 'battery'),
    routeSpeed: num(values['route-speed'], 20, 0, 200, 'route-speed'),
    seed: values.seed === undefined ? undefined : Math.round(num(values.seed, 0, 0, 2147483647, 'seed')),
    url: values.url || process.env.MQTT_URL || 'mqtt://127.0.0.1:1893',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
    prefix: process.env.MQTT_TOPIC_PREFIX || 'coldchain',
    loop: values.loop,
    verbose: values.verbose,
    keepOnline: values['keep-online']
  };

  const device = new VirtualDevice({
    deviceId,
    seed: options.seed,
    batteryPct: options.battery,
    routeSpeed: options.routeSpeed
  });

  const link = createLink({
    url: options.url,
    username: options.username,
    password: options.password,
    prefix: options.prefix,
    deviceId,
    ackTimeoutMs: options.ackTimeout * 1000,
    onLog: (message) => log(message),
    onAck: (ack) => {
      if (options.verbose || ack.status !== 'stored') {
        log(`  ack ${ack.status} ${ack.recordId}${ack.reason ? ` (${ack.reason})` : ''}`);
      }
    }
  });

  let stopping = false;
  process.on('SIGINT', () => {
    if (stopping) process.exit(130);
    stopping = true;
    log('Stopping, press Ctrl+C again to force quit');
  });

  const sleep = async (ms) => {
    const end = Date.now() + ms;
    while (!stopping && Date.now() < end) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(200, Math.max(0, end - Date.now()))));
    }
  };
  const wait = () => sleep(options.interval * 1000);

  let tickNumber = 0;
  const tick = async (control = {}) => {
    const record = device.step(control);
    link.enqueue(record, { duplicate: control.duplicate === true });
    link.flush();
    tickNumber += 1;
    log(
      `#${String(tickNumber).padStart(3, '0')}  temp ${show(record.temperatureC, 'C').padEnd(8)}` +
        `hum ${show(record.humidityPct, '%').padEnd(7)}bat ${record.batteryPct}%  ` +
        `lid ${record.lidOpen ? 'OPEN  ' : 'closed'}  gps ${record.gpsFix ? 'fix ' : 'none'}  ` +
        `${record.shockDetected ? 'SHOCK  ' : ''}unacked ${link.pendingCount()}` +
        `${link.isOffline() ? '  [OFFLINE]' : ''}`
    );
    return record;
  };

  log(`Simulator starting: scenario ${name}, device ${deviceId}, broker ${options.url}`);
  log('All data is SYNTHETIC (isSimulated = true)');

  await link.connect();
  log('Connected to broker');
  await link.publishStatus(true);

  const runOnce = async () => {
    if (scenario.run) {
      await scenario.run({ tick, wait, link, device, options, log, isStopping: () => stopping });
      return;
    }
    const total = options.ticks ?? scenario.ticks;
    for (let i = 0; i < total && !stopping; i += 1) {
      await tick(scenario.control(i, total));
      await wait();
    }
  };

  do {
    await runOnce();
  } while (options.loop && !stopping);

  if (!stopping && link.pendingCount() > 0) {
    log(`Waiting up to ${options.drain}s for outstanding acknowledgements`);
    await link.drain(
      options.drain * 1000,
      () => stopping,
      (remaining) => log(`  ${remaining} record(s) still unacknowledged`)
    );
  }

  const unacked = link.pendingCount();
  const s = link.stats;
  console.log('\nSummary');
  console.log(`  records created:    ${s.created}`);
  console.log(`  transmissions:      ${s.transmissions} (resends ${s.resends}, duplicate copies ${s.duplicateCopies})`);
  console.log(`  acks stored:        ${s.stored}`);
  console.log(`  acks duplicate:     ${s.duplicate}`);
  console.log(`  acks rejected:      ${s.rejected}`);
  console.log(`  still unacknowledged: ${unacked}\n`);

  if (!options.keepOnline) await link.publishStatus(false);
  await link.close();
  return unacked > 0 ? 1 : 0;
};

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });