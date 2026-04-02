import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { readRuleHits, type RuleHitRecord } from '../engine/tracker.js';
import { CloudClient } from './client.js';

const CURSOR_FILE = '.vguard/data/sync-cursor.json';

interface SyncCursor {
  /** ISO timestamp of the last synced record */
  lastSyncedAt: string;
  /** Number of records synced in last batch */
  lastBatchSize: number;
}

/**
 * Read the sync cursor to determine where to resume syncing.
 */
export function readSyncCursor(projectRoot: string): SyncCursor | null {
  const cursorPath = join(projectRoot, CURSOR_FILE);
  try {
    if (!existsSync(cursorPath)) return null;
    return JSON.parse(readFileSync(cursorPath, 'utf-8')) as SyncCursor;
  } catch {
    return null;
  }
}

/**
 * Write the sync cursor after a successful sync.
 */
export function writeSyncCursor(projectRoot: string, cursor: SyncCursor): void {
  const cursorPath = join(projectRoot, CURSOR_FILE);
  const dir = dirname(cursorPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(cursorPath, JSON.stringify(cursor, null, 2), 'utf-8');
}

/**
 * Filter records to those newer than the cursor.
 */
export function getUnsyncedRecords(
  records: RuleHitRecord[],
  cursor: SyncCursor | null,
): RuleHitRecord[] {
  if (!cursor) return records;

  const cutoff = new Date(cursor.lastSyncedAt).getTime();
  return records.filter((r) => new Date(r.timestamp).getTime() > cutoff);
}

/**
 * Apply excludePaths patterns to strip file paths from records.
 */
export function applyExclusions(records: RuleHitRecord[], excludePaths: string[]): RuleHitRecord[] {
  if (excludePaths.length === 0) return records;

  return records.map((record) => {
    if (!record.filePath) return record;

    const shouldExclude = excludePaths.some((pattern) => {
      if (pattern === '**/*') return true;
      // Simple glob matching for common patterns
      const normalized = pattern.replace(/\\/g, '/').replace(/\*\*/g, '').replace(/\/\//g, '/');
      const filePath = record.filePath?.replace(/\\/g, '/') ?? '';
      // Match if the file path contains the pattern's non-glob segments
      const segments = normalized.split('/').filter(Boolean);
      return segments.every((seg) => {
        if (seg === '*') return true;
        if (seg.startsWith('*.')) return filePath.includes(seg.slice(1)); // *.env → .env
        return filePath.includes(seg);
      });
    });

    if (shouldExclude) {
      return { ...record, filePath: undefined };
    }
    return record;
  });
}

export interface SyncResult {
  synced: number;
  skipped: number;
  error?: string;
}

/**
 * Sync rule hits to Cloud.
 * Non-blocking, fail-open — returns error message instead of throwing.
 */
export async function syncToCloud(
  projectRoot: string,
  apiKey: string,
  options: {
    apiUrl?: string;
    excludePaths?: string[];
    force?: boolean;
    dryRun?: boolean;
  } = {},
): Promise<SyncResult> {
  try {
    const allRecords = readRuleHits(projectRoot);
    if (allRecords.length === 0) {
      return { synced: 0, skipped: 0 };
    }

    const cursor = options.force ? null : readSyncCursor(projectRoot);
    let unsyncedRecords = getUnsyncedRecords(allRecords, cursor);

    if (unsyncedRecords.length === 0) {
      return { synced: 0, skipped: 0 };
    }

    // Apply path exclusions
    if (options.excludePaths && options.excludePaths.length > 0) {
      unsyncedRecords = applyExclusions(unsyncedRecords, options.excludePaths);
    }

    if (options.dryRun) {
      return { synced: 0, skipped: unsyncedRecords.length };
    }

    // Upload in batches of 1000
    const BATCH_SIZE = 1000;
    let totalSynced = 0;

    const client = new CloudClient({ apiUrl: options.apiUrl });

    for (let i = 0; i < unsyncedRecords.length; i += BATCH_SIZE) {
      const batch = unsyncedRecords.slice(i, i + BATCH_SIZE);
      const result = await client.ingest(apiKey, batch);
      totalSynced += result.ingested;
    }

    // Advance cursor
    const lastRecord = unsyncedRecords[unsyncedRecords.length - 1];
    writeSyncCursor(projectRoot, {
      lastSyncedAt: lastRecord.timestamp,
      lastBatchSize: totalSynced,
    });

    return { synced: totalSynced, skipped: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';
    return { synced: 0, skipped: 0, error: message };
  }
}
