import type { RunResult } from './runner.js';

/**
 * Format a run result for Claude Code PreToolUse output.
 * - Blocking: writes message to stderr and exits with code 2
 * - Warnings: writes JSON to stdout with systemMessage
 * - Pass: exits with code 0
 */
export function formatPreToolUseOutput(result: RunResult): {
  exitCode: number;
  stderr: string;
  stdout: string;
} {
  if (result.blocked && result.blockingResult) {
    const r = result.blockingResult;
    let message = `\nBLOCKED by VGuard [${r.ruleId}]\n\n${r.message || 'Rule violation detected.'}`;
    if (r.fix) {
      message += `\n\nFix: ${r.fix}`;
    }
    return { exitCode: 2, stderr: message, stdout: '' };
  }

  if (result.warnings.length > 0) {
    const messages = result.warnings
      .map((w) => {
        let msg = `[${w.ruleId}] ${w.message || 'Warning'}`;
        if (w.fix) msg += ` — Fix: ${w.fix}`;
        return msg;
      })
      .join('\n');

    const output = JSON.stringify({
      continue: true,
      systemMessage: `VGuard warnings:\n${messages}`,
    });

    return { exitCode: 0, stderr: '', stdout: output };
  }

  return { exitCode: 0, stderr: '', stdout: '' };
}

/**
 * Format a run result for Claude Code PostToolUse output.
 * PostToolUse hooks can only provide feedback, never block.
 */
export function formatPostToolUseOutput(result: RunResult): {
  exitCode: number;
  stdout: string;
} {
  const allIssues = result.results.filter((r) => r.status !== 'pass');

  if (allIssues.length > 0) {
    const messages = allIssues
      .map((r) => {
        let msg = `[${r.ruleId}] ${r.message || 'Issue detected'}`;
        if (r.fix) msg += ` — Fix: ${r.fix}`;
        return msg;
      })
      .join('\n');

    const output = JSON.stringify({
      decision: 'block',
      reason: `VGuard feedback:\n${messages}`,
    });

    return { exitCode: 0, stdout: output };
  }

  return { exitCode: 0, stdout: '' };
}

/**
 * Format a run result for Claude Code Stop event output.
 * Stop hooks are informational — output goes to stderr for visibility.
 */
export function formatStopOutput(result: RunResult): {
  exitCode: number;
  stderr: string;
} {
  const messages = result.results
    .filter((r) => r.status !== 'pass')
    .map((r) => `  - ${r.message || r.ruleId}`)
    .join('\n');

  if (messages) {
    return {
      exitCode: 0,
      stderr: `\nVGuard session summary:\n${messages}\n`,
    };
  }

  return { exitCode: 0, stderr: '' };
}
