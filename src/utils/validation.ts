import type { HookEvent } from '../types.js';

/**
 * Valid npm package name pattern.
 * Matches scoped (@scope/name) and unscoped (name) packages.
 * Rejects shell metacharacters, spaces, and other unsafe characters.
 */
const NPM_PACKAGE_NAME_RE = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

/**
 * Characters that are dangerous in shell contexts.
 * Null bytes, semicolons, pipes, backticks, $(), etc.
 */
const SHELL_UNSAFE_RE = /[\0;|&`$(){}!<>]/;

/**
 * All valid hook events at runtime.
 * Must stay in sync with the HookEvent type in types.ts.
 */
export const VALID_HOOK_EVENTS: readonly string[] = [
  'PreToolUse',
  'PostToolUse',
  'Stop',
  'PreCompact',
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'Notification',
] as const;

/**
 * Validate that a string is a valid npm package name.
 * Prevents command injection when package names are passed to npm CLI.
 */
export function isValidNpmPackageName(name: string): boolean {
  if (!name || name.length > 214) return false;
  return NPM_PACKAGE_NAME_RE.test(name);
}

/**
 * Validate that a file path does not contain shell metacharacters.
 * Allows normal path characters (letters, digits, spaces, dots, hyphens, slashes, backslashes, colons).
 * Rejects null bytes and shell injection characters.
 */
export function isValidFilePath(filePath: string): boolean {
  if (!filePath) return false;
  return !SHELL_UNSAFE_RE.test(filePath);
}

/**
 * Runtime type guard for HookEvent values.
 * Validates that the string is one of the known hook event types.
 */
export function isValidHookEvent(event: string): event is HookEvent {
  return VALID_HOOK_EVENTS.includes(event);
}
