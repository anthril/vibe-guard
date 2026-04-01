import { syncToCloud } from '../../cloud/sync.js';
import { readCredentials } from '../../cloud/credentials.js';

/**
 * `vibecheck sync`
 *
 * Uploads rule-hits.jsonl data to VibeCheck Cloud since last sync.
 */
export async function syncCommand(
  options: { force?: boolean; dryRun?: boolean } = {},
): Promise<void> {
  const projectRoot = process.cwd();

  console.log('\n  VibeCheck Cloud — Sync\n');

  // Get API key from environment or stored credentials
  const apiKey = process.env.VIBECHECK_API_KEY ?? readCredentials()?.apiKey;
  if (!apiKey) {
    console.error('  No API key found.');
    console.error('  Run `npx vibecheck cloud connect` to register this project.\n');
    process.exit(1);
  }

  if (options.dryRun) {
    console.log('  Dry run — no data will be uploaded.\n');
  }

  const result = await syncToCloud(projectRoot, apiKey, {
    force: options.force,
    dryRun: options.dryRun,
  });

  if (result.error) {
    console.error(`  Sync failed: ${result.error}\n`);
    // Fail-open: exit 0 so it doesn't block the developer
    return;
  }

  if (options.dryRun) {
    console.log(`  Would sync ${result.skipped} records.\n`);
  } else if (result.synced > 0) {
    console.log(`  Synced ${result.synced} records to Cloud.\n`);
  } else {
    console.log('  No new records to sync.\n');
  }
}
