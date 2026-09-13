import { describe, expect, it } from 'vitest';

import { parseResourceInput } from './input.js';

describe('parseResourceInput', () => {
  it('normalizes CSV records into resources', () => {
    const resources = parseResourceInput(
      'id,url,title,profile\n zine-001 , https://example.test/a.pdf , A publication , publication\n',
      'csv',
      { publication: {} },
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

  it('rejects duplicate resource IDs', () => {
    expect(() =>
      parseResourceInput(
        JSON.stringify([
          { id: 'zine-001', url: 'https://example.test/a.pdf' },
          { id: 'zine-001', url: 'https://example.test/b.pdf' },
        ]),
        'json',
      ),
    ).toThrow(/duplicate resource ID/);
  });

  it('rejects references to unknown validation profiles', () => {
    expect(() =>
      parseResourceInput(
        JSON.stringify([
          {
            id: 'zine-001',
            url: 'https://example.test/a.pdf',
            profile: 'image',
          },
        ]),
        'json',
        { publication: {} },
      ),
    ).toThrow(/validation profile not found/);
  });
});
