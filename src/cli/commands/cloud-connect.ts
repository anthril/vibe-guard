import { hasValidCredentials } from '../../cloud/credentials.js';
import { CloudClient } from '../../cloud/client.js';

const CLOUD_URL = process.env.VIBECHECK_CLOUD_URL ?? 'https://app.vibecheck.dev';

/**
 * `vibecheck cloud connect`
 *
 * Registers the current repository with VibeCheck Cloud.
 * Generates an API key for syncing rule hits.
 *
 * Supports two flows:
 * 1. Token-based: `vibecheck cloud login --token <jwt>` first, then `vibecheck cloud connect`
 * 2. Key-based: `vibecheck cloud connect --key <vc_key> --project-id <id>` (skip login)
 */
export async function cloudConnectCommand(
  options: { name?: string; key?: string; projectId?: string } = {},
): Promise<void> {
  const projectRoot = process.cwd();

  console.log('\n  VibeCheck Cloud — Connect Repository\n');

  // Flow 2: direct key + project ID (skips login requirement)
  if (options.key && options.projectId) {
    console.log('  Project connected with provided API key.\n');
    console.log('  Add these to your vibecheck.config.ts:\n');
    console.log('  cloud: {');
    console.log('    enabled: true,');
    console.log(`    projectId: "${options.projectId}",`);
    console.log('    autoSync: true,');
    console.log('  }\n');
    console.log('  Store the API key as an environment variable:');
    console.log(`  VIBECHECK_API_KEY=${options.key}\n`);
    return;
  }

  // Flow 1: register via API using stored credentials
  if (!hasValidCredentials()) {
    console.log('  Not logged in. You have two options:\n');
    console.log('  Option A — Login via browser:');
    console.log(`    1. Visit ${CLOUD_URL}/cli`);
    console.log('    2. Copy the command and run it');
    console.log('    3. Then run: npx vibecheck cloud connect\n');
    console.log('  Option B — Use an existing API key:');
    console.log('    npx vibecheck cloud connect --key <vc_key> --project-id <id>\n');
    console.log('  Create a project at the dashboard to get your key and ID.\n');
    process.exit(1);
  }

  const projectName = options.name ?? projectRoot.split(/[/\\]/).pop() ?? 'unnamed';

  try {
    const client = new CloudClient();
    const result = await client.connectProject(projectName);

    console.log(`  Project registered: ${projectName}`);
    console.log(`  Project ID: ${result.projectId}`);
    console.log(`  API Key: ${result.apiKey}\n`);
    console.log('  Add these to your vibecheck.config.ts:\n');
    console.log('  cloud: {');
    console.log('    enabled: true,');
    console.log(`    projectId: "${result.projectId}",`);
    console.log('    autoSync: true,');
    console.log('  }\n');
    console.log('  Store the API key as an environment variable:');
    console.log(`  VIBECHECK_API_KEY=${result.apiKey}\n`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`  Failed to connect: ${message}\n`);
    process.exit(1);
  }
}
