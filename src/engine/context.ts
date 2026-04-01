import type { HookContext, HookEvent, ResolvedConfig } from '../types.js';
import { buildGitContext } from '../utils/git.js';

/**
 * Raw hook input from Claude Code (JSON parsed from stdin).
 */
export interface RawHookInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Build a HookContext from raw Claude Code hook input.
 */
export function buildHookContext(
  event: HookEvent,
  rawInput: RawHookInput,
  config: ResolvedConfig,
): HookContext {
  const tool = rawInput.tool_name ?? '';
  const toolInput = rawInput.tool_input ?? {};

  // Extract file path for git context
  const filePath =
    (toolInput.file_path as string) ??
    (toolInput.path as string) ??
    (toolInput.command as string) ??
    process.cwd();

  const gitContext = buildGitContext(filePath);

  return {
    event,
    tool,
    toolInput,
    projectConfig: config,
    gitContext,
  };
}
