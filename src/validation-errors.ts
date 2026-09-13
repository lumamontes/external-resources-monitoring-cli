import type { ErrorObject } from 'ajv';

export function formatValidationErrors(
  errors: ErrorObject[] | null | undefined,
): string {
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

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
