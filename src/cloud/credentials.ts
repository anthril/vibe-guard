import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const CREDENTIALS_DIR = join(homedir(), '.vibecheck');
const CREDENTIALS_FILE = join(CREDENTIALS_DIR, 'credentials.json');

export interface CloudCredentials {
  /** OAuth access token */
  accessToken: string;
  /** Token refresh token */
  refreshToken?: string;
  /** Token expiry timestamp (ISO 8601) */
  expiresAt?: string;
  /** User email */
  email?: string;
}

/**
 * Read stored Cloud credentials.
 * Returns null if no credentials are stored.
 */
export function readCredentials(): CloudCredentials | null {
  try {
    if (!existsSync(CREDENTIALS_FILE)) return null;
    const raw = readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(raw) as CloudCredentials;
  } catch {
    return null;
  }
}

/**
 * Store Cloud credentials to disk.
 */
export function writeCredentials(credentials: CloudCredentials): void {
  if (!existsSync(CREDENTIALS_DIR)) {
    mkdirSync(CREDENTIALS_DIR, { recursive: true, mode: 0o700 });
  }
  writeFileSync(CREDENTIALS_FILE, JSON.stringify(credentials, null, 2), {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

/**
 * Remove stored Cloud credentials.
 */
export function clearCredentials(): void {
  try {
    if (existsSync(CREDENTIALS_FILE)) {
      unlinkSync(CREDENTIALS_FILE);
    }
  } catch {
    // Ignore errors during cleanup
  }
}

/**
 * Check if credentials exist and are not expired.
 */
export function hasValidCredentials(): boolean {
  const creds = readCredentials();
  if (!creds) return false;

  if (creds.expiresAt) {
    const expiry = new Date(creds.expiresAt);
    if (expiry <= new Date()) return false;
  }

  return !!creds.accessToken;
}

export function getCredentialsPath(): string {
  return CREDENTIALS_FILE;
}
