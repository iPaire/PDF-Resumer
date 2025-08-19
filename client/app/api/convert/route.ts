// app/api/convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import mammoth from 'mammoth';
import * as libre from 'libreoffice-convert';
import { chromium } from 'playwright-chromium';
import sharp from 'sharp';

// Extend libreoffice-convert to work with promises
libre.convertAsync = (buffer: Buffer, ext: string, options: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    libre.convert(buffer, ext, options, (err, result) => {
      if (err) reject(err);
      else resolve(result as Buffer);
    });
  });
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file type
    const fileType = file.type;
    const fileName = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    let pdfBuffer: Buffer;

    // Process based on file type
    switch (fileType) {
      case 'application/pdf':
        // If it's already PDF, return directly
        pdfBuffer = fileBuffer;
        break;

      case 'image/jpeg':
      case 'image/png':
      case 'image/gif':
      case 'image/bmp':
      case 'image/tiff':
      case 'image/webp':
        // Convert image to PDF using sharp
        pdfBuffer = await convertImageToPdf(fileBuffer);
        break;

      case 'text/plain':
        // Convert plain text to PDF
        pdfBuffer = await convertTextToPdf(fileBuffer.toString());
        break;

      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // Convert Word document to PDF
        pdfBuffer = await convertWordToPdf(fileBuffer, fileType);
        break;

      case 'text/html':
        // Convert HTML to PDF
        pdfBuffer = await convertHtmlToPdf(fileBuffer.toString());
        break;

      default:
        // For other formats, use LibreOffice
        pdfBuffer = await convertWithLibreOffice(fileBuffer, fileType);
    }

    // Return the generated PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName.replace(/\.[^/.]+$/, '')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Conversion error:', error);
    return NextResponse.json(
      { error: 'Conversion failed. Please try another file.' },
      { status: 500 }
    );
  }
}

// Helper functions for conversion

async function convertImageToPdf(imageBuffer: Buffer): Promise<Buffer> {
  try {
    // Use sharp to process the image
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Create PDF
    const pdfDoc = await PDFDocument.create();
    
    // Convert image to JPEG to embed in PDF
    const jpegBuffer = await image.jpeg().toBuffer();
    const jpegImage = await pdfDoc.embedJpg(jpegBuffer);
    
    // Add a page with image dimensions
    const page = pdfDoc.addPage([
      metadata.width || 595.28,
      metadata.height || 841.89
    ]);
    
    page.drawImage(jpegImage, {
      x: 0,
      y: 0,
      width: metadata.width || 595.28,
      height: metadata.height || 841.89,
    });
    
    return Buffer.from(await pdfDoc.save());
  } catch (error) {
    console.error('Image conversion error:', error);
    throw new Error('Failed to convert image to PDF');
  }
}

async function convertTextToPdf(text: string): Promise<Buffer> {
  try {
    // Use HTML conversion for text to handle special characters
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.5;
              white-space: pre-wrap;
              padding: 20px;
            }
          </style>
        </head>
        <body>${text}</body>
      </html>
    `;
    
    return await convertHtmlToPdf(htmlContent);
  } catch (error) {
    console.error('Text conversion error:', error);
    throw new Error('Failed to convert text to PDF');
  }
}

async function convertWordToPdf(buffer: Buffer, fileType: string): Promise<Buffer> {
  try {
    // Use mammoth for DOCX
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.convertToHtml({ buffer });
      return convertHtmlToPdf(result.value);
    }
    
    // For DOC use LibreOffice
    return convertWithLibreOffice(buffer, fileType);
  } catch (error) {
    console.error('Word conversion error:', error);
    throw new Error('Failed to convert Word document to PDF');
  }
}

async function convertHtmlToPdf(html: string): Promise<Buffer> {
  let browser: any = null;
  try {
    // Use Playwright to convert HTML to PDF
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
    });
    
    return pdfBuffer;
  } catch (error) {
    console.error('HTML conversion error:', error);
    throw new Error('Failed to convert HTML to PDF');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function convertWithLibreOffice(buffer: Buffer, inputFormat: string): Promise<Buffer> {
  try {
    // Convert using LibreOffice
    const extend = '.pdf';
    const pdfBuffer = await libre.convertAsync(buffer, extend, undefined);
    
    return pdfBuffer;
  } catch (error) {
    console.error('LibreOffice conversion error:', error);
    throw new Error('Failed to convert document with LibreOffice');
  }
}