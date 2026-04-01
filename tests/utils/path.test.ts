import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  isInDirectory,
  getExtension,
  getFilename,
  matchesPattern,
} from '../../src/utils/path.js';

describe('utils/path', () => {
  describe('normalizePath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizePath('C:\\Users\\test\\file.ts')).toBe('C:/Users/test/file.ts');
    });

    it('should leave forward slashes unchanged', () => {
      expect(normalizePath('/project/src/index.ts')).toBe('/project/src/index.ts');
    });
  });

  describe('isInDirectory', () => {
    it('should return true when file is inside directory', () => {
      expect(isInDirectory('/project/src/index.ts', '/project/src')).toBe(true);
    });

    it('should return false when file is outside directory', () => {
      expect(isInDirectory('/project/src/index.ts', '/other')).toBe(false);
    });

    it('should handle trailing slashes', () => {
      expect(isInDirectory('/project/src/index.ts', '/project/src/')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isInDirectory('/Project/Src/Index.ts', '/project/src')).toBe(true);
    });
  });

  describe('getExtension', () => {
    it('should return lowercase extension', () => {
      expect(getExtension('/path/to/file.TS')).toBe('ts');
    });

    it('should return empty string for no extension', () => {
      expect(getExtension('/path/to/Makefile')).toBe('');
    });

    it('should handle multiple dots', () => {
      expect(getExtension('/path/to/file.test.ts')).toBe('ts');
    });
  });

  describe('getFilename', () => {
    it('should extract filename from path', () => {
      expect(getFilename('/project/src/index.ts')).toBe('index.ts');
    });

    it('should handle backslashes', () => {
      expect(getFilename('C:\\project\\src\\index.ts')).toBe('index.ts');
    });

    it('should return the whole string if no slashes', () => {
      expect(getFilename('index.ts')).toBe('index.ts');
    });
  });

  describe('matchesPattern', () => {
    it('should match exact paths', () => {
      expect(matchesPattern('/project/src/index.ts', ['/project/src/index.ts'])).toBe(true);
    });

    it('should match extension wildcards', () => {
      expect(matchesPattern('/project/src/file.ts', ['*.ts'])).toBe(true);
      expect(matchesPattern('/project/src/file.js', ['*.ts'])).toBe(false);
    });

    it('should match directory prefixes', () => {
      expect(matchesPattern('/project/src/index.ts', ['src/'])).toBe(false);
      expect(matchesPattern('/project/src/index.ts', ['/project/src/'])).toBe(true);
    });

    it('should match ** glob patterns', () => {
      expect(matchesPattern('/project/src/deep/file.test.ts', ['**/file.test.ts'])).toBe(true);
      expect(matchesPattern('/project/src/utils.ts', ['**/utils.ts'])).toBe(true);
    });

    it('should return false for no matches', () => {
      expect(matchesPattern('/project/src/index.ts', ['*.py', '*.go'])).toBe(false);
    });
  });
});
