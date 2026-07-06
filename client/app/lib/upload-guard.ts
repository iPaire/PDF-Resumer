// lib/upload-guard.ts - Shared validation for uploaded files.
//
// Two protections the convert/translate routes were missing:
//  1. Size cap: both routes read the whole upload into memory before doing any
//     work, with no limit - a large upload is a memory/cost DoS. /api/summarize
//     already caps at 10MB; this brings the others in line.
//  2. Magic-byte check: file.type is a client-supplied MIME string and is
//     trivially spoofable. We verify the actual leading bytes instead, so a
//     renamed executable can't reach the PDF/image parser.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB per file
export const MAX_TOTAL_UPLOAD_BYTES = 25 * 1024 * 1024; // 25MB per request

export type SniffedType = 'pdf' | 'jpeg' | 'png' | 'unknown';

/** Identify a file by its magic bytes, ignoring the declared MIME type. */
export function sniffType(bytes: Uint8Array): SniffedType {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'pdf'; // "%PDF"
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'png';
  }
  return 'unknown';
}

export interface SizeCheck {
  ok: boolean;
  error?: string;
}

/** Reject early using the Content-Length header before buffering the body. */
export function checkContentLength(request: Request, max = MAX_TOTAL_UPLOAD_BYTES): SizeCheck {
  const header = request.headers.get('content-length');
  if (header && parseInt(header, 10) > max) {
    return { ok: false, error: `Upload exceeds the ${Math.floor(max / 1024 / 1024)}MB limit.` };
  }
  return { ok: true };
}

/** Enforce the per-file size cap after the bytes are in hand. */
export function checkFileSize(size: number, max = MAX_UPLOAD_BYTES): SizeCheck {
  if (size > max) {
    return { ok: false, error: `File exceeds the ${Math.floor(max / 1024 / 1024)}MB per-file limit.` };
  }
  return { ok: true };
}
