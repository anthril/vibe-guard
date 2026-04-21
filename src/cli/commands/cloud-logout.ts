import { clearCredentials, hasValidCredentials } from '../../cloud/credentials.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { info } from '../ui/log.js';

/**
 * `vguard cloud logout`
 */
export async function cloudLogoutCommand(): Promise<void> {
  printBanner('Cloud Logout');

  if (!hasValidCredentials()) {
    info(`  ${color.dim(glyph('dot'))} Not currently logged in.\n`);
    return;
  }

  clearCredentials();
  info(`  ${color.green(glyph('pass'))} Credentials removed. You are now logged out.\n`);
}
