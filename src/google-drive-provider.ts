import { validateContent } from './content-validation.js';
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
  if (driveFile.resourceKey) {
    downloadUrl.searchParams.set('resourcekey', driveFile.resourceKey);
  }

  try {
    const response = await requestWithTimeout(
      context.network,
      downloadUrl,
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
    const baseEvidence = {
      httpStatus: response.status,
      contentType,
      responseUrl: response.url || undefined,
      redirected: response.redirected,
    };
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
        baseEvidence,
      );
    }
    if (!response.ok) {
      return observation(
        resource,
        'inaccessible',
        `anonymous retrieval returned HTTP ${response.status}`,
        now,
        startedAt,
        baseEvidence,
      );
    }
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return observation(
        resource,
        'inconclusive',
        'response exceeds the configured body limit',
        now,
        startedAt,
        { ...baseEvidence, contentLength: declaredLength, maxBytes },
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
        { ...baseEvidence, maxBytes },
      );
    }

    const validation = validateContent(body, contentType, context.profile);
    return observation(
      resource,
      validation.valid ? 'available' : 'inaccessible',
      validation.valid ? 'anonymous PDF content retrieved' : validation.reason,
      now,
      startedAt,
      { ...baseEvidence, ...validation.evidence },
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

async function requestWithTimeout(
  network: ProviderContext['network'],
  url: URL,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([
      network(url, { redirect: 'follow', signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
