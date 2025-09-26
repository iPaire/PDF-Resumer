// app/api/summaries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

// Funcție pentru îmbunătățirea formatării și structurii
function improveFormatting(summary: string, title: string = '', createdAt: Date = new Date()): string {
  let improved = summary;
  
  // Înlocuiește date placeholder cu date reale
  const currentDate = new Date().toLocaleDateString('ro-RO');
  const createdDate = createdAt.toLocaleDateString('ro-RO');
  improved = improved.replace(/\[data curentă\]/g, currentDate);
  improved = improved.replace(/\[data generării\]/g, createdDate);
  improved = improved.replace(/\[nume fisier\]/g, title);
  
  // Adaugă separatori pentru secțiuni mari
  improved = improved.replace(/(#{1,3}\s*\*\*[^*]+\*\*)/g, '\n\n$1');
  
  // Îmbunătățește formatarea formulelor cu detectare îmbunătățită
  improved = improved.replace(/([A-Za-z_]+\s*[=≈≤≥]\s*[A-Za-z0-9\s+\-*/()^.\\frac{}]+)/g, '\n\n**Formulă:** `$1`\n');
  improved = improved.replace(/(\\frac\{[^}]+\}\{[^}]+\})/g, '\n\n**Formulă:** `$1`\n');
  improved = improved.replace(/([A-Za-z_]+_{[^}]+}\s*[=≈])/g, '\n\n**Formulă:** `$1`\n');
  
  // Evidențiază valorile numerice cu unități
  improved = improved.replace(/(\d+[.,]?\d*\s*[A-Za-z%]+)/g, '**$1**');
  
  // Îmbunătățește formatarea listelor
  improved = improved.replace(/^(\s*-)(\s*)/gm, '- ');
  
  // Îmbunătățește formatarea tabelelor - înlocuiește separatorii simpli cu formatare Markdown
  improved = improved.replace(/\|([^|]+)\|([^|]+)\|([^|]+)\|/g, '| $1 | $2 | $3 |');
  improved = improved.replace(/^\s*\|[\s\-|]+\|\s*$/gm, '|---|---|---|');
  
  // Adaugă header-e pentru tabele dacă lipsesc
  improved = improved.replace(/(\|[^|\n]+\|[^|\n]+\|[^|\n]+\|)\n\|[\-\s|]+\|/g, '$1\n|---|---|---|');
  
  // Formatare îmbunătățită pentru tabele cu multiple coloane
  const tableMatches = improved.match(/\|[^|\n]+\|[^|\n]+\|[^|\n]+\|[^|\n]*\|?/g);
  if (tableMatches) {
    tableMatches.forEach(table => {
      const columns = table.split('|').filter(col => col.trim());
      if (columns.length >= 3) {
        const formattedRow = '| ' + columns.join(' | ') + ' |';
        improved = improved.replace(table, formattedRow);
      }
    });
  }
  
  // Curăță duplicatele de spații și linii goale
  improved = improved.replace(/\n{3,}/g, '\n\n');
  improved = improved.replace(/\s+$/gm, '');
  
  return improved.trim();
}

// GET - Obține toate rezumatele utilizatorului
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    console.log('Fetching summaries for user:', userId);

    // Obține toate rezumatele utilizatorului cu informații despre cursurile asociate
    const summaries = await prisma.summary.findMany({
      where: {
        userId: userId
      },
      include: {
        courses: {
          include: {
            course: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('Found summaries:', summaries.length);

    // Formatează datele pentru frontend cu îmbunătățirea conținutului
    const formattedSummaries = summaries.map(summary => ({
      id: summary.id,
      title: summary.title,
      content: improveFormatting(summary.content, summary.title, summary.createdAt),
      createdAt: summary.createdAt,
      coursesCount: summary.courses.length,
      courses: summary.courses.map(cs => ({
        id: cs.course.id,
        title: cs.course.title
      }))
    }));

    return NextResponse.json({
      summaries: formattedSummaries,
      total: summaries.length
    });

  } catch (error) {
    console.error('Error fetching summaries:', error);
    return NextResponse.json(
      { error: 'Eroare server la obținerea rezumatelor' },
      { status: 500 }
    );
  }
}

// POST - Creează un rezumat nou
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { title, content } = await req.json();

    // Validări
    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Titlul este obligatoriu' }, { status: 400 });
    }

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Conținutul este obligatoriu' }, { status: 400 });
    }

    // Îmbunătățește formatarea conținutului înainte de salvare
    const improvedContent = improveFormatting(content.trim(), title.trim());
    
    // Creează rezumatul
    const newSummary = await prisma.summary.create({
      data: {
        title: title.trim(),
        content: improvedContent,
        userId: userId
      }
    });

    console.log('Created new summary:', newSummary.id);

    return NextResponse.json({
      success: true,
      summary: {
        id: newSummary.id,
        title: newSummary.title,
        content: newSummary.content,
        createdAt: newSummary.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating summary:', error);
    return NextResponse.json(
      { error: 'Eroare server la crearea rezumatului' },
      { status: 500 }
    );
  }
}