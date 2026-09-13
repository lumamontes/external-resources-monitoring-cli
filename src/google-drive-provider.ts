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
    recognize: (url) => url.hostname.toLowerCase() === driveHost,
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
    (url.pathname === '/open' || url.pathname === '/uc'
      ? url.searchParams.get('id')
      : null);
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
    const malformedFileUrl =
      parsedUrl.pathname === '/open' ||
      parsedUrl.pathname === '/uc' ||
      parsedUrl.pathname === '/file/d' ||
      parsedUrl.pathname.startsWith('/file/d/');
    return observation(
      resource,
      malformedFileUrl ? 'invalid-input' : 'unsupported',
      malformedFileUrl
        ? 'resource is a malformed Google Drive file URL'
        : 'resource is not a supported Google Drive file URL',
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
    const response = await requestWithRetries(
      context.network,
      downloadUrl,
      context.config.timeoutMs,
      context.config.retries,
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
      responseUrl: sanitizeResponseUrl(response.url),
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

    const remainingTimeout =
      context.config.timeoutMs - (Date.now() - startedAt);
    if (remainingTimeout <= 0) {
      return observation(
        resource,
        'inconclusive',
        'response body timed out',
        now,
        startedAt,
        baseEvidence,
      );
    }
    const body = await readBoundedBody(response, maxBytes, remainingTimeout);
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
  timeoutMs: number,
): Promise<Uint8Array | undefined> {
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      void reader.cancel();
      reject(new Error(`response body timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  try {
    while (true) {
      const { done, value } = await Promise.race([
        reader.read(),
        timeoutPromise,
      ]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } finally {
    if (timeout) clearTimeout(timeout);
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

async function requestWithRetries(
  network: ProviderContext['network'],
  url: URL,
  timeoutMs: number,
  retries: number,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await requestWithTimeout(network, url, timeoutMs);
      if (!isTransientStatus(response.status) || attempt === retries)
        return response;
    } catch (error) {
      if (attempt === retries) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
  }
  throw new Error('retry policy exhausted');
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function sanitizeResponseUrl(value: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return undefined;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
