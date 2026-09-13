import { describe, expect, it } from 'vitest';

import { runMonitor } from './run-monitor.js';
import type { MonitorConfig, Provider, Resource } from './types.js';

const config: MonitorConfig = {
  version: 1,
  monitor: {
    concurrency: 1,
    timeoutMs: 1000,
    retries: 0,
    maxBytes: 1024,
    failOn: ['inaccessible', 'invalid-input'],
  },
  profiles: {
    publication: {
      expectedContentTypes: ['application/pdf'],
      validatePdfSignature: true,
      maxBytes: 1024,
    },
  },
  providers: {},
};

const resource: Resource = {
  id: 'zine-001',
  url: 'https://example.test/publication.pdf',
  title: 'A publication',
  profile: 'publication',
};

describe('runMonitor', () => {
  it('returns an available observation from a deterministic provider', async () => {
    const provider: Provider = {
      name: 'deterministic',
      recognize: () => true,
      observe: async (observedResource) => ({
        resourceId: observedResource.id,
        provider: 'deterministic',
        accessPerspective: 'anonymous-reader',
        outcome: 'available',
        reason: 'expected content retrieved',
        observedAt: '2026-09-12T00:00:00.000Z',
        durationMs: 3,
        evidence: { contentType: 'application/pdf' },
      }),
    };

    const report = await runMonitor({
      resources: [resource],
      config,
      providers: [provider],
    });

    expect(report.results).toEqual([
      expect.objectContaining({
        resourceId: 'zine-001',
        outcome: 'available',
        accessPerspective: 'anonymous-reader',
      }),
    ]);
    expect(report.shouldFail).toBe(false);
  });
});
