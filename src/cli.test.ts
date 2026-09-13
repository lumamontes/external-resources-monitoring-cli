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
});
