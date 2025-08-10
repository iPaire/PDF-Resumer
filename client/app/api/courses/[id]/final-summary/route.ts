import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

// ===================== POST - Generează rezumatul final =====================
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // 1. Obține cursul și rezumatele existente
    const course = await prisma.course.findUnique({
      where: { id: courseId, userId },
      include: {
        summaries: {
          include: { summary: { select: { id: true, title: true, content: true } } },
          orderBy: { addedAt: 'asc' }
        }
      }
    });

    if (!course) return NextResponse.json({ error: 'Cursul nu a fost găsit' }, { status: 404 });
    if (course.summaries.length === 0) return NextResponse.json({ error: 'Cursul nu conține rezumate' }, { status: 400 });

    // 2. Creează text combinat pentru procesare
    const allSummaries = course.summaries.map(cs => ({ title: cs.summary.title, content: cs.summary.content }));
    const combinedText = allSummaries.map((summary, index) => 
      `## Modul ${index + 1}: ${summary.title}\n\n${summary.content}`
    ).join('\n\n---\n\n');

    // 3. Extrage secțiunile local
    const keyConcepts = extractKeyConceptsByModule(combinedText);
    const formulas = extractFormulas(combinedText);
    const definitions = extractDefinitions(combinedText);
    const keyPoints = extractKeyPoints(combinedText);
    const applications = extractPracticalApplications(combinedText);
    const conclusions = extractConclusions(combinedText);

    // 4. Trimite la AI pentru formulare frumoasă
    const finalSummaryContent = await generateCourseFinalSummary(
      course.title, 
      course.description || '', 
      allSummaries.length,
      keyConcepts, formulas, definitions, keyPoints, applications, conclusions
    );

    // 5. Șterge vechiul rezumat final
    const existingFinalSummary = await prisma.courseSummary.findFirst({
      where: { courseId, summary: { title: { startsWith: 'Rezumat Final -' }, userId } },
      include: { summary: true }
    });

    if (existingFinalSummary) {
      await prisma.courseSummary.delete({ where: { id: existingFinalSummary.id } });
      await prisma.summary.delete({ where: { id: existingFinalSummary.summary.id } });
    }

    // 6. Salvează rezumatul nou
    const finalSummary = await prisma.summary.create({
      data: {
        title: `Rezumat Final - ${course.title}`,
        content: finalSummaryContent,
        userId
      }
    });

    await prisma.courseSummary.create({ data: { courseId, summaryId: finalSummary.id } });

    return NextResponse.json({
      success: true,
      finalSummary: {
        id: finalSummary.id,
        title: finalSummary.title,
        content: finalSummary.content,
        createdAt: finalSummary.createdAt
      },
      sourceCount: allSummaries.length
    });

  } catch (error) {
    console.error('Error generating final summary:', error);
    return NextResponse.json({ error: 'Eroare server la generarea rezumatului final' }, { status: 500 });
  }
}

// ===================== GET - Obține rezumatul final existent =====================
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    const finalSummaryRelation = await prisma.courseSummary.findFirst({
      where: { courseId, summary: { title: { startsWith: 'Rezumat Final -' }, userId } },
      include: { summary: true },
      orderBy: { addedAt: 'desc' }
    });

    if (!finalSummaryRelation) return NextResponse.json({ error: 'Nu există rezumat final pentru acest curs' }, { status: 404 });

    return NextResponse.json({
      finalSummary: {
        id: finalSummaryRelation.summary.id,
        title: finalSummaryRelation.summary.title,
        content: finalSummaryRelation.summary.content,
        createdAt: finalSummaryRelation.summary.createdAt,
        addedAt: finalSummaryRelation.addedAt
      }
    });

  } catch (error) {
    console.error('Error fetching final summary:', error);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

// ===================== Prompt AI =====================
async function generateCourseFinalSummary(
  courseTitle: string, 
  courseDescription: string, 
  moduleCount: number,
  keyConcepts: string,
  formulas: string,
  definitions: string,
  keyPoints: string,
  applications: string,
  conclusions: string
): Promise<string> {

  const prompt = `
Creează un rezumat final bine scris pentru cursul "${courseTitle}" folosind următoarele secțiuni extrase automat:

## Prezentare Generală
Descriere: ${courseDescription}
Module studiate: ${moduleCount}

## Structura Cursului
${keyConcepts}

## Concepte Fundamentale
${definitions}

## Formule și Relații Cheie
${formulas}

## Puncte Esențiale
${keyPoints}

## Aplicații Practice
${applications}

## Concluzie
${conclusions}

Cerințe:
- Formulează frumos, coerent și fluent în limba română.
- Păstrează toate informațiile importante.
- Structura finală trebuie să aibă aceleași titluri și ordine.
`;

  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3
    })
  });

  const data = await aiResponse.json();
  return data.choices?.[0]?.message?.content || "Eroare la generarea rezumatului.";
}

