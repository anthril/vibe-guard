import { describe, it, expect, vi } from 'vitest';

// Mock fs to control which files exist
const mockFiles = new Map<string, string>();
vi.mock('node:fs', async () => {
  return {
    existsSync: vi.fn((p: string) => mockFiles.has(p.replace(/\\/g, '/'))),
    readFileSync: vi.fn((p: string) => {
      const content = mockFiles.get(p.replace(/\\/g, '/'));
      if (!content) throw new Error('ENOENT');
      return content;
    }),
  };
});

vi.mock('node:fs/promises', async () => {
  return {
    readFile: vi.fn(async (p: string) => {
      const content = mockFiles.get(p.replace(/\\/g, '/'));
      if (!content) throw new Error('ENOENT');
      return content;
    }),
  };
});

const { discoverConfigFile } = await import('../../src/config/discovery.js');

describe('config/discovery', () => {
  it('should find vibecheck.config.ts', () => {
    mockFiles.set('/project/vibecheck.config.ts', 'export default {}');
    const result = discoverConfigFile('/project');
    expect(result).not.toBeNull();
    expect(result?.format).toBe('typescript');
  });

  it('should find vibecheck.config.js', () => {
    mockFiles.clear();
    mockFiles.set('/project/vibecheck.config.js', 'module.exports = {}');
    const result = discoverConfigFile('/project');
    expect(result).not.toBeNull();
    expect(result?.format).toBe('javascript');
  });

  it('should find .vibecheckrc.json', () => {
    mockFiles.clear();
    mockFiles.set('/project/.vibecheckrc.json', '{}');
    const result = discoverConfigFile('/project');
    expect(result).not.toBeNull();
    expect(result?.format).toBe('json');
  });

  it('should find vibecheck field in package.json', () => {
    mockFiles.clear();
    mockFiles.set('/project/package.json', JSON.stringify({ vibecheck: { presets: [] } }));
    const result = discoverConfigFile('/project');
    expect(result).not.toBeNull();
    expect(result?.format).toBe('json');
  });

  it('should return null when no config exists', () => {
    mockFiles.clear();
    mockFiles.set('/project/package.json', JSON.stringify({ name: 'test' }));
    const result = discoverConfigFile('/project');
    expect(result).toBeNull();
  });

  it('should prioritize .ts over .js', () => {
    mockFiles.clear();
    mockFiles.set('/project/vibecheck.config.ts', 'export default {}');
    mockFiles.set('/project/vibecheck.config.js', 'module.exports = {}');
    const result = discoverConfigFile('/project');
    expect(result?.format).toBe('typescript');
  });
});
