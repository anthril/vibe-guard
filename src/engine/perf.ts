import { appendFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

const PERF_LOG = '.vguard/data/perf.jsonl';
const BUDGET_MS = 100; // 100ms p95 target

export interface PerfEntry {
  timestamp?: string;
  event: string;
  tool: string;
  durationMs: number;
  ruleCount: number;
  overBudget?: boolean;
}

/**
 * Record a performance entry to the perf log.
 */
export function recordPerfEntry(projectRoot: string, entry: PerfEntry): void {
  try {
    const logPath = join(projectRoot, PERF_LOG);
    const dir = dirname(logPath);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const record: PerfEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      overBudget: entry.durationMs > BUDGET_MS,
    };

    appendFileSync(logPath, JSON.stringify(record) + '\n', 'utf-8');
  } catch {
    // Perf tracking should never interfere with normal operation
  }
}

/**
 * Read all performance entries from the log.
 */
export function readPerfEntries(projectRoot: string): PerfEntry[] {
  const logPath = join(projectRoot, PERF_LOG);
  if (!existsSync(logPath)) return [];

  try {
    const content = readFileSync(logPath, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as PerfEntry;
        } catch {
          return null;
        }
      })
      .filter((e): e is PerfEntry => e !== null);
  } catch {
    return [];
  }
}

/**
 * Calculate performance statistics from entries.
 */
export function calculatePerfStats(entries: PerfEntry[]): {
  count: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  overBudgetPct: number;
} {
  if (entries.length === 0) {
    return { count: 0, avgMs: 0, p95Ms: 0, maxMs: 0, overBudgetPct: 0 };
  }

  const durations = entries.map((e) => e.durationMs).sort((a, b) => a - b);
  const sum = durations.reduce((a, b) => a + b, 0);
  const p95Index = Math.floor(durations.length * 0.95);
  const overBudget = entries.filter((e) => e.durationMs > BUDGET_MS).length;

  return {
    count: entries.length,
    avgMs: Math.round(sum / entries.length),
    p95Ms: durations[p95Index] ?? durations[durations.length - 1],
    maxMs: durations[durations.length - 1],
    overBudgetPct: Math.round((overBudget / entries.length) * 100),
  };
}

export const PERF_BUDGET_MS = BUDGET_MS;
