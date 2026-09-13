import type { ValidationProfile } from './types.js';

export interface ContentValidationResult {
  valid: boolean;
  reason: string;
  evidence: Record<string, unknown>;
}

export function validateContent(
  body: Uint8Array,
  contentType: string | undefined,
  profile: ValidationProfile,
): ContentValidationResult {
  const hasExpectedType =
    contentType === undefined ||
    profile.expectedContentTypes.includes(contentType);
  const hasPdfSignature = startsWithPdfSignature(body);
  const hasPdfEndMarker = endsWithPdfMarker(body);
  const evidence = {
    contentType,
    bytesRead: body.byteLength,
    hasPdfSignature,
    hasPdfEndMarker,
  };

  if (profile.validatePdfSignature && !hasPdfSignature) {
    return {
      valid: false,
      reason: 'retrieved content is not a valid PDF',
      evidence,
    };
  }
  if (!hasExpectedType) {
    return {
      valid: false,
      reason: 'retrieved content type does not match the validation profile',
      evidence,
    };
  }
  if (profile.validatePdfSignature && !hasPdfEndMarker) {
    return {
      valid: false,
      reason: 'retrieved PDF appears incomplete',
      evidence,
    };
  }

  return {
    valid: true,
    reason: 'retrieved content matches the validation profile',
    evidence,
  };
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

function endsWithPdfMarker(body: Uint8Array): boolean {
  const tail = new TextDecoder().decode(
    body.slice(Math.max(0, body.byteLength - 1024)),
  );
  return tail.trimEnd().endsWith('%%EOF');
}
