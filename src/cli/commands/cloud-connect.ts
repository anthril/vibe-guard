import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { hasValidCredentials, readCredentials, writeCredentials } from '../../cloud/credentials.js';
import { CloudClient } from '../../cloud/client.js';
import { printBanner } from '../ui/banner.js';
import { color } from '../ui/colors.js';
import { glyph } from '../ui/glyphs.js';
import { error, info } from '../ui/log.js';
import { EXIT } from '../exit-codes.js';

const CLOUD_URL = process.env.VGUARD_CLOUD_URL ?? 'https://vguard.dev';

/**
 * `vguard cloud connect`
 *
 * Registers the current repository with VGuard Cloud.
 * Auto-updates vguard.config.ts and saves API key to .env.local.
 */
export async function cloudConnectCommand(
  options: { name?: string; key?: string; projectId?: string } = {},
): Promise<void> {
  const projectRoot = process.cwd();

  printBanner('Cloud Connect', 'Register repository with VGuard Cloud');

  // Validate partial --key / --project-id up front so we don't surprise the
  // user with an auth step they didn't ask for.
  if ((options.key && !options.projectId) || (!options.key && options.projectId)) {
    error('--key and --project-id must be provided together.');
    console.error(color.dim('  Example: vguard cloud connect --key vc_... --project-id abc-123'));
    process.exit(EXIT.USAGE);
  }

  let apiKey: string;
  let projectId: string;

  if (options.key && options.projectId) {
    apiKey = options.key;
    projectId = options.projectId;
  } else {
    if (!hasValidCredentials()) {
      info('  Not logged in. You have two options:\n');
      info(`  ${color.bold('Option A')} - Login via browser:`);
      info(`    1. Visit ${color.cyan(`${CLOUD_URL}/cli`)}`);
      info('    2. Copy the command and run it');
      info('    3. Then run: npx vguard cloud connect\n');
      info(`  ${color.bold('Option B')} - Use an existing API key:`);
      info(color.dim('    npx vguard cloud connect --key <vc_key> --project-id <id>\n'));
      info('  Create a project at the dashboard to get your key and ID.\n');
      process.exit(EXIT.NO_PERM);
    }

    const projectName = options.name ?? projectRoot.split(/[/\\]/).pop() ?? 'unnamed';

    try {
      const client = new CloudClient();
      const result = await client.connectProject(projectName);
      apiKey = result.apiKey;
      projectId = result.projectId;

      info(`  ${color.green(glyph('pass'))} Project registered: ${color.bold(projectName)}`);
      info(`  Project ID: ${projectId}`);
      info(`  API Key: ${color.dim(apiKey)}\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      error(`Failed to connect: ${message}`);
      process.exit(EXIT.UNAVAILABLE);
    }
  }

  const creds = readCredentials();
  writeCredentials({ ...(creds ?? {}), apiKey, projectId });
  info(`  ${color.green(glyph('pass'))} Saved API key to credentials.`);

  if (updateConfigFile(projectRoot, projectId)) {
    info(`  ${color.green(glyph('pass'))} Updated vguard.config.ts with cloud settings.`);
  }

  if (updateEnvFile(projectRoot, apiKey)) {
    info(`  ${color.green(glyph('pass'))} Saved API key to .env.local`);
  }

  info(`\n  ${color.green('Cloud connected!')} Run \`npx vguard generate\` to rebuild hooks.\n`);
}

function updateConfigFile(projectRoot: string, projectId: string): boolean {
  const configPath = join(projectRoot, 'vguard.config.ts');
  if (!existsSync(configPath)) return false;

  try {
    let content = readFileSync(configPath, 'utf-8');

    if (/cloud\s*:\s*\{/.test(content)) {
      // Update existing projectId
      content = content.replace(/projectId\s*:\s*['"][^'"]*['"]/, `projectId: '${projectId}'`);

      // Upsert enabled: true. `cloud connect` is an explicit opt-in to
      // real-time cloud sync, so any existing `enabled: false` must
      // flip to true. If the field is missing, insert it after the
      // cloud: { opening brace.
      if (/enabled\s*:\s*(?:true|false)/.test(content)) {
        content = content.replace(/enabled\s*:\s*false/, 'enabled: true');
      } else {
        content = content.replace(/(cloud\s*:\s*\{\s*\n)/, `$1    enabled: true,\n`);
      }

      // Upsert autoSync: true for the same reason — `cloud connect`
      // should opt the project into real-time streaming by default.
      if (/autoSync\s*:\s*(?:true|false)/.test(content)) {
        content = content.replace(/autoSync\s*:\s*false/, 'autoSync: true');
      } else {
        content = content.replace(
          /(projectId\s*:\s*['"][^'"]*['"],?\s*\n)/,
          `$1    autoSync: true,\n`,
        );
      }
    } else {
      // Ensure the last property before }); has a trailing comma
      content = content.replace(/(\s*)(}|])\s*\n(\}\);?\s*)$/, '$1$2,\n$3');

      // Insert cloud config before the closing });
      const cloudBlock = [
        '  cloud: {',
        '    enabled: true,',
        `    projectId: '${projectId}',`,
        '    autoSync: true,',
        '  },',
      ].join('\n');
      content = content.replace(/(\n\}\);?\s*)$/, `\n${cloudBlock}\n});`);
    }

    writeFileSync(configPath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}

function updateEnvFile(projectRoot: string, apiKey: string): boolean {
  const envPath = join(projectRoot, '.env.local');

  try {
    let content = '';

    if (existsSync(envPath)) {
      content = readFileSync(envPath, 'utf-8');
      if (/^VGUARD_API_KEY=/m.test(content)) {
        content = content.replace(/^VGUARD_API_KEY=.*$/m, `VGUARD_API_KEY=${apiKey}`);
      } else {
        if (!content.endsWith('\n')) content += '\n';
        content += `\n# VGuard Cloud\nVGUARD_API_KEY=${apiKey}\n`;
      }
    } else {
      content = `# VGuard Cloud\nVGUARD_API_KEY=${apiKey}\n`;
    }

    writeFileSync(envPath, content, 'utf-8');
    return true;
  } catch {
    return false;
  }
}
