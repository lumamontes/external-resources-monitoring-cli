import { describe, expect, it } from 'vitest';

import { parseResourceInput } from './input.js';

describe('parseResourceInput', () => {
  it('normalizes CSV records into resources', () => {
    const resources = parseResourceInput(
      'id,url,title,profile\n zine-001 , https://example.test/a.pdf , A publication , publication\n',
      'csv',
    );

    expect(resources).toEqual([
      {
        id: 'zine-001',
        url: 'https://example.test/a.pdf',
        title: 'A publication',
        profile: 'publication',
      },
    ]);
  });

  it('rejects JSON records without a stable ID', () => {
    expect(() =>
      parseResourceInput(
        JSON.stringify([{ url: 'https://example.test/a.pdf' }]),
        'json',
      ),
    ).toThrow(/id/);
  });
});
