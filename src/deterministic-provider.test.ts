import { describe, expect, it } from 'vitest';

import { createDeterministicProvider } from './deterministic-provider.js';
import type { Resource } from './types.js';

const resource: Resource = {
  id: 'zine-001',
  url: 'https://example.test/publication.pdf',
};

describe('createDeterministicProvider', () => {
  it('returns the configured observation for a recognized resource', async () => {
    const provider = createDeterministicProvider({
      [resource.url]: {
        outcome: 'available',
        reason: 'fixture content retrieved',
        evidence: { contentType: 'application/pdf' },
      },
    });

    const observation = await provider.observe(resource, {
      profile: {
        expectedContentTypes: ['application/pdf'],
        validatePdfSignature: true,
        maxBytes: 1024,
      },
      config: {
        concurrency: 1,
        timeoutMs: 1000,
        retries: 0,
        maxBytes: 1024,
        failOn: ['inaccessible', 'invalid-input'],
      },
      providerConfig: {},
      network: async () => new Response(),
    });

    expect(observation).toMatchObject({
      resourceId: 'zine-001',
      provider: 'deterministic',
      outcome: 'available',
      reason: 'fixture content retrieved',
    });
  });
});
