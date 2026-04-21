import { color } from './colors.js';
import { isQuiet } from './env.js';
import { glyph } from './glyphs.js';

export function banner(verb: string, subject?: string): string {
  const dash = glyph('dash');
  const head = color.bold(`VGuard ${verb}`);
  if (!subject) return `\n  ${head}\n`;
  return `\n  ${head} ${color.dim(dash)} ${subject}\n`;
}

export function printBanner(verb: string, subject?: string): void {
  if (isQuiet()) return;
  process.stdout.write(banner(verb, subject));
}
