import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEFAULT_SECRET = 'dev-only-secret-change-me-before-deploying-0000';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(5055),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27117/coldchain'),
  MQTT_URL: z.string().min(1).default('mqtt://127.0.0.1:1893'),
  MQTT_USERNAME: z.string().optional().default(''),
  MQTT_PASSWORD: z.string().optional().default(''),
  MQTT_CLIENT_ID: z.string().min(1).default('ccg-backend'),
  MQTT_TOPIC_PREFIX: z.string().min(1).default('coldchain'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5175'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(300),
  MAX_TIMESTAMP_FUTURE_SECONDS: z.coerce.number().int().min(0).default(300),
  MAX_TIMESTAMP_AGE_DAYS: z.coerce.number().int().min(1).default(30),
  JWT_SECRET: z.string().min(32).default(DEFAULT_SECRET),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'Use a value like 30m, 8h, or 1d')
    .default('8h')
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const insecureSecret =
  parsed.data.JWT_SECRET === DEFAULT_SECRET || parsed.data.JWT_SECRET.startsWith('replace-with');

if (insecureSecret && parsed.data.NODE_ENV === 'production') {
  console.error('JWT_SECRET must be set to a long random value in production.');
  process.exit(1);
}

if (insecureSecret && parsed.data.NODE_ENV === 'development') {
  console.warn('WARNING: JWT_SECRET is not set to a private value. Set one in backend/.env before sharing this server.');
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  corsOrigins: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()).filter(Boolean)
});