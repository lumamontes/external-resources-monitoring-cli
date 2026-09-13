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

  it('documents a reproducible workflow without live external checks', async () => {
    const workflow = await readFile(
      '.github/workflows/resource-monitor.yml',
      'utf8',
    );

    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('cron:');
    expect(workflow).toContain('--config examples/monitor.yml');
    expect(workflow).toContain('--output resource-report.json');
    expect(workflow).toContain('--markdown-output resource-report.md');
    expect(workflow).toContain('actions/upload-artifact@v4');
    expect(workflow).toContain('if: always()');
    expect(workflow).not.toContain('GOOGLE_');

    const directory = await mkdtemp(join(tmpdir(), 'resource-workflow-'));
    try {
      await execFileAsync(process.execPath, [
        'dist/cli.js',
        '--input',
        'examples/resources.json',
        '--config',
        'examples/monitor.yml',
        '--output',
        join(directory, 'resource-report.json'),
        '--markdown-output',
        join(directory, 'resource-report.md'),
      ]);
      expect(
        await readFile(join(directory, 'resource-report.json'), 'utf8'),
      ).toContain('"version": 1');
      expect(
        await readFile(join(directory, 'resource-report.md'), 'utf8'),
      ).toContain('# External Resources Monitor');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
