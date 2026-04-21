import { isColorEnabled } from './env.js';

const codes = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
} as const;

type ColorName = keyof typeof codes;

function wrap(name: ColorName) {
  return (s: string): string => {
    if (!isColorEnabled(process.stdout) && !isColorEnabled(process.stderr)) return s;
    return `${codes[name]}${s}${codes.reset}`;
  };
}

export const color = {
  bold: wrap('bold'),
  dim: wrap('dim'),
  red: wrap('red'),
  green: wrap('green'),
  yellow: wrap('yellow'),
  blue: wrap('blue'),
  magenta: wrap('magenta'),
  cyan: wrap('cyan'),
  gray: wrap('gray'),
};

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*m/g;

export function strip(s: string): string {
  return s.replace(ANSI_RE, '');
}
