import { describe, expect, it } from 'vitest';

import { renderMarkdownReport } from './markdown-report.js';
import type { RunReport } from './types.js';

const report: RunReport = {
  version: 1,
  observedAt: '2026-09-12T00:00:00.000Z',
  shouldFail: true,
  results: [
    {
      resourceId: 'missing-1',
      title: 'Missing PDF',
      provider: 'google-drive',
      accessPerspective: 'anonymous-reader',
      outcome: 'inaccessible',
      reason: 'anonymous retrieval returned HTTP 403',
      observedAt: '2026-09-12T00:00:00.000Z',
      durationMs: 12,
      evidence: { url: 'not a url' },
    },
    {
      resourceId: 'unknown-1',
      provider: 'none',
      accessPerspective: 'anonymous-reader',
      outcome: 'inconclusive',
      reason: 'checker timed out',
      observedAt: '2026-09-12T00:00:00.000Z',
      durationMs: 20,
      evidence: {},
    },
    {
      resourceId: 'available-1',
      provider: 'google-drive',
      accessPerspective: 'anonymous-reader',
      outcome: 'available',
      reason: 'anonymous PDF content retrieved',
      observedAt: '2026-09-12T00:00:00.000Z',
      durationMs: 8,
      evidence: {},
    },
    {
      resourceId: 'unsupported-1',
      provider: 'none',
      accessPerspective: 'anonymous-reader',
      outcome: 'unsupported',
      reason: 'no provider recognizes this resource URL',
      observedAt: '2026-09-12T00:00:00.000Z',
      durationMs: 0,
      evidence: {},
    },
    {
      resourceId: 'invalid-1',
      provider: 'none',
      accessPerspective: 'anonymous-reader',
      outcome: 'invalid-input',
      reason: 'resource URL is malformed',
      observedAt: '2026-09-12T00:00:00.000Z',
      durationMs: 0,
      evidence: {},
    },
  ],
};

describe('renderMarkdownReport', () => {
  it('summarizes outcomes and states interpretation boundaries', () => {
    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain('| inaccessible | 1 |');
    expect(markdown).toContain('| inconclusive | 1 |');
    expect(markdown).toContain('| available | 1 |');
    expect(markdown).toContain('| unsupported | 1 |');
    expect(markdown).toContain('| invalid-input | 1 |');
    expect(markdown).toContain('Missing PDF');
    expect(markdown).not.toContain('available-1');
    expect(markdown).toContain('anonymous retrieval returned HTTP 403');
    expect(markdown).toContain('URL: `not a url`');
    expect(markdown).toContain('does not mean a resource was deleted');
    expect(markdown).toContain('does not mean the resource is broken');
    for (const resourceId of [
      'missing-1',
      'unknown-1',
      'unsupported-1',
      'invalid-1',
    ]) {
      expect(markdown.match(new RegExp(resourceId, 'g'))).toHaveLength(1);
    }
  });
});
