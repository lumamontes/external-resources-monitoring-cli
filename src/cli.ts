#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

import { parseConfig } from './config.js';
import { createDeterministicProvider } from './deterministic-provider.js';
import { parseResourceInput } from './input.js';
import { runMonitor } from './run-monitor.js';

const args = parseArguments(process.argv.slice(2));

try {
  if (!args.input) throw new Error('missing required --input argument');

  const inputText = await readFile(args.input, 'utf8');
  const format = args.format ?? inferFormat(args.input);
  const resources = parseResourceInput(inputText, format);
  const config = args.config
    ? parseConfig(await readFile(args.config, 'utf8'))
    : parseConfig();
  const provider = createDeterministicProvider({
    'https://example.test/publication.pdf': {
      outcome: 'available',
      reason: 'fixture content retrieved',
      evidence: { contentType: 'application/pdf' },
    },
  });
  const report = await runMonitor({ resources, config, providers: [provider] });
  const output = `${JSON.stringify(report, null, 2)}\n`;

  if (args.output) await writeFile(args.output, output, 'utf8');
  else process.stdout.write(output);

  process.exitCode = report.shouldFail ? 1 : 0;
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 2;
}

function parseArguments(values: string[]): {
  input?: string;
  format?: 'csv' | 'json';
  config?: string;
  output?: string;
} {
  const args: ReturnType<typeof parseArguments> = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    const next = values[index + 1];
    if (value === '--input' && next) args.input = next;
    else if (value === '--format' && (next === 'csv' || next === 'json'))
      args.format = next;
    else if (value === '--config' && next) args.config = next;
    else if (value === '--output' && next) args.output = next;
    else if (value?.startsWith('--'))
      throw new Error(`unknown or incomplete argument: ${value}`);
    else continue;
    index += 1;
  }
  return args;
}

function inferFormat(inputPath: string): 'csv' | 'json' {
  const extension = basename(inputPath).split('.').pop();
  if (extension === 'csv') return 'csv';
  if (extension === 'json') return 'json';
  throw new Error(
    'cannot infer input format; use --format csv or --format json',
  );
}
