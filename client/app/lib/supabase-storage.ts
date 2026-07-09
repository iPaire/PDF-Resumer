// lib/supabase-storage.ts - Server-only helpers for the private "uploads"
// bucket. Large PDFs are uploaded directly from the browser via signed URLs
// (Vercel functions cap request bodies at 4.5MB), then downloaded here
// server-to-server for processing and deleted immediately after.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'uploads';
// Rendered diagram pages (PNG) extracted from documents. Private; served to
// the owner through short-lived signed URLs generated per page view.
const DIAGRAMS_BUCKET = 'diagrams';

let client: SupabaseClient | null | undefined;
let bucketReady = false;
let diagramsBucketReady = false;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key
    ? createClient(url, key, { auth: { persistSession: false } })
    : null;
  return client;
}

export function storageConfigured(): boolean {
  return getClient() !== null;
}

async function ensureBucket(c: SupabaseClient): Promise<void> {
  if (bucketReady) return;
  const { error } = await c.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: '50MB',
    allowedMimeTypes: ['application/pdf'],
  });
  // "already exists" is the normal case after the first call ever.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Could not ensure uploads bucket: ${error.message}`);
  }
  bucketReady = true;
}

/** Signed URL the browser can PUT the file to directly (bypasses Vercel). */
export async function createSignedUpload(path: string): Promise<{ signedUrl: string; path: string }> {
  const c = getClient();
  if (!c) throw new Error('Supabase storage is not configured');
  await ensureBucket(c);

  const { data, error } = await c.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    throw new Error(`Could not create signed upload URL: ${error?.message}`);
  }
  return { signedUrl: data.signedUrl, path: data.path };
}

export async function downloadUpload(path: string): Promise<ArrayBuffer> {
  const c = getClient();
  if (!c) throw new Error('Supabase storage is not configured');

  const { data, error } = await c.storage.from(BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Could not download upload ${path}: ${error?.message}`);
  }
  return data.arrayBuffer();
}

/** Best-effort cleanup; uploads are transient and never served to users. */
export async function deleteUpload(path: string): Promise<void> {
  const c = getClient();
  if (!c) return;
  const { error } = await c.storage.from(BUCKET).remove([path]);
  if (error) {
    console.warn(`[storage] could not delete upload ${path}:`, error.message);
  }
}

// ---------------- Diagram images ----------------

async function ensureDiagramsBucket(c: SupabaseClient): Promise<void> {
  if (diagramsBucketReady) return;
  const { error } = await c.storage.createBucket(DIAGRAMS_BUCKET, {
    public: false,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ['image/png'],
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Could not ensure diagrams bucket: ${error.message}`);
  }
  diagramsBucketReady = true;
}

export async function uploadDiagram(path: string, png: Buffer): Promise<void> {
  const c = getClient();
  if (!c) throw new Error('Supabase storage is not configured');
  await ensureDiagramsBucket(c);

  const { error } = await c.storage.from(DIAGRAMS_BUCKET).upload(path, png, {
    contentType: 'image/png',
    upsert: true,
  });
  if (error) {
    throw new Error(`Could not upload diagram ${path}: ${error.message}`);
  }
}

/** Signed view URLs (24h) for a set of diagram paths, in the same order. */
export async function createDiagramViewUrls(paths: string[]): Promise<(string | null)[]> {
  const c = getClient();
  if (!c || paths.length === 0) return paths.map(() => null);

  const { data, error } = await c.storage
    .from(DIAGRAMS_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 24);
  if (error || !data) {
    console.warn('[storage] could not sign diagram urls:', error?.message);
    return paths.map(() => null);
  }
  return data.map((d) => d.signedUrl ?? null);
}
