import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";

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
      trial: 10,
      standard: 25,
      premium: 50
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

    // Determine AI model based on subscription
    const isPremium = user.subscription === 'premium';
    const summaryModel = isPremium ? 'gpt-3.5-turbo-16k' : 'gpt-3.5-turbo-16k';
    const maxTokens = isPremium ? 4000 : 3000;
    const temperature = isPremium ? 0.5 : 0.4;

    // Detect document language
    const languageDetectionPrompt = `
Identifică limba acestui text. Răspunde doar cu codul ISO 639-1 al limbii (ex: "en", "ro", "fr").
Text: ${text.substring(0, 500)}...
    `;

    const languageResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Ești un expert în identificarea limbilor.' },
        { role: 'user', content: languageDetectionPrompt },
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const documentLanguage = languageResponse.choices[0]?.message?.content?.trim() || 'en';

    // Map language to full name for prompts
    const languageMap: Record<string, string> = {
      en: 'engleză',
      ro: 'română',
      fr: 'franceză',
      de: 'germană',
      es: 'spaniolă',
      it: 'italiană'
    };

    const targetLanguage = languageMap[documentLanguage] || 'engleză';

    // Generate summary with language adaptation
    const maxLength = 10000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '... [text trunchiat]' 
      : text;

    // PROMPT ACTUALIZAT: Folosim limba detectată
    let prompt = `
Pe baza următorului text (scris în ${targetLanguage}), generează un material educațional structurat care să ajute utilizatorul să învețe eficient:

[textul este mai jos]

---

Text:
${truncatedText}

---

Structura dorită a răspunsului (în ${targetLanguage}):

1. Descriere pe subiecte principale – identifică și explică pe scurt principalele idei sau teme.
2. Glosar de termeni – listă de termeni importanți cu explicații clare și concise.
3. Cunoștințe necesare pentru înțelegere – ce trebuie să știe utilizatorul dinainte.
4. Explicații detaliate ale conceptelor cheie – dezvoltă subiectele complexe în mod clar.
`;

    prompt += `
${isPremium ? '8' : '5'}. **Întrebări de autoevaluare** – între 3 și ${isPremium ? '7' : '5'} întrebări relevante, cu răspunsuri ascunse (ex: scrie "(click pentru a vedea răspunsul)" sau similar).

Folosește un stil prietenos, clar, accesibil și organizat în secțiuni, cu titluri vizibile. Folosește aceeași limbă ca textul sursă (${targetLanguage}).
`
   if (isPremium) {
      prompt += `
  tratează toate subiectele cu mai multă profunzime, oferind descrieri complete, exemple detaliate, clarificări suplimentare și conexiuni între concepte. Nu te limita la răspunsuri scurte.

    `;
   }
    const completion = await openai.chat.completions.create({
      model: summaryModel,
      messages: [
        { role: 'system', content: 'Ești un asistent care generează materiale educaționale din documente PDF. Folosește aceeași limbă ca documentul sursă.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: maxTokens,
      temperature,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || 'Nu s-a putut genera conținutul.';
     const summaryContent = completion.choices[0]?.message?.content?.trim() || 'Nu s-a putut genera conținutul.';

    let quiz: QuizQuestion[] = [];

    // Generate quiz ONLY for non-free users
    const isFreeUser = user.subscription === 'free';
    if (!isFreeUser) {
      // Determine number of questions based on subscription
      const numQuestions = user.subscription === 'premium' ? 20 : 5;
      const quizModel = user.subscription === 'premium' ? 'gpt-3.5-turbo' : 'gpt-3.5-turbo';
      const quizMaxTokens = user.subscription === 'premium' ? 3000 : 1500;

      // PROMPT ACTUALIZAT pentru quiz - specifică limba
      const quizPrompt = `
Pe baza acestui rezumat (scris în ${targetLanguage}), creează ${numQuestions} întrebări grilă. 
Fiecare întrebare trebuie să aibă 4 opțiuni și una să fie corectă.
Întrebările trebuie să acopere conceptele cheie din rezumat.
Generați întrebările în aceeași limbă ca rezumatul (${targetLanguage}).

${user.subscription === 'premium' ? `
Pentru utilizatorii premium:
- Include întrebări complexe care necesită analiză
- Adaugă întrebări de tip "aplicație practică"
- Variantele de răspuns să includă și răspunsuri parțial corecte
` : ''}

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
        model: quizModel,
        messages: [
          { role: 'system', content: `Ești un profesor care creează teste grilă. Folosește limba: ${targetLanguage}` },
          { role: 'user', content: quizPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: quizMaxTokens,
        temperature: 0.5,
      });

      try {
        const quizJson = JSON.parse(quizCompletion.choices[0]?.message?.content?.trim() || '{}');
        quiz = quizJson.questions || [];
      } catch (error) {
        console.error('Eroare parsare quiz JSON:', error);
      }
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
        summary: summaryContent,
        quiz: quiz,
        language: documentLanguage
      }
    });
    const summaryTitle = `Rezumat ${filename.substring(0, 30)}`;
    await prisma.summary.create({
      data: {
        title: summaryTitle,
        content: summaryContent,
        userId: user.id,
      }
    });

    return new Response(
      JSON.stringify({
        summary: summaryContent,
        quiz,
        fileID: fileRecord.id,
        meta: {
          filename,
          pages: numpages,
          size: file.size,
          characters: text.length,
          language: targetLanguage
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