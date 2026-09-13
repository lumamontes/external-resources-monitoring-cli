import { describe, expect, it } from 'vitest';

import { parseConfig } from './config.js';

describe('parseConfig', () => {
  it('parses YAML and applies explicit monitor configuration', () => {
    const config = parseConfig(`
version: 1
monitor:
  concurrency: 4
  timeoutMs: 2000
  retries: 1
  maxBytes: 2048
  failOn: [inaccessible]
profiles:
  publication:
    expectedContentTypes: [application/pdf]
    validatePdfSignature: true
    maxBytes: 2048
providers: {}
`);

    expect(config.monitor.concurrency).toBe(4);
    expect(config.profiles.publication?.expectedContentTypes).toEqual([
      'application/pdf',
    ]);
  });

  it('rejects unknown configuration fields', () => {
    expect(() => parseConfig('version: 1\nunknown: true')).toThrow(/unknown/);
  });
});
