export type Verbosity = 'quiet' | 'normal' | 'verbose';

let asciiOverride: boolean | null = null;
let debugOverride: boolean | null = null;
let verbosity: Verbosity = 'normal';

export function setAsciiMode(enabled: boolean): void {
  asciiOverride = enabled;
}

export function setDebugMode(enabled: boolean): void {
  debugOverride = enabled;
}

export function setVerbosity(level: Verbosity): void {
  verbosity = level;
}

export function getVerbosity(): Verbosity {
  return verbosity;
}

export function isQuiet(): boolean {
  return verbosity === 'quiet';
}

export function isVerbose(): boolean {
  return verbosity === 'verbose';
}

export function isAsciiMode(): boolean {
  if (asciiOverride !== null) return asciiOverride;
  const lang = process.env.LANG ?? process.env.LC_ALL ?? process.env.LC_CTYPE ?? '';
  if (lang === 'C' || lang === 'POSIX') return true;
  if (process.env.TERM === 'dumb') return true;
  if (!/utf-?8/i.test(lang) && !process.env.LANG) {
    if (process.platform === 'win32' && !process.env.WT_SESSION) {
      return true;
    }
  }
  return false;
}

export function isDebugMode(): boolean {
  if (debugOverride !== null) return debugOverride;
  const debug = process.env.DEBUG ?? '';
  return /(^|[,\s*:])vguard([,\s*:]|$)/i.test(debug) || debug === '*';
}

export function isColorEnabled(stream: NodeJS.WriteStream = process.stdout): boolean {
  if ('NO_COLOR' in process.env && process.env.NO_COLOR !== '') return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true;
  return Boolean(stream.isTTY);
}

export function isCI(): boolean {
  return Boolean(process.env.CI) || process.env.CI === 'true';
}

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY) && !isCI();
}
