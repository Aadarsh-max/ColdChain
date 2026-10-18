import { describe, it, expect } from 'vitest';
import {
  buildGaps,
  downsample,
  mergeIntervals,
  outsideSeconds
} from '../src/services/analyticsService.js';
import { buildLocation } from '../src/services/deviceQueryService.js';
import { csvCell, csvRow, toCsv } from '../src/utils/csv.js';
import { buildMeta, dateFilter, escapeRegex, skipFor } from '../src/utils/pagination.js';

const T0 = Date.parse('2026-10-18T10:00:00Z');
const at = (sec) => new Date(T0 + sec * 1000);

describe('interval math', () => {
  it('merges overlapping intervals', () => {
    expect(
      mergeIntervals([
        [0, 10],
        [5, 20],
        [30, 40],
        [40, 50]
      ])
    ).toEqual([
      [0, 20],
      [30, 50]
    ]);
  });

  it('ignores empty or reversed intervals', () => {
    expect(mergeIntervals([[10, 10], [20, 5]])).toEqual([]);
  });

  it('sums time outside limits, clipping to the range and ignoring other alert types', () => {
    const alerts = [
      { type: 'temperature_high', startedAt: at(600), endedAt: at(1200) },
      { type: 'temperature_low', startedAt: at(-100), endedAt: at(300) },
      { type: 'temperature_high', startedAt: at(3000), endedAt: null },
      { type: 'lid_opened', startedAt: at(0), endedAt: at(3000) }
    ];
    const total = outsideSeconds(alerts, at(0), at(3600), T0 + 4000 * 1000);
    expect(total).toBe(300 + 600 + 600);
  });

  it('does not double count overlapping alerts', () => {
    const alerts = [
      { type: 'temperature_high', startedAt: at(0), endedAt: at(100) },
      { type: 'temperature_low', startedAt: at(50), endedAt: at(150) }
    ];
    expect(outsideSeconds(alerts, at(0), at(1000))).toBe(150);
  });
});

describe('series helpers', () => {
  it('finds gaps larger than the threshold', () => {
    const points = [
      { t: at(0).toISOString() },
      { t: at(60).toISOString() },
      { t: at(240).toISOString() }
    ];
    const gaps = buildGaps(points, 60000, 90000);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].from).toBe(at(120).toISOString());
    expect(gaps[0].to).toBe(at(240).toISOString());
    expect(gaps[0].seconds).toBe(120);
  });

  it('reports no gaps for continuous data', () => {
    const points = [0, 60, 120].map((s) => ({ t: at(s).toISOString() }));
    expect(buildGaps(points, 60000, 90000)).toEqual([]);
  });

  it('downsamples while keeping the first and last items', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const result = downsample(items, 100);
    expect(result).toHaveLength(100);
    expect(result[0]).toBe(0);
    expect(result[99]).toBe(999);
  });

  it('returns small arrays unchanged', () => {
    const items = [1, 2, 3];
    expect(downsample(items, 10)).toBe(items);
  });
});

describe('location status', () => {
  const stale = 120;
  const now = T0;

  it('reports none when there is no stored location', () => {
    const result = buildLocation({ lastLocation: null, latest: null, staleAfterSeconds: stale, now });
    expect(result.available).toBe(false);
    expect(result.status).toBe('none');
    expect(result.latitude).toBeNull();
  });

  it('reports none when coordinates are null', () => {
    const result = buildLocation({
      lastLocation: { latitude: null, longitude: null, timestamp: null },
      latest: null,
      staleAfterSeconds: stale,
      now
    });
    expect(result.status).toBe('none');
  });

  it('reports current for a recent location with a fix', () => {
    const result = buildLocation({
      lastLocation: { latitude: 19.07, longitude: 72.87, timestamp: at(-30) },
      latest: { gpsFix: true, gpsSatellites: 7 },
      staleAfterSeconds: stale,
      now
    });
    expect(result.status).toBe('current');
    expect(result.satellites).toBe(7);
  });

  it('reports last_known when the fix is lost', () => {
    const result = buildLocation({
      lastLocation: { latitude: 19.07, longitude: 72.87, timestamp: at(-30) },
      latest: { gpsFix: false, gpsSatellites: 0 },
      staleAfterSeconds: stale,
      now
    });
    expect(result.status).toBe('last_known');
    expect(result.available).toBe(true);
  });

  it('reports last_known when the location is old', () => {
    const result = buildLocation({
      lastLocation: { latitude: 19.07, longitude: 72.87, timestamp: at(-600) },
      latest: { gpsFix: true, gpsSatellites: 5 },
      staleAfterSeconds: stale,
      now
    });
    expect(result.status).toBe('last_known');
    expect(result.ageSeconds).toBe(600);
  });
});

describe('csv helpers', () => {
  it('handles empty values, numbers, and dates', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(5.2)).toBe('5.2');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(false)).toBe('false');
    expect(csvCell(new Date('2026-10-18T10:00:00Z'))).toBe('2026-10-18T10:00:00.000Z');
  });

  it('quotes commas, quotes, and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });

  it('neutralises spreadsheet formulas in strings', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });

  it('builds rows and whole files', () => {
    expect(csvRow(['a', 1, null])).toBe('a,1,\r\n');
    const text = toCsv(
      [
        { header: 'id', value: (r) => r.id },
        { header: 'temp', value: (r) => r.temp }
      ],
      [{ id: 'x', temp: 5 }]
    );
    expect(text).toBe('id,temp\r\nx,5\r\n');
  });
});

describe('pagination helpers', () => {
  it('computes skip and meta', () => {
    expect(skipFor(3, 50)).toBe(100);
    expect(buildMeta(1, 50, 120)).toEqual({ page: 1, limit: 50, total: 120, pages: 3 });
    expect(buildMeta(1, 50, 0).pages).toBe(1);
  });

  it('builds date filters', () => {
    expect(dateFilter()).toBeNull();
    const from = new Date('2026-10-01');
    expect(dateFilter(from, undefined)).toEqual({ $gte: from });
  });

  it('escapes regex characters', () => {
    expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
  });
});