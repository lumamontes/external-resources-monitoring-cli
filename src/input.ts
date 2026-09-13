import { parse } from 'csv-parse/sync';
import { Ajv, type ErrorObject } from 'ajv';

import { resourceCollectionSchema } from './schemas.js';
import type { Resource } from './types.js';

type InputFormat = 'csv' | 'json';

const validator = new Ajv({
  allErrors: true,
  strict: true,
  formats: { uri: true },
});
const validateResources = validator.compile<Resource[]>(
  resourceCollectionSchema,
);

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InputValidationError';
  }
}

export function parseResourceInput(
  text: string,
  format: InputFormat,
): Resource[] {
  let value: unknown;
  try {
    value =
      format === 'csv'
        ? parse(text, {
            bom: true,
            columns: true,
            skip_empty_lines: true,
            trim: true,
          })
        : JSON.parse(text);
  } catch (error) {
    throw new InputValidationError(
      `could not parse ${format} input: ${errorMessage(error)}`,
    );
  }

  const normalized = normalizeRecords(value);
  if (!validateResources(normalized)) {
    throw new InputValidationError(formatErrors(validateResources.errors));
  }

  return normalized as Resource[];
}

function normalizeRecords(value: unknown): unknown {
  if (!Array.isArray(value)) return value;

  return value.map((record) => {
    if (!isRecord(record)) return record;
    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [
        key,
        typeof entry === 'string' ? entry.trim() : entry,
      ]),
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
