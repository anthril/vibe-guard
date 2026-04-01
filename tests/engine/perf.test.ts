import { describe, it, expect } from 'vitest';
import { calculatePerfStats, type PerfEntry } from '../../src/engine/perf.js';

function makeEntry(durationMs: number): PerfEntry {
  return {
    timestamp: new Date().toISOString(),
    event: 'PreToolUse',
    tool: 'Write',
    durationMs,
    ruleCount: 5,
  };
}

describe('engine/perf', () => {
  describe('calculatePerfStats', () => {
    it('should handle empty entries', () => {
      const stats = calculatePerfStats([]);
      expect(stats.count).toBe(0);
      expect(stats.avgMs).toBe(0);
      expect(stats.p95Ms).toBe(0);
    });

    it('should calculate averages correctly', () => {
      const entries = [makeEntry(10), makeEntry(20), makeEntry(30)];
      const stats = calculatePerfStats(entries);
      expect(stats.count).toBe(3);
      expect(stats.avgMs).toBe(20);
    });

    it('should calculate p95 correctly', () => {
      const entries = Array.from({ length: 100 }, (_, i) => makeEntry(i + 1));
      const stats = calculatePerfStats(entries);
      expect(stats.p95Ms).toBe(96); // 95th percentile of 1..100
      expect(stats.maxMs).toBe(100);
    });

    it('should calculate over-budget percentage', () => {
      const entries = [
        makeEntry(50),
        makeEntry(80),
        makeEntry(150), // over budget (>100ms)
        makeEntry(200), // over budget
      ];
      const stats = calculatePerfStats(entries);
      expect(stats.overBudgetPct).toBe(50);
    });

    it('should report 0% over-budget when all are within budget', () => {
      const entries = [makeEntry(10), makeEntry(20), makeEntry(50)];
      const stats = calculatePerfStats(entries);
      expect(stats.overBudgetPct).toBe(0);
    });
  });
});
