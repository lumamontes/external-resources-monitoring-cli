import { Ajv, type ErrorObject } from 'ajv';
import { parse as parseYaml } from 'yaml';

import { configSchema } from './schemas.js';
import type { MonitorConfig, Outcome } from './types.js';

const validator = new Ajv({ allErrors: true, strict: true });
const validateConfig = validator.compile(configSchema);

const defaultConfig: MonitorConfig = {
  version: 1,
  monitor: {
    concurrency: 4,
    timeoutMs: 15000,
    retries: 1,
    maxBytes: 50 * 1024 * 1024,
    failOn: ['inaccessible', 'invalid-input'],
  },
  profiles: {
    publication: {
      expectedContentTypes: ['application/pdf'],
      validatePdfSignature: true,
      maxBytes: 50 * 1024 * 1024,
    },
  },
  providers: {},
};

export function parseConfig(text?: string): MonitorConfig {
  if (text === undefined) return defaultConfig;

  let value: unknown;
  try {
    value = parseYaml(text);
  } catch (error) {
    throw new Error(
      `could not parse YAML configuration: ${errorMessage(error)}`,
    );
  }

  if (!validateConfig(value))
    throw new Error(formatErrors(validateConfig.errors));

  const input = value as Partial<MonitorConfig>;
  return {
    version: 1,
    monitor: { ...defaultConfig.monitor, ...input.monitor },
    profiles: input.profiles ?? defaultConfig.profiles,
    providers: input.providers ?? defaultConfig.providers,
  };
}

function formatErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? [])
    .map((error) => {
      const property =
        typeof error.params?.additionalProperty === 'string'
          ? ` (${error.params.additionalProperty})`
          : '';
      return `${error.instancePath || '/'} ${error.message ?? 'is invalid'}${property}`;
    })
    .join('; ');
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type ConfiguredOutcome = Outcome;
