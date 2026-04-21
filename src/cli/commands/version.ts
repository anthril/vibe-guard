import { formatVersion } from '../build-info.js';

export function versionCommand(): void {
  process.stdout.write(`vguard ${formatVersion()}\n`);
}
