import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import pdf from 'pdf-parse';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    // Verifică dacă cererea este prea mare înainte de a procesa
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Fișierul depășește limita de 10MB' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('pdf') as Blob | null;
    const filename = formData.get('filename') as string | null;
    
    if (!file || !filename) {
      return new Response(
        JSON.stringify({ error: 'Niciun fișier PDF încărcat' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verifică tipul fișierului
    if (file.type !== 'application/pdf') {
      return new Response(
        JSON.stringify({ error: 'Tip fișier invalid. Vă rugăm să încărcați doar PDF-uri.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const buffer = await file.arrayBuffer();
    
    // Verifică magic number pentru PDF
    const header = new Uint8Array(buffer, 0, 4);
    const headerHex = Array.from(header).map(b => b.toString(16).padStart(2, '0')).join('');
    if (headerHex !== '25504446') {
      return new Response(
        JSON.stringify({ error: 'Fișierul nu este un PDF valid' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Procesare PDF
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

    // Verifică dacă PDF-ul conține text
    if (!text.trim()) {
      return new Response(
        JSON.stringify({ error: 'PDF-ul conține doar imagini. Nu putem extrage text.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Trunchiere text pentru eficiență
    const maxLength = 10000;
    const truncatedText = text.length > maxLength 
      ? text.substring(0, maxLength) + '... [text trunchiat]' 
      : text;

    // Generare rezumat cu OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo-16k',
      messages: [
        {
          role: 'system',
          content: 'Generează un rezumat concis în limba documentului, păstrând informațiile cheie. Folosește paragrafe scurte.',
        },
        {
          role: 'user',
          content: `Rezumă următorul text în maxim 300 de cuvinte:\n\n${truncatedText}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.2,
    });

    const summary = completion.choices[0]?.message?.content?.trim() || 'Nu s-a putut genera rezumatul.';

    return new Response(
      JSON.stringify({
        summary,
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

    // Tratare specifică a erorilor
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
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status, headers: { 'Content-Type': 'application/json' } }
    );
  }
}