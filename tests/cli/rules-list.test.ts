import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Rule, VGuardConfig, ResolvedConfig, Preset } from '../../src/types.js';

vi.mock('../../src/presets/index.js', () => ({}));
vi.mock('../../src/rules/index.js', () => ({}));

vi.mock('../../src/engine/registry.js', () => ({
  getAllRules: vi.fn(),
}));

vi.mock('../../src/config/discovery.js', () => ({
  discoverConfigFile: vi.fn(),
  readRawConfig: vi.fn(),
}));

vi.mock('../../src/config/loader.js', () => ({
  resolveConfig: vi.fn(),
}));

vi.mock('../../src/config/presets.js', () => ({
  getAllPresets: vi.fn(() => new Map<string, Preset>()),
}));

vi.mock('../../src/cli/ui/banner.js', () => ({
  printBanner: vi.fn(),
}));

vi.mock('../../src/cli/ui/log.js', () => ({
  error: vi.fn(),
  info: vi.fn(),
}));

import { getAllRules } from '../../src/engine/registry.js';
import { discoverConfigFile, readRawConfig } from '../../src/config/discovery.js';
import { resolveConfig } from '../../src/config/loader.js';
import { rulesListCommand } from '../../src/cli/commands/rules.js';

function makeRule(overrides: Partial<Rule>): Rule {
  return {
    id: overrides.id ?? 'security/example',
    name: overrides.name ?? 'Example',
    description: overrides.description ?? 'desc',
    severity: overrides.severity ?? 'warn',
    events: overrides.events ?? ['PreToolUse'],
    match: overrides.match ?? {},
    check:
      overrides.check ?? (() => ({ status: 'pass', ruleId: overrides.id ?? 'security/example' })),
  };
}

describe('rulesListCommand --json', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true) as ReturnType<
      typeof vi.spyOn
    >;
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  it('reports resolved severity when the config overrides the catalogue default', async () => {
    const rule = makeRule({
      id: 'security/package-typosquat-guard',
      severity: 'warn', // catalogue default
    });

    vi.mocked(getAllRules).mockReturnValue(new Map([[rule.id, rule]]));
    vi.mocked(discoverConfigFile).mockReturnValue('/project/vguard.config.ts');
    vi.mocked(readRawConfig).mockResolvedValue({} as VGuardConfig);
    vi.mocked(resolveConfig).mockReturnValue({
      presets: [],
      agents: ['claude-code'],
      rules: new Map([[rule.id, { enabled: true, severity: 'block', options: {} }]]),
    } as ResolvedConfig);

    await rulesListCommand({ json: true, all: true });

    const written = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    const parsed = JSON.parse(written) as Array<{
      id: string;
      severity: string;
      enabled: boolean;
    }>;

    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(rule.id);
    // Must be the resolved severity, not the catalogue default.
    expect(parsed[0].severity).toBe('block');
    expect(parsed[0].enabled).toBe(true);
  });

  it('falls back to catalogue severity when the rule is not in the resolved config', async () => {
    const rule = makeRule({ id: 'quality/example', severity: 'info' });

    vi.mocked(getAllRules).mockReturnValue(new Map([[rule.id, rule]]));
    vi.mocked(discoverConfigFile).mockReturnValue('/project/vguard.config.ts');
    vi.mocked(readRawConfig).mockResolvedValue({} as VGuardConfig);
    vi.mocked(resolveConfig).mockReturnValue({
      presets: [],
      agents: ['claude-code'],
      rules: new Map(),
    } as ResolvedConfig);

    await rulesListCommand({ json: true, all: true });

    const written = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    const parsed = JSON.parse(written) as Array<{
      severity: string;
      enabled: boolean;
    }>;

    expect(parsed[0].severity).toBe('info');
    expect(parsed[0].enabled).toBe(false);
  });

  it('falls back to catalogue severity when resolveConfig throws', async () => {
    const rule = makeRule({ id: 'security/foo', severity: 'warn' });

    vi.mocked(getAllRules).mockReturnValue(new Map([[rule.id, rule]]));
    vi.mocked(discoverConfigFile).mockReturnValue('/project/vguard.config.ts');
    vi.mocked(readRawConfig).mockRejectedValue(new Error('bad config'));

    await rulesListCommand({ json: true, all: true });

    const written = stdoutSpy.mock.calls.map((c) => c[0]).join('');
    const parsed = JSON.parse(written) as Array<{ severity: string; enabled: boolean }>;
    expect(parsed[0].severity).toBe('warn');
    expect(parsed[0].enabled).toBe(false);
  });
});
