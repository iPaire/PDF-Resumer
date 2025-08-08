import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

// Generează copiuța printabilă
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // 1. Obține rezumatul final existent
    const finalSummaryRelation = await prisma.courseSummary.findFirst({
      where: {
        courseId: courseId,
        summary: {
          title: {
            startsWith: 'Rezumat Final -'
          },
          userId: userId
        }
      },
      include: {
        summary: true
      },
      orderBy: {
        addedAt: 'desc'
      }
    });

    if (!finalSummaryRelation) {
      return NextResponse.json(
        { error: 'Nu există rezumat final pentru acest curs' },
        { status: 404 }
      );
    }

    // 2. Procesează rezumatul cu AI pentru copiuță
    const cheatSheetContent = await generateCheatSheet(
      finalSummaryRelation.summary.content
    );

    // 3. Returnează conținutul pentru printare
    return NextResponse.json({
      cheatSheet: cheatSheetContent,
      courseTitle: finalSummaryRelation.summary.title.replace('Rezumat Final - ', '')
    });

  } catch (error) {
    console.error('Error generating cheat sheet:', error);
    return NextResponse.json(
      { error: 'Eroare server la generarea copiuței' },
      { status: 500 }
    );
  }
}

// Funcție AI pentru generarea copiuței
async function generateCheatSheet(summaryContent: string): Promise<string> {
  const prompt = `
Transformă următorul rezumat de curs într-o copiuță printabilă pe o singură pagină A4. 
Te rog să urmezi aceste reguli stricte:

1. Extrage DOAR formulele, definițiile esențiale și conceptele cheie
2. Organizează informația în secțiuni logice cu titluri scurte
3. Folosește puncte enumerate (•) pentru liste
4. Maxim 10 secțiuni principale
5. Evită explicațiile lungi - maxim 1 propoziție per concept
6. Prioritizează formulele matematice și diagramele conceptuale
7. Folosește notația:
   - **Formule**: $$ [formula] $$ 
   - **Definiții**: [termen] = [definiție scurtă]
   - **Concepte cheie**: ► [concept]

Rezumat:
${summaryContent}
`;

  // Aici s-ar face apelul real la API-ul AI (OpenAI, Claude etc.)
  // Pentru demonstrație, folosim un template
  return mockAICheatSheetGeneration(summaryContent);
}

// Funcție mock pentru generare rapidă
function mockAICheatSheetGeneration(content: string): string {
  const keyItems = content
    .split('\n')
    .filter(line => 
      line.includes('=') || 
      line.trim().startsWith('►') || 
      line.includes('$$') ||
      line.includes(':')
    )
    .slice(0, 20); // Limită la 20 de elemente

  return `
# Copiuță Curs

## Concepte Fundamentale
${keyItems.filter(item => item.includes('►')).join('\n')}

## Formule Cheie
${keyItems.filter(item => item.includes('$$')).map(f => `• ${f}`).join('\n')}

## Definiții
${keyItems.filter(item => item.includes('=')).map(d => `• ${d}`).join('\n')}

## Diagrame Utilie
- [Spațiu pentru diagrame conceptuale]
- [Schemă logică a proceselor]

*Generat automat la ${new Date().toLocaleDateString('ro-RO')}*
`;
}