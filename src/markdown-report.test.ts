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
      evidence: {},
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
  ],
};

describe('renderMarkdownReport', () => {
  it('summarizes outcomes and states interpretation boundaries', () => {
    const markdown = renderMarkdownReport(report);

    expect(markdown).toContain('| inaccessible | 1 |');
    expect(markdown).toContain('| inconclusive | 1 |');
    expect(markdown).toContain('Missing PDF');
    expect(markdown).toContain('anonymous retrieval returned HTTP 403');
    expect(markdown).toContain('does not mean a resource was deleted');
    expect(markdown).toContain('does not mean the resource is broken');
  });
});
