import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

// POST - Generate printable cheat sheet
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // 1. Get course with summaries
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        userId: userId
      },
      include: {
        summaries: {
          include: {
            summary: {
              select: {
                id: true,
                title: true,
                content: true
              }
            }
          },
          orderBy: {
            addedAt: 'asc'
          }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.summaries.length === 0) {
      return NextResponse.json({ error: 'Course has no summaries' }, { status: 400 });
    }

    // 2. Combine all summaries
    const combinedText = course.summaries.map(cs => 
      `## ${cs.summary.title}\n\n${cs.summary.content}`
    ).join('\n\n---\n\n');

    // 3. Generate cheat sheet using local function
    const cheatSheetContent = generateCheatSheet(
      course.title,
      combinedText
    );

    // 4. Save cheat sheet to database
    await prisma.cheatSheet.create({
      data: {
        content: cheatSheetContent,
        courseId: courseId,
        userId: userId
      }
    });

    return NextResponse.json({
      success: true,
      cheatSheet: cheatSheetContent,
      courseTitle: course.title
    });

  } catch (error) {
    console.error('Error generating cheat sheet:', error);
    return NextResponse.json(
      { error: 'Server error generating cheat sheet' },
      { status: 500 }
    );
  }
}

// GET - Get existing cheat sheets
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // Verify course ownership
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        userId: userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Get all cheat sheets for this course
    const cheatSheets = await prisma.cheatSheet.findMany({
      where: {
        courseId: courseId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      cheatSheets: cheatSheets.map(cs => ({
        id: cs.id,
        content: cs.content,
        createdAt: cs.createdAt
      })),
      courseTitle: course.title
    });

  } catch (error) {
    console.error('Error fetching cheat sheets:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete a cheat sheet
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;
  const { cheatSheetId } = await req.json();

  try {
    // Verify ownership
    const cheatSheet = await prisma.cheatSheet.findFirst({
      where: {
        id: cheatSheetId,
        courseId: courseId,
        userId: userId
      }
    });

    if (!cheatSheet) {
      return NextResponse.json({ error: 'Cheat sheet not found' }, { status: 404 });
    }

    // Delete the cheat sheet
    await prisma.cheatSheet.delete({
      where: {
        id: cheatSheetId
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Cheat sheet deleted'
    });

  } catch (error) {
    console.error('Error deleting cheat sheet:', error);
    return NextResponse.json(
      { error: 'Server error deleting cheat sheet' },
      { status: 500 }
    );
  }
}

// ============== HELPER FUNCTIONS ==============

function generateCheatSheet(courseTitle: string, combinedContent: string): string {
  // Extracted content
  const formulas = extractFormulas(combinedContent);
  const definitions = extractDefinitions(combinedContent);
  const keyTerms = extractKeyTerms(combinedContent);
  const procedures = extractProcedures(combinedContent);
  const constants = extractConstants(combinedContent);
  const diagrams = extractDiagramConcepts(combinedContent);

  return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copiuță - ${escapeHtml(courseTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 9pt;
      line-height: 1.4;
      margin: 0;
      padding: 5mm;
      color: #333;
      background: white;
      max-width: 210mm;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 4mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #2c5282;
    }
    .title {
      font-size: 14pt;
      font-weight: bold;
      color: #2c5282;
      margin: 0;
    }
    .subtitle {
      font-size: 8pt;
      color: #718096;
      margin: 1mm 0 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 4mm;
      margin-top: 3mm;
    }
    .section {
      margin-bottom: 4mm;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 600;
      color: #2c5282;
      background: #ebf8ff;
      padding: 2mm 3mm;
      border-left: 3px solid #2c5282;
      margin: 0 0 2mm;
    }
    .items {
      padding-left: 3mm;
    }
    .item {
      margin-bottom: 1.5mm;
    }
    .formula {
      font-family: 'Cambria Math', serif;
      font-size: 9pt;
      padding: 1mm 0;
    }
    .definition {
      display: flex;
      margin-bottom: 1mm;
    }
    .term {
      font-weight: 600;
      min-width: 25mm;
    }
    .diagram-box {
      border: 1px dashed #cbd5e0;
      height: 20mm;
      margin-top: 2mm;
      padding: 1mm;
      font-size: 8pt;
      color: #718096;
    }
    .footer {
      margin-top: 4mm;
      padding-top: 2mm;
      border-top: 1px solid #e2e8f0;
      font-size: 7pt;
      color: #718096;
      text-align: center;
    }
    .notation {
      display: flex;
      justify-content: space-between;
      margin-top: 2mm;
    }
    .notation-item {
      flex: 1;
      padding: 0 2mm;
    }
    .notes-space {
      border: 1px solid #cbd5e0;
      height: 15mm;
      margin-top: 1mm;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">${escapeHtml(courseTitle)}</h1>
    <p class="subtitle">Copiuță de formule și concepte</p>
  </div>

  <div class="grid">
    <div>
      ${formulas.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Formule Cheie</h2>
          <div class="items">
            ${formulas.map(f => `
              <div class="item formula">${escapeHtml(f)}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${definitions.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Definiții</h2>
          <div class="items">
            ${definitions.map(d => `
              <div class="item definition">
                <span class="term">${escapeHtml(d.term)}:</span>
                <span>${escapeHtml(d.definition)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${constants.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Constante</h2>
          <div class="items">
            ${constants.map(c => `
              <div class="item">${escapeHtml(c)}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>

    <div>
      ${keyTerms.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Termeni Cheie</h2>
          <div class="items">
            ${keyTerms.map(t => `
              <div class="item">• ${escapeHtml(t)}</div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${procedures.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Proceduri</h2>
          <div class="items">
            ${procedures.map((p, i) => `
              <div class="item">
                <strong>${i+1}.</strong> ${escapeHtml(p)}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${diagrams.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Diagrame</h2>
          <div class="items">
            ${diagrams.map(d => `
              <div class="item">• ${escapeHtml(d)}</div>
              <div class="diagram-box">Spațiu pentru diagramă</div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    <div class="notation">
      <div class="notation-item">
        <strong>Notații:</strong><br>
        f(x) - funcție, Δ - variație, ∑ - sumă
      </div>
      <div class="notation-item">
        <strong>Unități:</strong><br>
        m - metri, s - secunde, kg - kilograme
      </div>
      <div class="notation-item">
        <strong>Notițe:</strong>
        <div class="notes-space"></div>
      </div>
    </div>
    <p>Generat automat • ${new Date().toLocaleDateString('ro-RO')}</p>
  </div>
</body>
</html>
  `;
}

// Helper function to escape HTML
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Extract formulas from text
function extractFormulas(text: string): string[] {
  const formulas: string[] = [];
  const cleanText = text.replace(/<[^>]*>/g, ''); // Remove HTML tags
  
  // Mathematical expressions patterns
  const patterns = [
    // LaTeX style formulas
    /\$\$([^$]+)\$\$/g,
    /\$([^$]+)\$/g,
    // Equations with equals
    /([A-Za-z]\w*\s*=\s*[^.!?\n]+)/g,
    // Mathematical expressions
    /([a-zA-Z]+\(\w+\)\s*=\s*[^.!?\n]+)/g,
    // Physics/Math constants
    /([A-Z][a-z]?\s*=\s*[0-9][^.!?\n]*)/g,
    // Fractions and ratios
    /(\w+\/\w+\s*=\s*[^.!?\n]+)/g
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const formula = (match[1] || match[0]).trim();
      if (formula.length > 3 && formula.length < 150 && !formulas.includes(formula)) {
        formulas.push(formula);
      }
    }
  });

  return formulas.slice(0, 15); // Limit to 15 formulas
}

// Extract definitions from text
function extractDefinitions(text: string): Array<{term: string, definition: string}> {
  const definitions: Array<{term: string, definition: string}> = [];
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  const sentences = cleanText.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 20 || trimmed.length > 300) return;
    
    // Pattern: "Term este/reprezintă/se definește ca..."
    const defPatterns = [
      /^([A-ZĂÂÎȘȚ][a-zA-ZăâîșțĂÂÎȘȚ\s]{2,30})\s+(este|reprezintă|se definește ca|înseamnă)\s+(.+)/i,
      /^([A-ZĂÂÎȘȚ][a-zA-ZăâîșțĂÂÎȘȚ\s]{2,30}):\s*(.+)/
    ];
    
    defPatterns.forEach(pattern => {
      const match = trimmed.match(pattern);
      if (match) {
        const term = match[1].trim();
        const definition = (match[3] || match[2]).trim();
        
        if (term.length > 2 && term.length < 50 && definition.length > 10) {
          definitions.push({ term, definition });
        }
      }
    });
  });

  return definitions.slice(0, 10); // Limit to 10 definitions
}

// Extract key terms
function extractKeyTerms(text: string): string[] {
  const keyTerms: string[] = [];
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  // Look for capitalized terms, technical terms, etc.
  const patterns = [
    /\b([A-ZĂÂÎȘȚ][a-zA-ZăâîșțĂÂÎȘȚ]{3,25})\b/g,
    /\b(algoritm|metodă|principiu|teoremă|legea?|regulă|proces|procedură|tehnică)\s+([A-Za-zăâîșțĂÂÎȘȚ\s]{3,30})/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const term = (match[2] || match[1]).trim();
      if (term.length > 3 && term.length < 40 && !keyTerms.includes(term)) {
        keyTerms.push(term);
      }
    }
  });

  return keyTerms.slice(0, 20); // Limit to 20 key terms
}

// Extract procedures/steps
function extractProcedures(text: string): string[] {
  const procedures: string[] = [];
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  const lines = cleanText.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Look for numbered steps or procedural language
    if (/^(\d+\.|Pasul \d+|Step \d+|Prima data|În primul rând|Apoi|După aceea|În final)/i.test(trimmed)) {
      const cleaned = trimmed.replace(/^(\d+\.|Pasul \d+|Step \d+)\s*/i, '').trim();
      if (cleaned.length > 10 && cleaned.length < 200) {
        procedures.push(cleaned);
      }
    }
  });

  return procedures.slice(0, 8); // Limit to 8 procedures
}

// Extract constants
function extractConstants(text: string): string[] {
  const constants: string[] = [];
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  const patterns = [
    // Physical constants
    /(π\s*=\s*[0-9.]+|e\s*=\s*[0-9.]+|c\s*=\s*[0-9.]+)/g,
    // Named constants
    /([A-Z_]+\s*=\s*[0-9.]+[a-zA-Z]*)/g,
    // Mathematical constants
    /(constanta\s+[A-Za-z]+\s*=\s*[0-9.]+)/gi
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(cleanText)) !== null) {
      const constant = match[1] || match[0];
      if (constant.length > 3 && constant.length < 50 && !constants.includes(constant)) {
        constants.push(constant);
      }
    }
  });

  return constants.slice(0, 10); // Limit to 10 constants
}

// Extract diagram concepts
function extractDiagramConcepts(text: string): string[] {
  const diagrams: string[] = [];
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  const keywords = ['diagramă', 'grafic', 'schemă', 'figura', 'tabel', 'hartă', 'plan', 'desen'];
  
  const sentences = cleanText.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    keywords.forEach(keyword => {
      if (lowerSentence.includes(keyword) && sentence.length > 20 && sentence.length < 150) {
        const cleaned = sentence.trim().replace(/^(vezi|consultă|observă)\s*/i, '');
        if (!diagrams.includes(cleaned)) {
          diagrams.push(cleaned);
        }
      }
    });
  });

  return diagrams.slice(0, 5); // Limit to 5 diagram concepts
}