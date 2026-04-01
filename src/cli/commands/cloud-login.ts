import { writeCredentials, getCredentialsPath } from '../../cloud/credentials.js';

const CLOUD_URL = process.env.VIBECHECK_CLOUD_URL ?? 'https://app.vibecheck.dev';

/**
 * `vibecheck cloud login`
 *
 * Authenticates with VibeCheck Cloud.
 * Stores access token, refresh token, and API URL in credentials.
 */
export async function cloudLoginCommand(
  options: {
    token?: string;
    refreshToken?: string;
    url?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
  } = {},
): Promise<void> {
  console.log('\n  VibeCheck Cloud — Login\n');

  if (options.token) {
    // Decode JWT to extract expiry and email
    let expiresAt: string | undefined;
    let email: string | undefined;
    try {
      const payload = JSON.parse(Buffer.from(options.token.split('.')[1], 'base64').toString());
      if (payload.exp) {
        expiresAt = new Date(payload.exp * 1000).toISOString();
      }
      email = payload.email;
    } catch {
      // Non-JWT token, skip parsing
    }

    writeCredentials({
      accessToken: options.token,
      refreshToken: options.refreshToken,
      expiresAt,
      email,
      apiUrl: options.url,
      supabaseUrl: options.supabaseUrl,
      supabaseAnonKey: options.supabaseAnonKey,
    });

    console.log(`  Credentials saved to ${getCredentialsPath()}`);
    if (email) console.log(`  Logged in as ${email}`);
    if (options.url) console.log(`  API URL: ${options.url}`);
    if (options.refreshToken) {
      console.log('  Refresh token stored — sessions will auto-renew.');
    } else {
      console.log('  No refresh token — session will expire in ~1 hour.');
    }
    console.log('\n  Next step: run `npx vibecheck cloud connect` to register this project.\n');
    return;
  }

  const authUrl = `${CLOUD_URL}/cli`;

  console.log('  To authenticate, visit:');
  console.log(`  ${authUrl}\n`);
  console.log('  Sign in, then copy the command shown on that page.');
  console.log('  It will look like:');
  console.log('  npx vibecheck cloud login --token <your-token>\n');
}
