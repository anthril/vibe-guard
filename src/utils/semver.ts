/**
 * Lightweight semver utilities — no external dependencies.
 *
 * Handles standard semver (MAJOR.MINOR.PATCH) and prerelease versions
 * (e.g., 1.0.0-alpha.0, 2.0.0-beta.1).
 */

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

/**
 * Parse a semver string into its components.
 * Returns null if the string is not a valid semver.
 */
export function parseSemver(version: string): ParsedVersion | null {
  const match = version
    .trim()
    .replace(/^v/, '')
    .match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4] ? match[4].split('.') : [],
  };
}

/**
 * Compare two semver strings.
 * Returns:
 *   -1 if a < b
 *    0 if a === b
 *    1 if a > b
 *
 * Prerelease versions have lower precedence than release versions
 * (e.g., 1.0.0-alpha < 1.0.0).
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const pa = parseSemver(a);
  const pb = parseSemver(b);

  if (!pa || !pb) {
    // Fallback to string comparison if parsing fails
    return a < b ? -1 : a > b ? 1 : 0;
  }

  // Compare major.minor.patch
  for (const field of ['major', 'minor', 'patch'] as const) {
    if (pa[field] < pb[field]) return -1;
    if (pa[field] > pb[field]) return 1;
  }

  // Both have no prerelease — equal
  if (pa.prerelease.length === 0 && pb.prerelease.length === 0) return 0;

  // Release > prerelease (1.0.0 > 1.0.0-alpha)
  if (pa.prerelease.length === 0) return 1;
  if (pb.prerelease.length === 0) return -1;

  // Compare prerelease identifiers
  const maxLen = Math.max(pa.prerelease.length, pb.prerelease.length);
  for (let i = 0; i < maxLen; i++) {
    if (i >= pa.prerelease.length) return -1; // fewer fields = lower precedence
    if (i >= pb.prerelease.length) return 1;

    const ai = pa.prerelease[i];
    const bi = pb.prerelease[i];

    const aNum = /^\d+$/.test(ai) ? parseInt(ai, 10) : NaN;
    const bNum = /^\d+$/.test(bi) ? parseInt(bi, 10) : NaN;

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum < bNum) return -1;
      if (aNum > bNum) return 1;
    } else if (!isNaN(aNum)) {
      return -1; // numeric < string
    } else if (!isNaN(bNum)) {
      return 1;
    } else {
      if (ai < bi) return -1;
      if (ai > bi) return 1;
    }
  }

  return 0;
}

/**
 * Returns true if `latest` is a newer version than `current`.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareSemver(current, latest) === -1;
}
