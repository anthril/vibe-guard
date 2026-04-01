import { writeCredentials, getCredentialsPath } from '../../cloud/credentials.js';

const CLOUD_URL = process.env.VIBECHECK_CLOUD_URL ?? 'https://app.vibecheck.dev';

/**
 * `vibecheck cloud login`
 *
 * Authenticates with VibeCheck Cloud.
 * Accepts a Supabase access token obtained from the dashboard CLI auth page.
 */
export async function cloudLoginCommand(options: { token?: string } = {}): Promise<void> {
  console.log('\n  VibeCheck Cloud — Login\n');

  if (options.token) {
    writeCredentials({
      accessToken: options.token,
    });
    console.log(`  Credentials saved to ${getCredentialsPath()}`);
    console.log('  You are now logged in to VibeCheck Cloud.\n');
    console.log('  Next step: run `vibecheck cloud connect` to register this project.\n');
    return;
  }

  const authUrl = `${CLOUD_URL}/cli`;

  console.log('  To authenticate, visit:');
  console.log(`  ${authUrl}\n`);
  console.log('  Sign in, then copy the command shown on that page.');
  console.log('  It will look like:');
  console.log('  npx vibecheck cloud login --token <your-token>\n');
}
