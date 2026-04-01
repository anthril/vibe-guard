/**
 * Normalize a file path for cross-platform comparison.
 * Converts backslashes to forward slashes and lowercases on Windows.
 */
export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

/**
 * Check if a file path is within a directory.
 * Both paths are normalized before comparison.
 */
export function isInDirectory(filePath: string, directory: string): boolean {
  const normalFile = normalizePath(filePath).toLowerCase();
  const normalDir = normalizePath(directory).toLowerCase().replace(/\/+$/, '');
  return normalFile.startsWith(normalDir + '/');
}

/**
 * Get the file extension from a path (lowercase, without dot).
 */
export function getExtension(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastDot = normalized.lastIndexOf('.');
  if (lastDot === -1) return '';
  return normalized.slice(lastDot + 1).toLowerCase();
}

/**
 * Get the filename from a path (without directory).
 */
export function getFilename(filePath: string): string {
  const normalized = normalizePath(filePath);
  const lastSlash = normalized.lastIndexOf('/');
  return lastSlash === -1 ? normalized : normalized.slice(lastSlash + 1);
}

/**
 * Check if a path matches any of the given glob-like patterns.
 * Supports simple patterns: *, **, and directory matching.
 */
export function matchesPattern(filePath: string, patterns: string[]): boolean {
  const normalized = normalizePath(filePath).toLowerCase();
  return patterns.some((pattern) => {
    const normalizedPattern = normalizePath(pattern).toLowerCase();
    // Exact match
    if (normalized === normalizedPattern) return true;
    // Directory prefix match (pattern ends with /)
    if (normalizedPattern.endsWith('/') && normalized.startsWith(normalizedPattern)) return true;
    // Simple wildcard: *.ts matches any .ts file
    if (normalizedPattern.startsWith('*.')) {
      const ext = normalizedPattern.slice(1);
      return normalized.endsWith(ext);
    }
    // Directory contains: **/pattern matches anywhere in path
    if (normalizedPattern.startsWith('**/')) {
      const suffix = normalizedPattern.slice(3);
      return normalized.includes('/' + suffix) || normalized.endsWith(suffix);
    }
    return false;
  });
}
