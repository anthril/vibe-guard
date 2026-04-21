import { syncToCloud } from '../../cloud/sync.js';
import { readCredentials } from '../../cloud/credentials.js';
import { maybePushConfigSnapshot } from '../../cloud/config-pusher.js';
import { startSpinner } from '../ui/spinner.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { error, info } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';

/**
 * `vguard sync`
 */
export async function syncCommand(
  options: { force?: boolean; dryRun?: boolean } = {},
): Promise<void> {
  const projectRoot = process.cwd();

  printBanner('Cloud Sync', 'Uploading rule-hits data');

  const apiKey = process.env.VGUARD_API_KEY ?? readCredentials()?.apiKey;
  if (!apiKey) {
    error('No API key found.');
    console.error(color.dim('  Run `npx vguard cloud connect` to register this project.'));
    process.exit(EXIT.NO_PERM);
  }

  if (options.dryRun) {
    info(color.dim('  Dry run - no data will be uploaded.\n'));
  }

  const spinner = startSpinner(options.dryRun ? 'Computing sync preview' : 'Uploading to Cloud');
  const result = await syncToCloud(projectRoot, apiKey, {
    force: options.force,
    dryRun: options.dryRun,
  });
  spinner.stop();

  if (result.error) {
    error(`Sync failed: ${result.error}`);
    // Fail-open: exit 0 so it doesn't block the developer
    return;
  }

  if (options.dryRun) {
    info(
      `  ${color.cyan(glyph('info'))} Would sync ${color.bold(String(result.skipped))} records.\n`,
    );
    return;
  }

  if (result.synced > 0) {
    info(
      `  ${color.green(glyph('pass'))} Synced ${color.bold(String(result.synced))} records to Cloud.`,
    );
  } else {
    info(`  ${color.dim(glyph('dot'))} No new records to sync.`);
  }

  const configPush = await maybePushConfigSnapshot(projectRoot, apiKey);
  if (configPush.pushed) {
    info(`  ${color.green(glyph('pass'))} Pushed project config snapshot to Cloud.\n`);
  } else {
    info('');
  }
}
