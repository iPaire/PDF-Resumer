import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import { FileCreateInputWithQuiz } from '@/types/fileTypes';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new Response(
      JSON.stringify({ error: 'Trebuie să fii autentificat pentru a utiliza acest serviciu' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { 
        usage: { 
          where: { 
            date: { 
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
              lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
            } 
          } 
        } 
      }
    });

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Utilizatorul nu a fost găsit' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check usage limits
    const usageCount = user.usage.length;
    const planLimits = {
      free: 3,
      standard: 50,
      premium: 200
    };
    const userLimit = planLimits[user.subscription as keyof typeof planLimits] || 0;

    if (usageCount >= userLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Ai atins limita lunară de ${userLimit} rezumate. ${userLimit === 3 ? 'Trebuie să îți faci upgrade pentru a continua.' : 'Te rugăm să aștepți până la resetarea lunară.'}` 
        }), 
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process file size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Fișierul depășește limita de 10MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Process file upload
    const formData = await request.formData();
    const file = formData.get('pdf') as Blob | null;
    const filename = formData.get('filename') as string | null;

    if (!file || !filename) {
      return new Response(
        JSON.stringify({ error: 'Niciun fișier PDF încărcat' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'Tip fișier invalid. Vă rugăm să încărcați doar PDF-uri.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = await file.arrayBuffer();
    const header = new Uint8Array(buffer, 0, 4);
    const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
    if (headerHex !== '25504446') {
      return new Response(
        JSON.stringify({ error: 'Fișierul nu este un PDF valid' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse PDF
    let text = '';
    let numpages = 0;

    try {
      const data = await pdf(Buffer.from(buffer));
      text = data.text;
      numpages = data.numpages;
    } catch (parseError) {
      console.error('Eroare parsare PDF:', parseError);
      return new Response(
        JSON.stringify({ error: 'Nu am putut extrage textul din PDF. Fișierul este protejat sau conține imagini.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: 'PDF-ul conține doar imagini. Nu putem extrage text.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate summary
    const maxLength = 10000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '... [text trunchiat]' 
      : text;

    const prompt = `
Pe baza următorului text, generează un material educațional structurat care să ajute utilizatorul să învețe eficient:

[textul este mai jos]

---

Text:
${truncatedText}

---

Structura dorită a răspunsului:

1. **Descriere pe subiecte principale** – identifică și explică pe scurt principalele idei sau teme.
2. **Glosar de termeni** – listă de termeni importanți cu explicații clare și concise.
3. **Cunoștințe necesare pentru înțelegere** – ce trebuie să știe utilizatorul dinainte.
4. **Explicații detaliate ale conceptelor cheie** – dezvoltă subiectele complexe în mod clar.
5. **Întrebări de autoevaluare** – între 3 și 7 întrebări relevante, cu răspunsuri ascunse (ex: scrie "(click pentru a vedea răspunsul)" sau similar).

Folosește un stil prietenos, clar, accesibil și organizat în secțiuni, cu titluri vizibile.
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        { role: 'system', content: 'Ești un asistent care generează materiale educaționale din documente PDF.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.4,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || 'Nu s-a putut genera conținutul.';

  const quizPrompt = `
Pe baza acestui rezumat al unui curs, creează 5 întrebări grilă. 
Fiecare întrebare trebuie să aibă 4 opțiuni și una să fie corectă.
Întrebările trebuie să acopere conceptele cheie din rezumat.

Rezumat: ${summary}

Format așteptat (JSON):
{
  "questions": [
    {
      "question": "text întrebare",
      "options": ["opțiune1", "opțiune2", "opțiune3", "opțiune4"],
      "correctAnswer": 0
    }
  ]
}
`;

  const quizCompletion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: 'Ești un profesor care creează teste grilă pentru evaluarea studenților.' },
      { role: 'user', content: quizPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 1500,
    temperature: 0.5,
  });

  let quiz: QuizQuestion[] = [];
  try {
    const quizJson = JSON.parse(quizCompletion.choices[0]?.message?.content?.trim() || '{}');
    quiz = quizJson.questions || [];
  } catch (error) {
    console.error('Eroare parsare quiz JSON:', error);
  }

    // Record usage
    await prisma.usage.create({
      data: {
        userId: user.id
      }
    });

    const fileRecord = await prisma.file.create({
      data: {
        userId: user.id,
        name: filename,
        size: file.size,
        pages: numpages,
        characters: text.length,
        summary: summary,
        quiz: quiz
      }
    });


    return new Response(
      JSON.stringify({
        summary,
        quiz,
        fileID: fileRecord.id,
        meta: {
          filename,
          pages: numpages,
          size: file.size,
          characters: text.length,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error: any) {
    console.error('Eroare procesare PDF:', error);

    let errorMessage = 'Eroare internă la procesarea documentului';
    let status = 500;

    if (error.message?.includes('Unexpected token')) {
      errorMessage = 'Format PDF neacceptat. Încercați cu un alt fișier.';
      status = 400;
    } else if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      errorMessage = 'Timp de procesare depășit. Încercați cu un fișier mai mic.';
      status = 408;
    } else if (error.status === 429) {
      errorMessage = 'Prea multe solicitări. Vă rugăm să așteptați un minut.';
      status = 429;
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Conexiune la server eșuată. Verificați internetul.';
      status = 503;
    } else if (error.message?.includes('limita lunară')) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}