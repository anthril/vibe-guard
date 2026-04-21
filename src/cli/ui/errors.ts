import { CommanderError, InvalidArgumentError } from 'commander';

import { color } from './colors.js';
import { isDebugMode } from './env.js';
import { EXIT, type ExitCode } from '../exit-codes.js';

function isExitPromptError(err: unknown): boolean {
  return err instanceof Error && err.name === 'ExitPromptError';
}

export function handleFatal(err: unknown): never {
  if (isExitPromptError(err)) {
    process.stderr.write('\n');
    process.exit(EXIT.SIGINT);
  }

  if (err instanceof CommanderError) {
    process.exit(EXIT.USAGE);
  }

  if (err instanceof InvalidArgumentError) {
    console.error(`${color.red('vguard: error:')} ${err.message}`);
    process.exit(EXIT.USAGE);
  }

  const msg = err instanceof Error ? err.message : String(err);
  console.error(`${color.red('vguard: error:')} ${msg}`);
  if (isDebugMode() && err instanceof Error && err.stack) {
    console.error(`\n${color.dim(err.stack)}`);
  } else if (!isDebugMode()) {
    console.error(color.dim('  Run with --debug or DEBUG=vguard* for a full stack trace.'));
  }
  process.exit(EXIT.SOFTWARE);
}

export function exitWith(code: ExitCode): never {
  process.exit(code);
}
