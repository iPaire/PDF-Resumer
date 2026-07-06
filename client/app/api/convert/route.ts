// app/api/convert/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit';
import {
  checkContentLength,
  checkFileSize,
  sniffType,
  MAX_TOTAL_UPLOAD_BYTES,
} from '@/lib/upload-guard';

export async function POST(request: NextRequest) {
  try {
    // Per-IP rate limit - this route is unauthenticated and CPU heavy
    const rateLimit = await checkRateLimit('convert', getClientIp(request));
    if (!rateLimit.success) {
      return rateLimitResponse(rateLimit);
    }

    // Reject oversized requests before buffering the body into memory
    const lengthCheck = checkContentLength(request);
    if (!lengthCheck.ok) {
      return NextResponse.json({ error: lengthCheck.error }, { status: 413 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Creăm un PDF nou care va conține toate fișierele
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    let totalBytes = 0;

    // Procesăm fiecare fișier
    for (const file of files) {
      const fileName = file.name;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      // Per-file and cumulative size caps (Content-Length can be spoofed/absent)
      const sizeCheck = checkFileSize(fileBuffer.length);
      if (!sizeCheck.ok) {
        return NextResponse.json({ error: `${fileName}: ${sizeCheck.error}` }, { status: 413 });
      }
      totalBytes += fileBuffer.length;
      if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: `Total upload exceeds the ${Math.floor(MAX_TOTAL_UPLOAD_BYTES / 1024 / 1024)}MB limit.` },
          { status: 413 }
        );
      }

      // Trust the magic bytes, not the client-declared MIME type.
      const sniffed = sniffType(fileBuffer);
      const fileType =
        sniffed === 'pdf' ? 'application/pdf' :
        sniffed === 'jpeg' ? 'image/jpeg' :
        sniffed === 'png' ? 'image/png' :
        'application/octet-stream';

      try {
        // Adăugăm conținutul fișierului ca pagină nouă în PDF
        await addFileToPdf(pdfDoc, fileBuffer, fileType, fileName);
      } catch (error) {
        console.error(`Error processing file ${fileName}:`, error);
        // Adăugăm o pagină cu mesaj de eroare pentru acest fișier
        await addErrorPage(pdfDoc, fileName, error as Error);
      }
    }

    // Salvăm PDF-ul final
    const pdfBytes = await pdfDoc.save();
    
    // Determinăm numele fișierului de output
    let outputFilename = "converted-documents.pdf";
    if (files.length === 1) {
      const firstFile = files[0];
      outputFilename = `${firstFile.name.replace(/\.[^/.]+$/, '')}.pdf`;
    }
    
    // Returnăm PDF-ul generat
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(outputFilename)}"`,
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

// Funcție pentru a încărca fontul Roboto cu suport Unicode
async function getUnicodeFont(pdfDoc: PDFDocument) {
  try {
    const fontPath = join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
    const fontBytes = readFileSync(fontPath);
    return await pdfDoc.embedFont(fontBytes);
  } catch (error) {
    console.error('Could not load Roboto font:', error);
    throw new Error('Font loading failed');
  }
}

// Funcție pentru a adăuga un fișier la PDF
async function addFileToPdf(
  pdfDoc: PDFDocument, 
  fileBuffer: Buffer, 
  fileType: string, 
  fileName: string
): Promise<void> {
  switch (fileType) {
    case 'application/pdf': {
      // Dacă este PDF, extragem paginile și le adăugăm
      const pdf = await PDFDocument.load(fileBuffer);
      const pages = await pdfDoc.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(page => pdfDoc.addPage(page));
      break;
    }

    case 'image/jpeg':
    case 'image/jpg': {
      await addImageToPdf(pdfDoc, fileBuffer, 'jpeg');
      break;
    }

    case 'image/png': {
      await addImageToPdf(pdfDoc, fileBuffer, 'png');
      break;
    }

    case 'text/plain': {
      // Convertim textul și îl adăugăm ca pagină nouă
      await addTextToPdf(pdfDoc, fileBuffer.toString(), fileName);
      break;
    }

    default: {
      // Pentru alte formate, creăm o pagină cu informația despre fișier
      await addUnsupportedFilePage(pdfDoc, fileName, fileType);
    }
  }
}

// Funcție pentru a adăuga o imagine la PDF
async function addImageToPdf(pdfDoc: PDFDocument, imageBuffer: Buffer, format: 'jpeg' | 'png'): Promise<void> {
  try {
    let image;
    if (format === 'jpeg') {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else {
      image = await pdfDoc.embedPng(imageBuffer);
    }
    
    // Calculăm dimensiunile pentru a se potrivi pe pagină
    const maxWidth = 550;
    const maxHeight = 750;
    
    let { width, height } = image;
    
    // Redimensionăm dacă este prea mare
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width *= ratio;
      height *= ratio;
    }
    
    // Adăugăm pagina
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    
    // Centram imaginea
    const x = (595.28 - width) / 2;
    const y = (841.89 - height) / 2;
    
    page.drawImage(image, {
      x,
      y,
      width,
      height,
    });
  } catch (error) {
    console.error('Error adding image:', error);
    throw new Error('Failed to process image');
  }
}

// Funcție pentru a adăuga text la PDF cu suport complet Unicode
async function addTextToPdf(pdfDoc: PDFDocument, text: string, fileName: string): Promise<void> {
  const font = await getUnicodeFont(pdfDoc);
  
  const fontSize = 12; // Redus de la 14 la 12
  const lineHeight = fontSize * 1.3; // Redus spațiul între linii
  const margin = 50; // Redus marginile
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const maxWidth = pageWidth - (margin * 2);
  const maxHeight = pageHeight - (margin * 2);
  
  // Împărțim textul în paragrafe pentru spațiere mai bună
  const paragraphs = text.split(/\n\s*\n/);
  const allLines: string[] = [];
  
  for (const paragraph of paragraphs) {
    if (paragraph.trim()) {
      // Procesăm fiecare paragraf separat
      const words = paragraph.trim().split(/\s+/);
      const paragraphLines: string[] = [];
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const textWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (textWidth <= maxWidth) {
          currentLine = testLine;
        } else {
          if (currentLine) {
            paragraphLines.push(currentLine);
            currentLine = word;
          } else {
            // Cuvântul este prea lung, îl tăiem
            const maxChars = Math.floor(maxWidth / (fontSize * 0.5));
            paragraphLines.push(word.substring(0, maxChars));
            currentLine = word.substring(maxChars);
          }
        }
      }
      
      if (currentLine) {
        paragraphLines.push(currentLine);
      }
      
      // Adăugăm liniile paragrafului
      allLines.push(...paragraphLines);
      // Adăugăm o linie goală după paragraf pentru spațiere (doar dacă nu e ultimul)
      if (paragraphs.indexOf(paragraph) < paragraphs.length - 1) {
        allLines.push('');
      }
    }
  }
  
  // Calculăm câte pagini avem nevoie
  const linesPerPage = Math.floor((maxHeight - 80) / lineHeight); // -80 pentru header
  const totalPages = Math.ceil(allLines.length / linesPerPage);
  
  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    
    // Adăugăm header doar pe prima pagină
    if (pageIndex === 0) {
      page.drawText(`Fișier: ${fileName}`, {
        x: margin,
        y: pageHeight - margin,
        size: fontSize + 2, // Header mai mare
        font,
        color: rgb(0, 0, 0.8),
      });
      
      // Linie separatoare mai vizibilă
      page.drawRectangle({
        x: margin,
        y: pageHeight - margin - 25,
        width: maxWidth,
        height: 1,
        color: rgb(0.7, 0.7, 0.7),
      });
    }
    
    // Calculăm poziția de start pentru text
    let startY = pageIndex === 0 ? pageHeight - margin - 50 : pageHeight - margin - 20;
    
    // Adăugăm textul pentru această pagină
    const startLine = pageIndex * linesPerPage;
    const endLine = Math.min(startLine + linesPerPage, allLines.length);
    
    for (let i = startLine; i < endLine; i++) {
      const line = allLines[i];
      if (line.trim() || i === startLine) { // Afișăm și liniile goale pentru spațiere
        page.drawText(line, {
          x: margin,
          y: startY - ((i - startLine) * lineHeight),
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
        });
      }
    }
    
    // Adăugăm numărul paginii dacă avem mai multe pagini
    if (totalPages > 1) {
      page.drawText(`Pagina ${pageIndex + 1} din ${totalPages}`, {
        x: pageWidth - margin - 80,
        y: 30,
        size: fontSize - 2,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }
  }
}

// Funcție pentru fișiere nesuportate
async function addUnsupportedFilePage(pdfDoc: PDFDocument, fileName: string, fileType: string): Promise<void> {
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await getUnicodeFont(pdfDoc);
  const fontSize = 12; // Redus fontSize
  
  page.drawText('Fișier inclus în PDF', {
    x: 50, // Redus marginea
    y: 800,
    size: fontSize + 4, // Header mai mare
    font,
    color: rgb(0, 0, 0.8),
  });
  
  page.drawText(`Nume: ${fileName}`, {
    x: 50,
    y: 750, // Redus spațierea
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(`Tip: ${fileType}`, {
    x: 50,
    y: 720, // Redus spațierea
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('Acest tip de fișier nu poate fi convertit direct în PDF.', {
    x: 50,
    y: 670, // Redus spațierea
    size: fontSize,
    font,
    color: rgb(0.6, 0, 0),
  });
  
  page.drawText('Pentru a vizualiza conținutul, descărcați fișierul original.', {
    x: 50,
    y: 640, // Redus spațierea
    size: fontSize,
    font,
    color: rgb(0.6, 0, 0),
  });
  
  // Adăugăm o pictogramă simplă pentru fișier
  page.drawRectangle({
    x: 250,
    y: 400,
    width: 100,
    height: 120,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 2,
  });
  
  page.drawText('FILE', {
    x: 275,
    y: 450,
    size: 16,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });
}

// Funcție pentru a adăuga o pagină de eroare
async function addErrorPage(pdfDoc: PDFDocument, fileName: string, error: Error): Promise<void> {
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const font = await getUnicodeFont(pdfDoc);
  const fontSize = 12; // Redus fontSize
  
  page.drawText(`Eroare la procesarea fișierului: ${fileName}`, {
    x: 50, // Redus marginea
    y: 800,
    size: fontSize + 2, // Redus header
    font,
    color: rgb(1, 0, 0),
  });
  
  page.drawText(`Eroare: ${error.message}`, {
    x: 50,
    y: 770, // Redus spațierea
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('Fișierul a fost inclus în PDF, dar conținutul nu poate fi afișat.', {
    x: 50,
    y: 740, // Redus spațierea
    size: fontSize,
    font,
    color: rgb(0.6, 0, 0),
  });
}