// ===================== Funcții helper =====================
function extractKeyConceptsByModule(text: string): string {
  const modules = text.split('---');
  let result = '';
  modules.forEach((module, index) => {
    const lines = module.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 1) {
      const moduleTitle = lines[0]?.replace(/^#+\s*/, '') || `Modul ${index + 1}`;
      const keyPoints = lines.slice(1, 4)
        .filter(line => line.trim().length > 20)
        .map(line => `  • ${line.trim().substring(0, 100)}${line.length > 100 ? '...' : ''}`)
        .join('\n');
      result += `\n### ${moduleTitle}\n${keyPoints}\n`;
    }
  });
  return result || '• Concepte fundamentale ale domeniului studiat';
}

function extractFormulas(text: string): string {
  const formulas = [];
  const patterns = [
    /\$\$([^$]+)\$\$/g, /\$([^$]+)\$/g,
    /([A-Z][a-z]?\s*=\s*[^.]+)/g, /([a-zA-Z]+\s*=\s*[0-9][^.]*)/g
  ];
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const formula = match[1] || match[0];
      if (formula.length > 3 && formula.length < 100) formulas.push(`• ${formula.trim()}`);
    }
  });
  return formulas.length > 0 ? formulas.slice(0, 10).join('\n') : '• Formule specifice domeniului studiat';
}

function extractDefinitions(text: string): string {
  const definitions = [];
  const lines = text.split('\n');
  lines.forEach(line => {
    if ((line.includes('este') || line.includes('reprezintă') || line.includes('se definește')) && 
        line.length > 20 && line.length < 200) {
      definitions.push(`► ${line.trim()}`);
    }
  });
  return definitions.length > 0 ? definitions.slice(0, 8).join('\n') : '► Definiții fundamentale ale conceptelor studiate';
}

function extractKeyPoints(text: string): string {
  const keyPoints = [];
  const indicators = ['important', 'esențial', 'fundamental', 'crucial', 'principal', 'trebuie', 'necesar', 'cheie', 'vital'];
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (indicators.some(ind => lowerSentence.includes(ind)) && sentence.length > 30 && sentence.length < 200) {
      keyPoints.push(`⭐ ${sentence.trim()}`);
    }
  });
  return keyPoints.length > 0 ? keyPoints.slice(0, 6).join('\n') : '⭐ Concepte și principii fundamentale ale cursului';
}

function extractPracticalApplications(text: string): string {
  const applications = [];
  const indicators = ['aplicare', 'practică', 'exemplu', 'utilizare', 'implementare', 'folosire', 'aplicație', 'caz', 'situație', 'experiment'];
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (indicators.some(ind => lowerSentence.includes(ind)) && sentence.length > 25 && sentence.length < 180) {
      applications.push(`🔧 ${sentence.trim()}`);
    }
  });
  return applications.length > 0 ? applications.slice(0, 5).join('\n') : '🔧 Aplicații practice în domeniul studiat';
}

function extractConclusions(text: string): string {
  const conclusions = [];
  const indicators = ['concluzie', 'în final', 'prin urmare', 'rezultă că', 'se poate spune', 'în rezumat', 'astfel', 'în consecință'];
  const sentences = text.split(/[.!?]+/);
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (indicators.some(ind => lowerSentence.includes(ind)) && sentence.length > 30) {
      conclusions.push(sentence.trim());
    }
  });
  return conclusions.length > 0 ? conclusions.slice(-2).join(' ') : '';
}
