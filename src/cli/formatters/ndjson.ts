/**
 * NDJSON lint formatter.
 *
 * Emits one JSON object per line. The first line is a summary envelope
 * and every subsequent line is an issue record. Stable across a major
 * version: consumers can pin on `schema: "v1"`.
 */

import type { ScanResult } from '../../engine/scanner.js';

export function formatNdjson(result: ScanResult): string {
  const lines: string[] = [];

  lines.push(
    JSON.stringify({
      schema: 'v1',
      type: 'summary',
      filesScanned: result.filesScanned,
      issueCount: result.issues.length,
      hasBlockingIssues: result.hasBlockingIssues,
    }),
  );

  for (const issue of result.issues) {
    lines.push(
      JSON.stringify({
        schema: 'v1',
        type: 'issue',
        ruleId: issue.ruleId,
        severity: issue.severity,
        filePath: issue.filePath,
        message: issue.message,
        fix: issue.fix ?? null,
      }),
    );
  }

  return lines.join('\n') + '\n';
}
