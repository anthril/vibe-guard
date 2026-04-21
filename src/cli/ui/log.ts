import { color } from './colors.js';
import { isQuiet, isVerbose } from './env.js';
import { EXIT, type ExitCode } from '../exit-codes.js';

export function info(message: string): void {
  if (isQuiet()) return;
  console.log(message);
}

export function warn(message: string): void {
  console.error(color.yellow(message));
}

export function error(message: string): void {
  console.error(`${color.red('vguard: error:')} ${message}`);
}

export function verbose(message: string): void {
  if (!isVerbose()) return;
  console.error(color.dim(`[verbose] ${message}`));
}

export function raw(message: string): void {
  process.stdout.write(message);
}

export function fail(message: string, code: ExitCode = EXIT.SOFTWARE): never {
  error(message);
  process.exit(code);
}
