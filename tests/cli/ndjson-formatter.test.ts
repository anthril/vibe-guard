import { describe, it, expect } from 'vitest';
import { formatNdjson } from '../../src/cli/formatters/ndjson.js';
import type { ScanResult } from '../../src/engine/scanner.js';

const emptyResult: ScanResult = {
  filesScanned: 10,
  issues: [],
  hasBlockingIssues: false,
};

const issueResult: ScanResult = {
  filesScanned: 25,
  issues: [
    {
      ruleId: 'security/branch-protection',
      severity: 'block',
      filePath: '/src/app.ts',
      message: 'Writing to main branch',
    },
    {
      ruleId: 'quality/anti-patterns',
      severity: 'warn',
      filePath: '/src/utils.ts',
      message: 'console.log detected',
      fix: 'Use a logger',
    },
  ],
  hasBlockingIssues: true,
};

function lines(output: string): string[] {
  return output.split('\n').filter((l) => l.length > 0);
}

describe('NDJSON formatter', () => {
  it('emits only a summary line when there are no issues', () => {
    const out = lines(formatNdjson(emptyResult));
    expect(out).toHaveLength(1);
    const summary = JSON.parse(out[0]);
    expect(summary).toMatchObject({
      schema: 'v1',
      type: 'summary',
      filesScanned: 10,
      issueCount: 0,
      hasBlockingIssues: false,
    });
  });

  it('emits one summary line followed by one line per issue', () => {
    const out = lines(formatNdjson(issueResult));
    expect(out).toHaveLength(3);

    const summary = JSON.parse(out[0]);
    expect(summary.type).toBe('summary');
    expect(summary.issueCount).toBe(2);
    expect(summary.hasBlockingIssues).toBe(true);

    const first = JSON.parse(out[1]);
    expect(first).toMatchObject({
      schema: 'v1',
      type: 'issue',
      ruleId: 'security/branch-protection',
      severity: 'block',
      filePath: '/src/app.ts',
      message: 'Writing to main branch',
      fix: null,
    });

    const second = JSON.parse(out[2]);
    expect(second.fix).toBe('Use a logger');
  });

  it('every line parses as JSON (no trailing garbage)', () => {
    const out = lines(formatNdjson(issueResult));
    for (const line of out) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});
