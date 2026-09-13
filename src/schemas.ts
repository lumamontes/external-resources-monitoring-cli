export const resourceCollectionSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['id', 'url'],
    properties: {
      id: { type: 'string', minLength: 1 },
      url: { type: 'string', minLength: 1 },
      title: { type: 'string', minLength: 1 },
      profile: { type: 'string', minLength: 1 },
    },
  },
} as const;

export const configSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://external-resources-monitoring-cli.dev/schemas/config-v1.json',
  type: 'object',
  additionalProperties: false,
  required: ['version'],
  properties: {
    version: { const: 1 },
    monitor: {
      type: 'object',
      additionalProperties: false,
      properties: {
        defaultProfile: { type: 'string', minLength: 1 },
        concurrency: { type: 'integer', minimum: 1 },
        timeoutMs: { type: 'integer', minimum: 1 },
        retries: { type: 'integer', minimum: 0 },
        maxBytes: { type: 'integer', minimum: 1 },
        failOn: {
          type: 'array',
          uniqueItems: true,
          items: {
            enum: [
              'available',
              'inaccessible',
              'inconclusive',
              'unsupported',
              'invalid-input',
            ],
          },
        },
      },
    },
    profiles: {
      type: 'object',
      minProperties: 1,
      additionalProperties: {
        type: 'object',
        additionalProperties: false,
        required: ['expectedContentTypes', 'validatePdfSignature', 'maxBytes'],
        properties: {
          expectedContentTypes: {
            type: 'array',
            minItems: 1,
            items: { type: 'string', minLength: 1 },
          },
          validatePdfSignature: { type: 'boolean' },
          maxBytes: { type: 'integer', minimum: 1 },
        },
      },
    },
    providers: {
      type: 'object',
      additionalProperties: { type: 'object' },
    },
  },
} as const;
