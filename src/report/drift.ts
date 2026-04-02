import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { walkProject } from '../learn/walker.js';
import { aggregateConventions } from '../learn/aggregator.js';
import type { ConventionsReport } from '../learn/aggregator.js';

/** A drift issue — where current code doesn't match established conventions */
export interface DriftIssue {
  convention: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedFiles?: number;
}

/**
 * Detect drift from established conventions.
 *
 * Compares the saved conventions.json against a fresh scan of the codebase,
 * identifying patterns that have changed in confidence or disappeared.
 */
export function detectDrift(projectRoot: string): DriftIssue[] {
  const conventionsPath = join(projectRoot, '.vguard', 'learned', 'conventions.json');

  if (!existsSync(conventionsPath)) {
    return [
      {
        convention: 'No baseline',
        severity: 'low',
        description: 'No conventions.json found. Run `vguard learn` to establish a baseline.',
      },
    ];
  }

  // Load saved conventions
  let saved: ConventionsReport;
  try {
    saved = JSON.parse(readFileSync(conventionsPath, 'utf-8'));
  } catch {
    return [
      {
        convention: 'Invalid baseline',
        severity: 'medium',
        description: 'conventions.json is malformed. Run `vguard learn` to regenerate.',
      },
    ];
  }

  // Fresh scan
  const files = walkProject({ rootDir: projectRoot, maxFiles: 2000 });
  const current = aggregateConventions(files, projectRoot);

  const issues: DriftIssue[] = [];

  // Compare promotable patterns: check if confidence dropped
  for (const savedPattern of saved.promotablePatterns) {
    const currentMatch = current.allPatterns.find(
      (p) => p.type === savedPattern.type && p.description === savedPattern.description,
    );

    if (!currentMatch) {
      issues.push({
        convention: savedPattern.description,
        severity: 'medium',
        description: `Convention no longer detected. Was at ${Math.round(savedPattern.confidence * 100)}% confidence.`,
      });
    } else if (currentMatch.confidence < savedPattern.confidence - 0.15) {
      issues.push({
        convention: savedPattern.description,
        severity: 'high',
        description: `Confidence dropped from ${Math.round(savedPattern.confidence * 100)}% to ${Math.round(currentMatch.confidence * 100)}%.`,
        affectedFiles: currentMatch.totalFiles - currentMatch.occurrences,
      });
    }
  }

  return issues;
}
