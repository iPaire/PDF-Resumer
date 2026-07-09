// app/api/convert/docx/route.ts
//
// Word (.docx) -> PDF. This is deliberately a separate route from /api/convert:
// it carries a headless-Chromium dependency (~50MB) that would bloat every
// image/PDF conversion's cold start if it lived in the shared route. Only docx
// requests pay that cost.
//
// Pipeline: docx -> HTML (mammoth) -> render in headless Chromium -> PDF.
// On Vercel we use @sparticuz/chromium; locally we point puppeteer-core at a
// system Chrome (CHROME_EXECUTABLE_PATH override, or a per-platform default).
import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import { checkContentLength, checkFileSize, MAX_UPLOAD_BYTES } from '@/lib/upload-guard';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_MB = Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024);

export async function POST(request: NextRequest) {
  try {
    // Per-IP rate limit - unauthenticated and CPU/memory heavy.
    const rateLimit = await checkRateLimit('convert', getClientIp(request));
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    const lengthCheck = checkContentLength(request);
    if (!lengthCheck.ok) {
      return NextResponse.json({ error: lengthCheck.error }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!checkFileSize(buffer.length).ok) {
      return NextResponse.json(
        { error: `File exceeds the ${MAX_MB}MB per-file limit.` },
        { status: 413 }
      );
    }

    // Validate: .docx extension + ZIP signature (a docx is a zip container).
    if (!isDocx(buffer, file.name)) {
      return NextResponse.json(
        { error: 'Only .docx files are supported here.' },
        { status: 415 }
      );
    }

    // docx -> HTML. mammoth emits a safe subset (no <script>) with images
    // inlined as data URIs.
    let bodyHtml: string;
    try {
      const result = await mammoth.convertToHtml({ buffer });
      bodyHtml = result.value;
    } catch (error) {
      console.error('mammoth conversion failed:', error);
      return NextResponse.json(
        { error: 'Could not read the Word document. It may be corrupt or password-protected.' },
        { status: 422 }
      );
    }

    const pdfBytes = await renderHtmlToPdf(wrapHtml(bodyHtml));

    const outputFilename = `${file.name.replace(/\.[^/.]+$/, '')}.pdf`;
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`,
      },
    });
  } catch (error) {
    console.error('docx conversion error:', error);
    return NextResponse.json(
      { error: 'Conversion failed. Please try again.' },
      { status: 500 }
    );
  }
}

/** A docx must have the .docx extension and the ZIP magic bytes (PK\x03\x04). */
function isDocx(bytes: Uint8Array, name: string): boolean {
  if (!/\.docx$/i.test(name.trim())) return false;
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04
  );
}

/**
 * Wrap mammoth's body HTML in a printable A4 document. Typography mirrors
 * Word's defaults (Calibri 11pt, 1.15 line spacing, 8pt after paragraphs) so
 * a one-page Word document stays one page - the old 1.5 line-height made
 * text ~30% taller than in Word and pushed content onto a second page.
 */
function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; padding: 0; }
  body { font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.15; color: #111; }
  h1, h2, h3, h4 { line-height: 1.2; margin: 10pt 0 4pt; }
  p { margin: 0 0 8pt; }
  ul, ol { margin: 0 0 8pt; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; }
  td, th { border: 1px solid #ccc; padding: 3pt 6pt; text-align: left; }
</style>
</head>
<body>${body}</body>
</html>`;
}

/**
 * Render HTML to a PDF buffer with headless Chromium. JavaScript is disabled and
 * all non-data network requests are blocked, so a crafted document cannot use
 * the browser to reach internal hosts (SSRF) - only inlined content renders.
 */
async function renderHtmlToPdf(html: string): Promise<Uint8Array> {
  const isServerless = !!process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.VERCEL === '1';
  const puppeteer = await import('puppeteer-core');

  let browser;
  try {
    if (isServerless) {
      const chromium = (await import('@sparticuz/chromium')).default;
      // PDF rendering needs no WebGL; skip extracting the swiftshader stack.
      chromium.setGraphicsMode = false;
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: localChromePath(),
      });
    }

    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.startsWith('data:') || url === 'about:blank') {
        req.continue();
      } else {
        req.abort();
      }
    });

    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
    });
    return pdf;
  } finally {
    if (browser) await browser.close();
  }
}

/** Best-effort local Chrome path for dev; overridable via CHROME_EXECUTABLE_PATH. */
function localChromePath(): string {
  if (process.env.CHROME_EXECUTABLE_PATH) return process.env.CHROME_EXECUTABLE_PATH;
  switch (process.platform) {
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    default:
      return '/usr/bin/google-chrome';
  }
}
