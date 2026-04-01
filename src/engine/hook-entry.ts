/**
 * Hook entry point for generated hook scripts.
 * This module is imported by generated hook scripts via `require('vibecheck/hooks/runner')`.
 *
 * It reads stdin, builds context, resolves rules, runs them, and outputs results.
 */

import type { HookEvent } from '../types.js';
import { parseStdinJson, extractToolInput } from '../utils/stdin.js';
import { loadCompiledConfig } from '../config/compile.js';
import { buildHookContext } from './context.js';
import { resolveRules } from './resolver.js';
import { runRules } from './runner.js';
import { recordPerfEntry } from './perf.js';
import { formatPreToolUseOutput, formatPostToolUseOutput, formatStopOutput } from './output.js';

// Import and register all built-in rules
import '../rules/index.js';

/**
 * Main hook execution function.
 * Called by generated hook scripts with the event type.
 */
export async function executeHook(event: HookEvent): Promise<void> {
  try {
    // 1. Parse stdin
    const rawInput = parseStdinJson();
    if (!rawInput) {
      process.exit(0); // Fail open on missing/invalid input
    }

    // 2. Load pre-compiled config (fast path)
    const config = await loadCompiledConfig(process.cwd());
    if (!config) {
      process.exit(0); // No config = no enforcement
    }

    // 3. Extract tool info
    const { toolName } = extractToolInput(rawInput);

    // 4. Build context
    const context = buildHookContext(
      event,
      {
        tool_name: toolName,
        tool_input: rawInput.tool_input as Record<string, unknown>,
        ...rawInput,
      },
      config,
    );

    // 5. Resolve which rules apply
    const resolvedRules = resolveRules(event, toolName, config);
    if (resolvedRules.length === 0) {
      process.exit(0); // No matching rules
    }

    // 6. Run rules (with perf tracking)
    const hookStart = Date.now();
    const result = await runRules(resolvedRules, context);
    const hookDuration = Date.now() - hookStart;

    // Record perf data
    recordPerfEntry(process.cwd(), {
      event,
      tool: toolName,
      durationMs: hookDuration,
      ruleCount: resolvedRules.length,
    });

    // 7. Auto-sync to cloud on Stop events
    if (event === 'Stop') {
      triggerCloudSync(process.cwd());
    }

    // 8. Format and output
    if (event === 'PreToolUse') {
      const output = formatPreToolUseOutput(result);
      if (output.stderr) process.stderr.write(output.stderr);
      if (output.stdout) process.stdout.write(output.stdout);
      process.exit(output.exitCode);
    } else if (event === 'PostToolUse') {
      const output = formatPostToolUseOutput(result);
      if (output.stdout) process.stdout.write(output.stdout);
      process.exit(output.exitCode);
    } else {
      const output = formatStopOutput(result);
      if (output.stderr) process.stderr.write(output.stderr);
      process.exit(output.exitCode);
    }
  } catch {
    // Fail open — never block on internal errors
    process.exit(0);
  }
}

/**
 * Trigger cloud sync in the background if autoSync is enabled.
 * Non-blocking, fail-open — errors are silently ignored.
 */
/**
 * Trigger cloud sync in the background if autoSync is enabled.
 * Non-blocking, fire-and-forget — errors are silently ignored.
 */
function triggerCloudSync(projectRoot: string): void {
  // Check for API key in environment — skip everything if not set
  const apiKey = process.env.VIBECHECK_API_KEY;
  if (!apiKey) return;

  // Fire-and-forget async sync
  import('../cloud/sync.js')
    .then(({ syncToCloud }) => syncToCloud(projectRoot, apiKey))
    .catch(() => {
      // Fail open — cloud sync errors should never impact the developer
    });
}
