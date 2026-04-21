import { hasValidCredentials, readCredentials } from '../../cloud/credentials.js';
import { readSyncCursor } from '../../cloud/sync.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { info } from '../ui/log.js';

/**
 * `vguard cloud status`
 */
export async function cloudStatusCommand(): Promise<void> {
  const projectRoot = process.cwd();

  printBanner('Cloud Status');

  const creds = readCredentials();
  if (creds && hasValidCredentials()) {
    info(
      `  ${color.green(glyph('pass'))} Auth: ${color.green('Logged in')}${creds.email ? ` as ${creds.email}` : ''}`,
    );
  } else {
    info(`  ${color.red(glyph('fail'))} Auth: ${color.red('Not logged in')}`);
    info(color.dim('  Run `vguard cloud login` to authenticate.\n'));
    return;
  }

  const cursor = readSyncCursor(projectRoot);
  if (cursor) {
    const lastSync = new Date(cursor.lastSyncedAt);
    const ago = getTimeAgo(lastSync);
    info(
      `  ${color.green(glyph('pass'))} Last sync: ${ago} ${color.dim(`(${cursor.lastBatchSize} records)`)}`,
    );
  } else {
    info(`  ${color.dim(glyph('dot'))} Last sync: ${color.dim('Never')}`);
  }

  info('');
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
