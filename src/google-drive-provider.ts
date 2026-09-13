import type {
  Observation,
  Provider,
  ProviderContext,
  Resource,
} from './types.js';

const driveHost = 'drive.google.com';

export function createGoogleDriveProvider(
  now: () => Date = () => new Date(),
): Provider {
  return {
    name: 'google-drive',
    recognize: (url) => extractDriveFile(url) !== undefined,
    observe: async (resource, context) =>
      observeDriveResource(resource, context, now),
  };
}

function extractDriveFile(
  url: URL,
): { id: string; resourceKey?: string } | undefined {
  if (url.hostname.toLowerCase() !== driveHost) return undefined;

  const fileMatch = url.pathname.match(/^\/file\/d\/([^/]+)/);
  const id =
    fileMatch?.[1] ??
    (url.pathname === '/open' ? url.searchParams.get('id') : null);
  if (!id) return undefined;

  const resourceKey =
    url.searchParams.get('resourcekey') ??
    url.searchParams.get('resourceKey') ??
    undefined;
  return resourceKey === undefined ? { id } : { id, resourceKey };
}

async function observeDriveResource(
  resource: Resource,
  context: ProviderContext,
  now: () => Date,
): Promise<Observation> {
  const startedAt = Date.now();
  const parsedUrl = new URL(resource.url);
  const driveFile = extractDriveFile(parsedUrl);
  if (!driveFile) {
    return observation(
      resource,
      'invalid-input',
      'resource is not a supported Google Drive file URL',
      now,
      startedAt,
    );
  }

  const downloadUrl = new URL('https://drive.google.com/uc');
  downloadUrl.searchParams.set('export', 'download');
  downloadUrl.searchParams.set('id', driveFile.id);
  if (driveFile.resourceKey)
    downloadUrl.searchParams.set('resourcekey', driveFile.resourceKey);

  try {
    const response = await withTimeout(
      context.network(downloadUrl, { redirect: 'follow' }),
      context.config.timeoutMs,
    );
    const contentType = response.headers
      .get('content-type')
      ?.split(';', 1)[0]
      ?.trim()
      .toLowerCase();
    const maxBytes = Math.min(
      context.config.maxBytes,
      context.profile.maxBytes,
    );
    const declaredLength = Number(response.headers.get('content-length'));

    if (
      response.status === 408 ||
      response.status === 429 ||
      response.status >= 500
    ) {
      return observation(
        resource,
        'inconclusive',
        `provider returned HTTP ${response.status}`,
        now,
        startedAt,
        {
          httpStatus: response.status,
          contentType,
        },
      );
    }
    if (!response.ok) {
      return observation(
        resource,
        'inaccessible',
        `anonymous retrieval returned HTTP ${response.status}`,
        now,
        startedAt,
        {
          httpStatus: response.status,
          contentType,
        },
      );
    }
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return observation(
        resource,
        'inconclusive',
        'response exceeds the configured body limit',
        now,
        startedAt,
        {
          contentLength: declaredLength,
          maxBytes,
        },
      );
    }

    const body = await readBoundedBody(response, maxBytes);
    if (body === undefined) {
      return observation(
        resource,
        'inconclusive',
        'response exceeds the configured body limit',
        now,
        startedAt,
        { maxBytes },
      );
    }

    const isExpectedType =
      contentType === undefined ||
      context.profile.expectedContentTypes.includes(contentType) ||
      contentType === 'application/octet-stream';
    const hasPdfSignature = startsWithPdfSignature(body);
    if (
      !isExpectedType ||
      (context.profile.validatePdfSignature && !hasPdfSignature)
    ) {
      return observation(
        resource,
        'inaccessible',
        'retrieved content is not a valid PDF',
        now,
        startedAt,
        {
          httpStatus: response.status,
          contentType,
          hasPdfSignature,
          bytesRead: body.byteLength,
        },
      );
    }

    return observation(
      resource,
      'available',
      'anonymous PDF content retrieved',
      now,
      startedAt,
      {
        httpStatus: response.status,
        contentType,
        hasPdfSignature,
        bytesRead: body.byteLength,
      },
    );
  } catch (error) {
    return observation(
      resource,
      'inconclusive',
      `anonymous retrieval failed: ${errorMessage(error)}`,
      now,
      startedAt,
    );
  }
}

async function readBoundedBody(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array | undefined> {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function startsWithPdfSignature(body: Uint8Array): boolean {
  return (
    body.byteLength >= 5 &&
    body[0] === 0x25 &&
    body[1] === 0x50 &&
    body[2] === 0x44 &&
    body[3] === 0x46 &&
    body[4] === 0x2d
  );
}

function observation(
  resource: Resource,
  outcome: Observation['outcome'],
  reason: string,
  now: () => Date,
  startedAt: number,
  evidence: Record<string, unknown> = {},
): Observation {
  return {
    resourceId: resource.id,
    provider: 'google-drive',
    accessPerspective: 'anonymous-reader',
    outcome,
    reason,
    observedAt: now().toISOString(),
    durationMs: Date.now() - startedAt,
    evidence,
  };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(`request timed out after ${timeoutMs}ms`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
