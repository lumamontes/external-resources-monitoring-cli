import { describe, expect, it } from 'vitest';

import { runMonitor } from './run-monitor.js';
import type {
  MonitorConfig,
  NetworkTransport,
  Provider,
  Resource,
} from './types.js';

const config: MonitorConfig = {
  version: 1,
  monitor: {
    defaultProfile: 'publication',
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
        title: 'A publication',
        outcome: 'available',
        accessPerspective: 'anonymous-reader',
      }),
    ]);
    expect(report.shouldFail).toBe(false);
  });

  it('passes provider configuration and network transport through the seam', async () => {
    const network = async () => new Response();
    let receivedConfig: Record<string, unknown> | undefined;
    let receivedNetwork: NetworkTransport | undefined;
    const provider: Provider = {
      name: 'deterministic',
      recognize: () => true,
      observe: async (observedResource, context) => {
        receivedConfig = context.providerConfig;
        receivedNetwork = context.network;
        return {
          resourceId: observedResource.id,
          provider: 'deterministic',
          accessPerspective: 'anonymous-reader',
          outcome: 'available',
          reason: 'expected content retrieved',
          observedAt: '2026-09-12T00:00:00.000Z',
          durationMs: 3,
          evidence: {},
        };
      },
    };

    await runMonitor({
      resources: [resource],
      config: { ...config, providers: { deterministic: { mode: 'fixture' } } },
      providers: [provider],
      network,
    });

    expect(receivedConfig).toEqual({ mode: 'fixture' });
    expect(receivedNetwork).toBe(network);
  });

  it('classifies an unexpected provider failure as inconclusive', async () => {
    const provider: Provider = {
      name: 'deterministic',
      recognize: () => true,
      observe: async () => {
        throw new Error('fixture transport failed');
      },
    };

    const report = await runMonitor({
      resources: [resource],
      config: {
        ...config,
        monitor: { ...config.monitor, failOn: ['inaccessible'] },
      },
      providers: [provider],
    });

    expect(report.results[0]).toMatchObject({
      outcome: 'inconclusive',
      reason: 'provider check failed: fixture transport failed',
    });
    expect(report.shouldFail).toBe(false);
  });

  it('classifies a provider recognition failure as inconclusive', async () => {
    const provider: Provider = {
      name: 'broken-recognizer',
      recognize: () => {
        throw new Error('fixture recognizer failed');
      },
      observe: async () => {
        throw new Error('should not observe');
      },
    };

    const report = await runMonitor({
      resources: [resource],
      config,
      providers: [provider],
    });

    expect(report.results[0]).toMatchObject({
      provider: 'broken-recognizer',
      outcome: 'inconclusive',
      reason: 'provider recognition failed',
    });
  });

  it('limits concurrent provider observations', async () => {
    let active = 0;
    let maximumActive = 0;
    const provider: Provider = {
      name: 'deterministic',
      recognize: () => true,
      observe: async (observedResource) => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active -= 1;
        return {
          resourceId: observedResource.id,
          provider: 'deterministic',
          accessPerspective: 'anonymous-reader',
          outcome: 'available',
          reason: 'expected content retrieved',
          observedAt: '2026-09-12T00:00:00.000Z',
          durationMs: 3,
          evidence: {},
        };
      },
    };

    await runMonitor({
      resources: Array.from({ length: 4 }, (_, index) => ({
        ...resource,
        id: `zine-${index}`,
      })),
      config: { ...config, monitor: { ...config.monitor, concurrency: 2 } },
      providers: [provider],
    });

    expect(maximumActive).toBe(2);
  });

  it('completes the full batch and preserves input order', async () => {
    const provider: Provider = {
      name: 'deterministic',
      recognize: (url) => url.hostname === 'example.test',
      observe: async (observedResource) => {
        await new Promise((resolve) =>
          setTimeout(resolve, observedResource.id === 'slow' ? 10 : 1),
        );
        if (observedResource.id === 'broken')
          throw new Error('temporary failure');
        return {
          resourceId: observedResource.id,
          provider: 'deterministic',
          accessPerspective: 'anonymous-reader',
          outcome: 'available',
          reason: 'expected content retrieved',
          observedAt: '2026-09-12T00:00:00.000Z',
          durationMs: 3,
          evidence: {},
        };
      },
    };

    const report = await runMonitor({
      resources: [
        { ...resource, id: 'slow' },
        { ...resource, id: 'unsupported', url: 'https://other.test/file.pdf' },
        { ...resource, id: 'broken' },
      ],
      config: { ...config, monitor: { ...config.monitor, concurrency: 3 } },
      providers: [provider],
    });

    expect(report.results.map(({ resourceId }) => resourceId)).toEqual([
      'slow',
      'unsupported',
      'broken',
    ]);
    expect(report.results.map(({ outcome }) => outcome)).toEqual([
      'available',
      'unsupported',
      'inconclusive',
    ]);
  });

  it('applies configurable exit failure categories', async () => {
    const provider: Provider = {
      name: 'deterministic',
      recognize: () => false,
      observe: async () => {
        throw new Error('should not observe');
      },
    };

    const report = await runMonitor({
      resources: [resource],
      config: {
        ...config,
        monitor: { ...config.monitor, failOn: ['unsupported'] },
      },
      providers: [provider],
    });

    expect(report.results[0]?.outcome).toBe('unsupported');
    expect(report.shouldFail).toBe(true);
  });
});
