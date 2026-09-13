import { parse } from 'csv-parse/sync';
import { Ajv } from 'ajv';

import { resourceCollectionSchema } from './schemas.js';
import type { Resource } from './types.js';
import { errorMessage, formatValidationErrors } from './validation-errors.js';

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
  profiles?: Record<string, unknown>,
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
    throw new InputValidationError(
      formatValidationErrors(validateResources.errors),
    );
  }

  const resources = normalized as Resource[];
  const seenIds = new Set<string>();
  for (const [index, resource] of resources.entries()) {
    if (seenIds.has(resource.id)) {
      throw new InputValidationError(
        `/${index}/id duplicate resource ID: ${resource.id}`,
      );
    }
    seenIds.add(resource.id);
    if (resource.profile && profiles && !(resource.profile in profiles)) {
      throw new InputValidationError(
        `/${index}/profile validation profile not found: ${resource.profile}`,
      );
    }
  }

  return resources;
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
