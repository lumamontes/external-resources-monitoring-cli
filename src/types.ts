export const outcomes = [
  'available',
  'inaccessible',
  'inconclusive',
  'unsupported',
  'invalid-input',
] as const;

export type Outcome = (typeof outcomes)[number];

export type AccessPerspective = 'anonymous-reader';

export interface Resource {
  id: string;
  url: string;
  title?: string;
  profile?: string;
}

export interface ValidationProfile {
  expectedContentTypes: string[];
  validatePdfSignature: boolean;
  maxBytes: number;
}

export interface MonitorPolicy {
  concurrency: number;
  timeoutMs: number;
  retries: number;
  maxBytes: number;
  failOn: Outcome[];
}

export interface MonitorConfig {
  version: 1;
  monitor: MonitorPolicy;
  profiles: Record<string, ValidationProfile>;
  providers: Record<string, Record<string, unknown>>;
}

export interface Observation {
  resourceId: string;
  provider: string;
  accessPerspective: AccessPerspective;
  outcome: Outcome;
  reason: string;
  observedAt: string;
  durationMs: number;
  evidence: Record<string, unknown>;
}

export interface ProviderContext {
  profile: ValidationProfile;
  config: MonitorPolicy;
  providerConfig: Record<string, unknown>;
  network: NetworkTransport;
}

export type NetworkTransport = (
  url: URL,
  init?: RequestInit,
) => Promise<Response>;

export interface Provider {
  name: string;
  recognize: (url: URL) => boolean;
  observe: (
    resource: Resource,
    context: ProviderContext,
  ) => Promise<Observation>;
}

export interface RunReport {
  version: 1;
  observedAt: string;
  results: Observation[];
  shouldFail: boolean;
}
