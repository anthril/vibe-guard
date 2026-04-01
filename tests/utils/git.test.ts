import { describe, it, expect, vi } from 'vitest';

// Mock execSync to avoid real git operations
vi.mock('node:child_process', () => ({
  execSync: vi.fn((cmd: string) => {
    if (cmd.includes('branch --show-current')) return 'main\n';
    if (cmd.includes('rev-parse --show-toplevel')) return '/project\n';
    if (cmd.includes('status --porcelain')) return 'M src/index.ts\n';
    if (cmd.includes('rev-list --count')) return '3\n';
    if (cmd.includes('rev-parse --abbrev-ref')) return 'origin/main\n';
    throw new Error('unknown command');
  }),
}));

// Import after mocking
const { getCurrentBranch, isDirty, getUnpushedCount, hasRemoteTracking, buildGitContext } =
  await import('../../src/utils/git.js');

describe('utils/git', () => {
  describe('getCurrentBranch', () => {
    it('should return current branch name', () => {
      expect(getCurrentBranch('/project')).toBe('main');
    });
  });

  describe('isDirty', () => {
    it('should return true when there are changes', () => {
      expect(isDirty('/project')).toBe(true);
    });
  });

  describe('getUnpushedCount', () => {
    it('should return count of unpushed commits', () => {
      expect(getUnpushedCount('/project')).toBe(3);
    });
  });

  describe('hasRemoteTracking', () => {
    it('should return true when remote is tracked', () => {
      expect(hasRemoteTracking('/project')).toBe(true);
    });
  });

  describe('buildGitContext', () => {
    it('should build a complete git context', () => {
      const ctx = buildGitContext('/project/src/index.ts');
      expect(ctx.branch).toBe('main');
      expect(ctx.isDirty).toBe(true);
      expect(ctx.repoRoot).toBe('/project');
      expect(ctx.unpushedCount).toBe(3);
      expect(ctx.hasRemote).toBe(true);
    });
  });
});
