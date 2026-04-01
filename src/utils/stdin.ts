import { readFileSync } from 'node:fs';

/**
 * Read all data from stdin as a string.
 * Returns empty string if stdin is not available or has no data.
 */
export function readStdinSync(): string {
  try {
    return readFileSync(0, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * Parse JSON from stdin. Returns null on any error.
 * Used by hook scripts to read Claude Code's hook input.
 */
export function parseStdinJson(): Record<string, unknown> | null {
  const raw = readStdinSync();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Extract common tool input fields from hook input data.
 */
export function extractToolInput(data: Record<string, unknown>): {
  toolName: string;
  toolInput: Record<string, unknown>;
} {
  const toolName = (data.tool_name as string) ?? '';
  const toolInput = (data.tool_input as Record<string, unknown>) ?? {};
  return { toolName, toolInput };
}
