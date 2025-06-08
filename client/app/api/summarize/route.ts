// app/api/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import OpenAI from 'openai';

export const config = {
  runtime: 'nodejs', // important pentru a avea acces la variabile de mediu și Node.js API
};

// In-memory rate limiter (5 requests/min/IP)
const rateLimiter = new Map<string, number>();
const windowSize = 60 * 1000; // 1 minut
const maxRequests = 5;

// Configurare OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  // Rate limiting
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

  const current = Date.now();
  const lastRequest = rateLimiter.get(ip) || 0;

  if (current - lastRequest < windowSize / maxRequests) {
    return NextResponse.json(
      {
        error: 'Prea multe solicitări. Încercați din nou în câteva secunde.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': `${Math.ceil((windowSize - (current - lastRequest)) / 1000)}`,
        },
      }
    );
  }

  rateLimiter.set(ip, current);

  try {
    const formData = await request.formData();
    const file = formData.get('pdf') as Blob | null;
    const filename = formData.get('filename') as string | null;
    const size = formData.get('size') as string | null;

    if (!file || !filename) {
      return NextResponse.json({ error: 'Niciun fișier PDF încărcat' }, { status: 400 });
    }

    const fileSize = size ? parseInt(size) : 0;
    if (fileSize > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Fișierul depășește limita de 10MB' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await pdf(buffer);
    const text = data.text;

    // Trunchiere text dacă e prea lung
    const maxLength = 12000;
    const truncatedText =
      text.length > maxLength ? text.substring(0, maxLength) + '... [text trunchiat]' : text;

    // Cerere către OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that summarizes academic documents. Keep the summary concise and preserve the original language of the input. Structure it into short paragraphs.',
        },
        {
          role: 'user',
          content: `Summarize the following text in no more than 300 words, maintaining key information and using the same language as the original:\n\n${truncatedText}`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    });

    const summary = completion.choices?.[0]?.message?.content?.trim() || 'Nu s-a putut genera rezumatul.';

    return NextResponse.json({
      summary,
      meta: {
        filename,
        pages: data.numpages,
        size: fileSize,
        characters: text.length,
      },
    });
  } catch (error: any) {
    console.error('Eroare procesare PDF:', error);

    if (error.message?.includes('Unexpected token')) {
      return NextResponse.json(
        { error: 'Format PDF neacceptat. Încercați cu un alt fișier.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Eroare internă la procesarea documentului' },
      { status: 500 }
    );
  }
}
