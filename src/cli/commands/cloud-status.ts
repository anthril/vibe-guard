import { hasValidCredentials, readCredentials } from '../../cloud/credentials.js';
import { readSyncCursor } from '../../cloud/sync.js';

/**
 * `vguard cloud status`
 *
 * Shows the current Cloud connection status.
 */
export async function cloudStatusCommand(): Promise<void> {
  const projectRoot = process.cwd();

  console.log('\n  VGuard Cloud — Status\n');

  // Auth status
  const creds = readCredentials();
  if (creds && hasValidCredentials()) {
    console.log(`  Auth: Logged in${creds.email ? ` as ${creds.email}` : ''}`);
  } else {
    console.log('  Auth: Not logged in');
    console.log('  Run `vguard cloud login` to authenticate.\n');
    return;
  }

  // Sync status
  const cursor = readSyncCursor(projectRoot);
  if (cursor) {
    const lastSync = new Date(cursor.lastSyncedAt);
    const ago = getTimeAgo(lastSync);
    console.log(`  Last sync: ${ago} (${cursor.lastBatchSize} records)`);
  } else {
    console.log('  Last sync: Never');
  }

  console.log('');
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
