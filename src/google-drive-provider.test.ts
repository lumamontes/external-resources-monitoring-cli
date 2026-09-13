import { describe, expect, it } from 'vitest';

import { createGoogleDriveProvider } from './google-drive-provider.js';
import type { MonitorPolicy, Resource } from './types.js';

const profile = {
  expectedContentTypes: ['application/pdf'],
  validatePdfSignature: true,
  maxBytes: 1024,
};

const config: MonitorPolicy = {
  defaultProfile: 'publication',
  concurrency: 1,
  timeoutMs: 1000,
  retries: 0,
  maxBytes: 1024,
  failOn: ['inaccessible', 'invalid-input'],
};

describe('createGoogleDriveProvider', () => {
  it('recognizes Drive URLs for explicit classification', () => {
    const provider = createGoogleDriveProvider();

    expect(
      provider.recognize(
        new URL('https://drive.google.com/file/d/file-123/view'),
      ),
    ).toBe(true);
    expect(
      provider.recognize(new URL('https://drive.google.com/open?id=file-123')),
    ).toBe(true);
    expect(
      provider.recognize(new URL('https://drive.google.com/uc?id=file-123')),
    ).toBe(true);
    expect(
      provider.recognize(
        new URL('https://drive.google.com/drive/folders/folder-123'),
      ),
    ).toBe(true);
  });

  it('classifies Drive folder URLs as unsupported', async () => {
    const provider = createGoogleDriveProvider();
    const observation = await provider.observe(
      {
        id: 'folder-001',
        url: 'https://drive.google.com/drive/folders/folder-123',
      },
      {
        profile,
        config,
        providerConfig: {},
        network: async () => new Response(),
      },
    );

    expect(observation.outcome).toBe('unsupported');
  });

  it('retrieves a PDF anonymously and preserves a resource key', async () => {
    let requestedUrl: URL | undefined;
    const provider = createGoogleDriveProvider(
      () => new Date('2026-09-12T00:00:00.000Z'),
    );
    const resource: Resource = {
      id: 'zine-001',
      url: 'https://drive.google.com/file/d/file-123/view?resourcekey=key-456',
    };

    const observation = await provider.observe(resource, {
      profile,
      config,
      providerConfig: {},
      network: async (url) => {
        requestedUrl = url;
        return new Response('%PDF-1.7\nfixture\n%%EOF', {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        });
      },
    });

    expect(requestedUrl?.searchParams.get('id')).toBe('file-123');
    expect(requestedUrl?.searchParams.get('resourcekey')).toBe('key-456');
    expect(observation).toMatchObject({
      provider: 'google-drive',
      accessPerspective: 'anonymous-reader',
      outcome: 'available',
    });
  });

  it('does not treat a viewer or permission page as available', async () => {
    const provider = createGoogleDriveProvider();
    const resource: Resource = {
      id: 'zine-001',
      url: 'https://drive.google.com/file/d/file-123/view',
    };

    const observation = await provider.observe(resource, {
      profile,
      config,
      providerConfig: {},
      network: async () =>
        new Response('<html>Request access</html>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        }),
    });

    expect(observation.outcome).toBe('inaccessible');
    expect(observation.reason).toMatch(/PDF/);
  });

  it('does not treat a truncated PDF body as available', async () => {
    const provider = createGoogleDriveProvider();
    const observation = await provider.observe(
      { id: 'zine-001', url: 'https://drive.google.com/file/d/file-123/view' },
      {
        profile,
        config,
        providerConfig: {},
        network: async () =>
          new Response('%PDF-1.7\ntruncated', {
            status: 200,
            headers: { 'content-type': 'application/pdf' },
          }),
      },
    );

    expect(observation).toMatchObject({
      outcome: 'inaccessible',
      reason: 'retrieved PDF appears incomplete',
    });
  });

  it('rejects a mismatched content type even when the body has a PDF signature', async () => {
    const provider = createGoogleDriveProvider();
    const observation = await provider.observe(
      { id: 'zine-001', url: 'https://drive.google.com/file/d/file-123/view' },
      {
        profile,
        config,
        providerConfig: {},
        network: async () =>
          new Response('%PDF-1.7\nfixture\n%%EOF', {
            status: 200,
            headers: { 'content-type': 'application/octet-stream' },
          }),
      },
    );

    expect(observation).toMatchObject({
      outcome: 'inaccessible',
      reason: 'retrieved content type does not match the validation profile',
    });
  });

  it('classifies malformed Drive file paths as invalid input', async () => {
    const provider = createGoogleDriveProvider();
    const observation = await provider.observe(
      { id: 'zine-001', url: 'https://drive.google.com/file/d//view' },
      {
        profile,
        config,
        providerConfig: {},
        network: async () => new Response(),
      },
    );

    expect(observation.outcome).toBe('invalid-input');
  });

  it('records final redirect evidence', async () => {
    const provider = createGoogleDriveProvider();
    const response = new Response('%PDF-1.7\nfixture\n%%EOF', {
      status: 200,
      headers: { 'content-type': 'application/pdf' },
    });
    Object.defineProperty(response, 'url', {
      value: 'https://cdn.example.test/file.pdf',
    });
    Object.defineProperty(response, 'redirected', { value: true });

    const observation = await provider.observe(
      { id: 'zine-001', url: 'https://drive.google.com/file/d/file-123/view' },
      { profile, config, providerConfig: {}, network: async () => response },
    );

    expect(observation.evidence).toMatchObject({
      responseUrl: 'https://cdn.example.test/file.pdf',
      redirected: true,
    });
  });

  it('classifies a response over the limit as inconclusive', async () => {
    const provider = createGoogleDriveProvider();
    const observation = await provider.observe(
      { id: 'zine-001', url: 'https://drive.google.com/file/d/file-123/view' },
      {
        profile: { ...profile, maxBytes: 10 },
        config,
        providerConfig: {},
        network: async () =>
          new Response(null, {
            status: 200,
            headers: { 'content-length': '11' },
          }),
      },
    );

    expect(observation).toMatchObject({
      outcome: 'inconclusive',
      reason: 'response exceeds the configured body limit',
    });
  });

  it('classifies rate limits and timeouts as inconclusive', async () => {
    const provider = createGoogleDriveProvider();
    const resource: Resource = {
      id: 'zine-001',
      url: 'https://drive.google.com/file/d/file-123/view',
    };

    const rateLimited = await provider.observe(resource, {
      profile,
      config,
      providerConfig: {},
      network: async () => new Response(null, { status: 429 }),
    });
    const timedOut = await provider.observe(resource, {
      profile,
      config,
      providerConfig: {},
      network: async () => {
        throw new DOMException('The operation timed out', 'TimeoutError');
      },
    });

    expect(rateLimited.outcome).toBe('inconclusive');
    expect(timedOut.outcome).toBe('inconclusive');
  });

  it('classifies permission denial and network failures separately', async () => {
    const provider = createGoogleDriveProvider();
    const resource: Resource = {
      id: 'zine-001',
      url: 'https://drive.google.com/file/d/file-123/view',
    };

    const denied = await provider.observe(resource, {
      profile,
      config,
      providerConfig: {},
      network: async () =>
        new Response('<html>Request access</html>', { status: 403 }),
    });
    const failed = await provider.observe(resource, {
      profile,
      config,
      providerConfig: {},
      network: async () => {
        throw new Error('connection refused');
      },
    });

    expect(denied.outcome).toBe('inaccessible');
    expect(failed).toMatchObject({
      outcome: 'inconclusive',
      reason: 'anonymous retrieval failed: connection refused',
    });
  });
});
