import mongoose from 'mongoose';
import { runtimeState } from '../utils/runtimeState.js';

export const getHealth = (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    services: {
      database: dbConnected ? 'connected' : 'disconnected',
      mqtt: runtimeState.mqttConnected ? 'connected' : 'disconnected'
    }
  });
};