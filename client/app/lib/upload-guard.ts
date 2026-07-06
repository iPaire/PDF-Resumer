// lib/upload-guard.ts - Shared validation for uploaded files.
//
// Two protections the convert/translate routes were missing:
//  1. Size cap: both routes read the whole upload into memory before doing any
//     work, with no limit - a large upload is a memory/cost DoS. /api/summarize
//     already caps at 10MB; this brings the others in line.
//  2. Magic-byte check: file.type is a client-supplied MIME string and is
//     trivially spoofable. We verify the actual leading bytes instead, so a
//     renamed executable can't reach the PDF/image parser.

// Vercel serverless functions reject request bodies larger than ~4.5MB at the
// edge, before the function runs. Keep both caps under that (with headroom for
// multipart overhead) so the guard reflects what the platform will actually
// accept - a higher limit only produces a confusing platform-level 413 that
// never reaches this code.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB per file
export const MAX_TOTAL_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB per request

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

/**
 * Best-effort plain-text check. Text files have no magic number, so we gate on
 * the `.txt` extension AND verify the content carries no NUL or unexpected
 * control bytes - binaries almost always do, plain text does not. This keeps
 * the "a renamed binary can't reach the parser" guarantee that magic-byte
 * sniffing gives the image/PDF paths, while re-enabling genuine text uploads.
 */
export function looksLikeText(bytes: Uint8Array, filename: string): boolean {
  if (!/\.txt$/i.test(filename.trim())) return false;
  if (bytes.length === 0) return false;

  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  for (const b of sample) {
    // Reject NUL and C0 control chars except tab, LF, FF, CR. Everything
    // >= 0x20 (including UTF-8 continuation bytes 0x80-0xFF) is allowed.
    if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0c && b !== 0x0d) {
      return false;
    }
  }
  return true;
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
