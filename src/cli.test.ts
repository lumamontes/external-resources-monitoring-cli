import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { parse as parseYaml } from 'yaml';

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
    const parsed = parseYaml(workflow) as {
      on: { schedule: unknown; workflow_dispatch: unknown };
      jobs: {
        monitor: {
          steps: Array<{ uses?: string; if?: string }>;
        };
      };
    };
    expect(parsed.on.schedule).toBeDefined();
    expect(parsed.on.workflow_dispatch).toBeNull();
    expect(
      parsed.jobs.monitor.steps.some(
        (step) =>
          step.uses === 'actions/upload-artifact@v4' && step.if === 'always()',
      ),
    ).toBe(true);

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

  it('uses exit code 1 for configured attention outcomes and 2 for CLI errors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'resource-exit-'));
    const inputPath = join(directory, 'resources.json');
    const configPath = join(directory, 'config.yml');
    try {
      await writeFile(
        inputPath,
        JSON.stringify([
          { id: 'folder', url: 'https://drive.google.com/drive/folders/x' },
        ]),
      );
      await writeFile(
        configPath,
        'version: 1\nmonitor:\n  failOn: [unsupported]\n',
      );
      await expect(
        execFileAsync(process.execPath, [
          'dist/cli.js',
          '--input',
          inputPath,
          '--config',
          configPath,
        ]),
      ).rejects.toMatchObject({ code: 1 });
      await expect(
        execFileAsync(process.execPath, ['dist/cli.js']),
      ).rejects.toMatchObject({
        code: 2,
      });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
