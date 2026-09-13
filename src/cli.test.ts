import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('resource-monitor CLI', () => {
  it('runs the public command against the example collection', async () => {
    const result = await execFileAsync(process.execPath, [
      'dist/cli.js',
      '--input',
      'examples/resources.json',
    ]);
    const report = JSON.parse(result.stdout) as {
      results: Array<{ outcome: string }>;
    };

    expect(report.results[0]?.outcome).toBe('available');
  });

  it('writes optional Markdown alongside JSON output', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'resource-monitor-'));
    const jsonPath = join(directory, 'report.json');
    const markdownPath = join(directory, 'report.md');
    try {
      await execFileAsync(process.execPath, [
        'dist/cli.js',
        '--input',
        'examples/resources.json',
        '--output',
        jsonPath,
        '--markdown-output',
        markdownPath,
      ]);
      const report = JSON.parse(await readFile(jsonPath, 'utf8')) as {
        shouldFail: boolean;
      };
      const markdown = await readFile(markdownPath, 'utf8');
      expect(report.shouldFail).toBe(false);
      expect(markdown).toContain('| available | 1 |');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
