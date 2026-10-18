import { describe, it, expect } from 'vitest';
import { computeRiskScore, getRiskLevel, RISK_WEIGHTS } from '../src/services/riskScore.js';

describe('risk score', () => {
  it('is zero and low with no problems', () => {
    const risk = computeRiskScore({});
    expect(risk.score).toBe(0);
    expect(risk.level).toBe('low');
    expect(risk.factors).toHaveLength(6);
  });

  it('reaches 100 and critical when every factor is maxed', () => {
    const risk = computeRiskScore({
      maxDeviationC: 10,
      excursionMinutes: 500,
      failedSensors: ['ds18b20'],
      batteryPct: 5,
      shockCount: 10,
      disconnectedMinutes: 500
    });
    expect(risk.score).toBe(100);
    expect(risk.level).toBe('critical');
  });

  it('weights add up to 100', () => {
    const total = Object.values(RISK_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it('scales deviation and duration proportionally', () => {
    const risk = computeRiskScore({ maxDeviationC: 2.5, excursionMinutes: 30 });
    const byKey = Object.fromEntries(risk.factors.map((f) => [f.key, f.points]));
    expect(byKey.deviation).toBe(12.5);
    expect(byKey.duration).toBe(15);
    expect(risk.score).toBe(28);
    expect(risk.level).toBe('moderate');
  });

  it('gives full sensor points for a product probe failure', () => {
    const risk = computeRiskScore({ failedSensors: ['ds18b20'] });
    expect(risk.factors.find((f) => f.key === 'sensors').points).toBe(15);
  });

  it('gives smaller sensor points for other sensors, capped at the weight', () => {
    const one = computeRiskScore({ failedSensors: ['dht22'] });
    const many = computeRiskScore({ failedSensors: ['dht22', 'mpu6050', 'gps', 'x'] });
    expect(one.factors.find((f) => f.key === 'sensors').points).toBe(5);
    expect(many.factors.find((f) => f.key === 'sensors').points).toBe(15);
  });

  it('scores battery by level', () => {
    const points = (pct) => computeRiskScore({ batteryPct: pct }).factors.find((f) => f.key === 'battery').points;
    expect(points(50)).toBe(0);
    expect(points(15)).toBe(5);
    expect(points(8)).toBe(10);
    expect(points(null)).toBe(0);
  });

  it('caps each factor at its weight', () => {
    const risk = computeRiskScore({ maxDeviationC: 100, excursionMinutes: 10000 });
    const byKey = Object.fromEntries(risk.factors.map((f) => [f.key, f.points]));
    expect(byKey.deviation).toBe(25);
    expect(byKey.duration).toBe(30);
  });

  it('handles invalid numbers safely', () => {
    const risk = computeRiskScore({ maxDeviationC: NaN, excursionMinutes: 'abc', shockCount: undefined });
    expect(risk.score).toBe(0);
  });

  it('accepts configuration overrides', () => {
    const risk = computeRiskScore({ excursionMinutes: 30 }, { fullExcursionMinutes: 30 });
    expect(risk.factors.find((f) => f.key === 'duration').points).toBe(30);
  });

  it('maps scores to levels', () => {
    expect(getRiskLevel(0)).toBe('low');
    expect(getRiskLevel(24)).toBe('low');
    expect(getRiskLevel(25)).toBe('moderate');
    expect(getRiskLevel(50)).toBe('high');
    expect(getRiskLevel(75)).toBe('critical');
  });

  it('always includes the disclaimer', () => {
    expect(computeRiskScore({}).disclaimer).toContain('not a scientifically validated');
  });
});