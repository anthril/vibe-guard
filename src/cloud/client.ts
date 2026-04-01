import { readCredentials } from './credentials.js';

const DEFAULT_API_URL = process.env.VIBECHECK_CLOUD_URL ?? 'https://api.vibecheck.dev';

export interface CloudClientOptions {
  apiUrl?: string;
  apiKey?: string;
}

export interface CloudApiError {
  code: string;
  message: string;
  status: number;
}

/**
 * Lightweight HTTP client for the VibeCheck Cloud API.
 */
export class CloudClient {
  private apiUrl: string;
  private apiKey?: string;

  constructor(options: CloudClientOptions = {}) {
    this.apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '');
    this.apiKey = options.apiKey;
  }

  /**
   * POST rule hits batch to the ingest endpoint.
   * Uses project API key authentication.
   */
  async ingest(apiKey: string, records: unknown[]): Promise<{ ingested: number }> {
    const body = records.map((r) => JSON.stringify(r)).join('\n');
    const res = await this.request('/api/v1/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-ndjson',
        'X-API-Key': apiKey,
      },
      body,
    });
    return res as { ingested: number };
  }

  /**
   * Register a project with Cloud.
   * Returns the generated API key (shown once).
   */
  async connectProject(
    name: string,
    repoUrl?: string,
  ): Promise<{ projectId: string; apiKey: string }> {
    return this.authenticatedRequest('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify({ name, repoUrl }),
    }) as Promise<{ projectId: string; apiKey: string }>;
  }

  /**
   * Get the current project status.
   */
  async getProjectStatus(projectId: string): Promise<{
    name: string;
    plan: string;
    lastSyncAt: string | null;
    ruleHitsCount: number;
  }> {
    return this.authenticatedRequest(`/api/v1/projects/${projectId}/summary`) as Promise<{
      name: string;
      plan: string;
      lastSyncAt: string | null;
      ruleHitsCount: number;
    }>;
  }

  private async authenticatedRequest(path: string, init?: RequestInit): Promise<unknown> {
    const credentials = readCredentials();
    if (!credentials) {
      throw new Error('Not logged in. Run `vibecheck cloud login` first.');
    }

    return this.request(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${credentials.accessToken}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  private async request(path: string, init?: RequestInit): Promise<unknown> {
    const url = `${this.apiUrl}${path}`;
    const res = await fetch(url, init);

    if (!res.ok) {
      let error: CloudApiError;
      try {
        error = (await res.json()) as CloudApiError;
      } catch {
        error = { code: 'UNKNOWN', message: res.statusText, status: res.status };
      }
      throw new Error(`Cloud API error (${error.status}): ${error.message}`);
    }

    return res.json();
  }
}
