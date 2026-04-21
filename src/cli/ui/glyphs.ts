import { isAsciiMode } from './env.js';

type GlyphKey = 'pass' | 'fail' | 'warn' | 'info' | 'bullet' | 'arrow' | 'dash' | 'plus' | 'dot';

const unicode: Record<GlyphKey, string> = {
  pass: '\u2713',
  fail: '\u2717',
  warn: '\u26A0',
  info: '\u2139',
  bullet: '\u2022',
  arrow: '\u2192',
  dash: '\u2014',
  plus: '+',
  dot: '\u00B7',
};

const ascii: Record<GlyphKey, string> = {
  pass: 'OK',
  fail: 'FAIL',
  warn: 'WARN',
  info: 'i',
  bullet: '*',
  arrow: '->',
  dash: '--',
  plus: '+',
  dot: '.',
};

export function glyph(key: GlyphKey): string {
  return isAsciiMode() ? ascii[key] : unicode[key];
}
