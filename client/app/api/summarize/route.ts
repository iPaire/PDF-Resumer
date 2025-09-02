import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/authOptions";
import prisma from "@/lib/prisma";
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Simple in-memory cache for similar documents (expires in 1 hour)
const summaryCache = new Map<string, { summary: string, timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

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
    const summaryLength = formData.get('summaryLength') as string | null || 'long';

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

    // Fast language detection using simple heuristics
    function detectLanguageFast(text: string): string {
      const sample = text.substring(0, 500).toLowerCase();
      
      // Romanian indicators
      if (/\b(și|cu|de|în|pe|la|pentru|din|sau|dacă|este|sunt|avea|care|acest|această)\b/.test(sample)) {
        return 'ro';
      }
      // English indicators  
      if (/\b(and|with|the|for|from|or|if|is|are|have|which|this|that)\b/.test(sample)) {
        return 'en';
      }
      // French indicators
      if (/\b(et|avec|de|dans|sur|pour|ou|si|est|sont|avoir|qui|ce|cette)\b/.test(sample)) {
        return 'fr';
      }
      // German indicators
      if (/\b(und|mit|der|die|das|in|auf|für|oder|wenn|ist|sind|haben|welche|diese)\b/.test(sample)) {
        return 'de';
      }
      // Spanish indicators
      if (/\b(y|con|de|en|por|para|o|si|es|son|tener|que|este|esta)\b/.test(sample)) {
        return 'es';
      }
      
      return 'en'; // default
    }

    // Enhanced subscription-based configuration with summary length and faster models
    const baseConfig = {
      free: {
        model: 'gpt-3.5-turbo',
        temperature: 0.1,
        sections: ['basic'],
        maxQuestions: 0
      },
      trial: {
        model: 'gpt-3.5-turbo', // Faster than 16k variant
        temperature: 0.3,
        sections: ['standard'],
        maxQuestions: 5
      },
      standard: {
        model: 'gpt-3.5-turbo', // Faster than 16k variant
        temperature: 0.3,
        sections: ['standard'],
        maxQuestions: 5
      },
      premium: {
        model: 'gpt-4o-mini',
        temperature: 0.2, // Slightly lower for faster response
        sections: ['premium'],
        maxQuestions: 12
      }
    };

    // Adjust tokens based on summary length
    let tokenMultiplier = 1;
    if (summaryLength === 'short') {
      tokenMultiplier = 0.6;
    } else if (summaryLength === 'academic') {
      tokenMultiplier = 1.5; // Academic summaries need more tokens
    }
    const subscriptionConfig = Object.fromEntries(
      Object.entries(baseConfig).map(([plan, config]) => [
        plan,
        {
          ...config,
          maxTokens: Math.floor((plan === 'free' ? 1500 : plan === 'premium' ? 3000 : 2500) * tokenMultiplier)
        }
      ])
    );

    const config = subscriptionConfig[user.subscription as keyof typeof subscriptionConfig] || subscriptionConfig.free;
    const summaryModel = config.model;
    const maxTokens = config.maxTokens;
    const temperature = config.temperature;

    // Fast language detection without API call
    const documentLanguage = detectLanguageFast(text);

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

    // Generate cache key based on content and settings
    const cacheKey = crypto
      .createHash('md5')
      .update(`${text.substring(0, 1000)}-${user.subscription}-${summaryLength}-${documentLanguage}`)
      .digest('hex');

    // Check cache first
    const cached = summaryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Cache hit - returning cached summary');
      
      // Still record usage and create records
      const [usageRecord, fileRecord, summaryRecord] = await Promise.all([
        prisma.usage.create({ data: { userId: user.id } }),
        prisma.file.create({
          data: {
            userId: user.id,
            name: filename,
            size: file.size,
            pages: numpages,
            characters: text.length,
            summary: cached.summary,
            quiz: [],
            language: documentLanguage
          }
        }),
        prisma.summary.create({
          data: {
            title: `${languageMap[documentLanguage] || 'Summary'} ${filename.substring(0, 30)}`,
            content: cached.summary,
            language: documentLanguage,
            userId: user.id,
          }
        })
      ]);

      return new Response(
        JSON.stringify({
          summary: cached.summary,
          quiz: [],
          fileID: fileRecord.id,
          meta: { filename, pages: numpages, size: file.size, characters: text.length, language: targetLanguage }
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Simplified text truncation for speed
    const maxInputChars = Math.floor(config.maxTokens * 2.5); // ~2.5 chars per token for input
    let truncatedText = text;
    
    if (text.length > maxInputChars) {
      // Find a good breaking point (paragraph or sentence)
      const breakPoint = text.lastIndexOf('\n\n', maxInputChars) || 
                        text.lastIndexOf('. ', maxInputChars) || 
                        maxInputChars;
      truncatedText = text.substring(0, breakPoint) + '...';
    }

    // Enhanced technical content extraction with better formula detection
    function extractTechnicalContent(text: string) {
      // Enhanced formula detection patterns
      const formulaPatterns = [
        /[A-Za-z_]+\s*[=≈≤≥]\s*[A-Za-z0-9\s+\-*/()^.\\frac{}]+/g,
        /\\frac\{[^}]+\}\{[^}]+\}/g,
        /[A-Za-z_]+_{[^}]+}\s*[=≈]/g,
        /[A-Za-z_]+\^{?[A-Za-z0-9]+}?\s*[=≈]/g,
        /I_[a-zA-Z]+\s*=|R_[a-zA-Z]+\s*=|U_[a-zA-Z]+\s*=/g
      ];
      
      let allFormulas: string[] = [];
      formulaPatterns.forEach(pattern => {
        const matches = text.match(pattern) || [];
        allFormulas = [...allFormulas, ...matches];
      });
      
      // Remove duplicates and limit to most important ones
      const formulas = [...new Set(allFormulas)].slice(0, 5);
      const formulaCount = formulas.length;
      
      // Count technical terms
      const technicalTerms = (text.match(/\b[A-Z][a-z]*(?:[A-Z][a-z]*)*\b/g) || []).length;
      
      return { 
        formulas, 
        formulaCount, 
        technicalTerms: Math.min(technicalTerms, 30),
        numericalValues: [] 
      };
    }
    
    // Funcție pentru îmbunătățirea formatării și structurii
    function improveFormatting(summary: string): string {
      let improved = summary;
      
      // Înlocuiește date placeholder cu date reale
      const currentDate = new Date().toLocaleDateString('ro-RO');
      improved = improved.replace(/\[data curentă\]/g, currentDate);
      improved = improved.replace(/\[data generării\]/g, currentDate);
      improved = improved.replace(/\[nume fisier\]/g, filename);
      improved = improved.replace(/\[numar pagini\]/g, numpages.toString());
      
      // Adaugă separatori pentru secțiuni mari
      improved = improved.replace(/(#{1,3}\s*\*\*[^*]+\*\*)/g, '\n\n$1');
      
      // Îmbunătățește formatarea formulelor cu detectare îmbunătățită
      improved = improved.replace(/([A-Za-z_]+\s*[=≈≤≥]\s*[A-Za-z0-9\s+\-*/()^.\\frac{}]+)/g, '\n\n**Formulă:** $1\n');
      improved = improved.replace(/(\\frac\{[^}]+\}\{[^}]+\})/g, '\n\n**Formulă:** $1\n');
      improved = improved.replace(/([A-Za-z_]+_{[^}]+}\s*[=≈])/g, '\n\n**Formulă:** $1\n');
      
      // Evidențiază valorile numerice cu unități
      improved = improved.replace(/(\d+[.,]?\d*\s*[A-Za-z%]+)/g, '**$1**');
      
      // Îmbunătățește formatarea listelor
      improved = improved.replace(/^(\s*-)(\s*)/gm, '- ');
      
      // Curăță duplicatele de spații și linii goale
      improved = improved.replace(/\n{3,}/g, '\n\n');
      improved = improved.replace(/\s+$/gm, '');
      
      return improved.trim();
    }
    
    // Funcție pentru validarea calității
    function validateSummaryQuality(summary: string, originalText: string): { score: number; issues: string[] } {
      const issues: string[] = [];
      let score = 100;
      
      // Verifică dacă conține formule (doar pentru documente tehnice)
      if (originalText.length > 1000 && /[A-Za-z]+\s*[=≈]/.test(originalText)) {
        if (!/[A-Za-z]+\s*[=≈]/.test(summary)) {
          issues.push("Lipsesc formulele matematice din original");
          score -= 20;
        }
      }
      
      // Verifică lungimea relativă - mai flexibil pentru rezumate scurte
      const minRatio = summaryLength === 'short' ? 0.05 : 0.08;
      if (summary.length < originalText.length * minRatio) {
        issues.push(`Rezumatul pare prea scurt pentru tipul ${summaryLength}`);
        score -= 15;
      }
      
      // Verifică structura - să aibă cel puțin 2 secțiuni
      const sectionCount = (summary.match(/#{1,3}|^\d+\./gm) || []).length;
      if (sectionCount < 2) {
        issues.push("Structura pare prea simplă");
        score -= 10;
      }
      
      // Verifică dacă are conținut duplicat evident
      const sentences = summary.split(/[.!?]+/);
      const duplicates = sentences.filter((sentence, index) => 
        sentence.length > 20 && sentences.indexOf(sentence) !== index
      );
      if (duplicates.length > 0) {
        issues.push("Conține conținut duplicat");
        score -= 25;
      }
      
      return { score, issues };
    }
    
    const technicalContent = extractTechnicalContent(text);
    
    // Section generation prompts based on subscription tier and length
    let wordLimit: string;
    if (summaryLength === 'short') {
      wordLimit = user.subscription === 'free' ? '800 cuvinte' : '1000 cuvinte';
    } else if (summaryLength === 'academic') {
      wordLimit = user.subscription === 'premium' ? '4000 cuvinte' : '3000 cuvinte';
    } else {
      wordLimit = user.subscription === 'free' ? '1500 cuvinte' : user.subscription === 'premium' ? '2500 cuvinte' : '2000 cuvinte';
    }

    const sectionPrompts: Record<string, string> = {
      basic: `Creează un rezumat ${summaryLength === 'short' ? 'concis' : 'detaliat'} pentru acest material tehnic (${targetLanguage}):

[TEXT]

${summaryLength === 'short' ? 'Structură simplificată:' : 'Structură:'}
1. **Introducere și Context**
   - Subiectul principal și domeniul
   - De ce este important acest subiect

2. **Concepte Fundamentale**
   - Definiții principale
   - Principii de funcționare

${summaryLength === 'short' ? '' : '3. **Exemple Practice**\n   - Aplicații concrete\n\n'}Răspunde în ${targetLanguage}. Maxim ${wordLimit}.`,

      standard: `Creează un rezumat tehnic ${summaryLength === 'short' ? 'concis dar complet' : 'detaliat'} pentru acest material (${targetLanguage}):

[TEXT]

${summaryLength === 'short' ? 'Structură optimizată:' : 'Structură:'}
1. **Introducere și Context**
   - Subiectul principal și domeniul
   - De ce este important acest subiect
   ${summaryLength === 'short' ? '' : '- Aplicații practice principale'}

2. **Concepte Fundamentale**
   - Definiții ${summaryLength === 'short' ? 'esențiale' : 'clare pentru fiecare concept principal'}
   - Principii de funcționare
   ${summaryLength === 'short' ? '' : '- Importanța în context'}

3. **${summaryLength === 'short' ? 'Formule Principale' : 'Formule și Relații Esențiale'}**
   - Ecuațiile ${summaryLength === 'short' ? 'principale' : 'complete'} (PĂSTREAZĂ EXACT din text)
   - ${summaryLength === 'short' ? 'Variabilele importante' : 'Explicația variabilelor'}  
   - Valorile numerice importante

${summaryLength === 'short' ? '' : '4. **Aplicații Practice**\n   - Metode/Concept | Aplicații | Avantaje (format tabel)\n   - Exemple concrete cu valori numerice\n\n'}${summaryLength === 'short' ? '4' : '5'}. **Întrebări de Autoevaluare**
   - Testează înțelegerea conceptelor
   ${summaryLength === 'short' ? '' : '- Include calcule cu formule\n   - Oferă răspunsuri detaliate'}

Păstrează termenii tehnici originali. Răspunde în ${targetLanguage}. Maxim ${wordLimit}.`,

      premium: `Creează un rezumat tehnic ${summaryLength === 'short' ? 'premium concis' : summaryLength === 'academic' ? 'academic premium ultra-detaliat' : 'complet premium'} pentru acest material (${targetLanguage}):

[TEXT]

Structură ${summaryLength === 'short' ? 'optimizată premium:' : summaryLength === 'academic' ? 'academică ultra-detaliată de calitate supremă:' : 'completă și detaliată:'}

## **Rezumat Tehnic ${summaryLength === 'short' ? 'Premium Concis' : summaryLength === 'academic' ? 'Academic Premium Ultra-Detaliat' : 'Complet Premium'}**

**Document:** [nume fisier]  
**Limba:** ${targetLanguage}  
**Pagini:** [numar pagini]  
**Data generării:** [data curentă]  
**Formule identificate:** ${technicalContent.formulaCount}  
**Termeni tehnici:** ${technicalContent.technicalTerms}  
**Nivel detaliu:** ${summaryLength === 'short' ? 'Premium Concis' : summaryLength === 'academic' ? 'Academic Ultra-Detaliat (Premium Maxim)' : 'Complet (Premium)'}  
${summaryLength === 'academic' ? '**Formule identificate și corectate:** [număr]\n**Termeni tehnici curățați:** [număr]\n' : ''}

### **Cuprins${summaryLength === 'short' ? ' Esențial' : summaryLength === 'academic' ? ' Detaliat Academic' : ' Detaliat'}**
${summaryLength === 'academic' ? '1. Introducere și Context Detaliat\n2. Concepte Fundamentale Avansate\n3. Dezvoltare pe Capitole Complete\n4. Glosar Tehnic Curățat\n5. Relații și Formule Esențiale Corectate\n6. Comparații și Clasificări Avansate\n7. Întrebări de Autoevaluare Avansate și Realiste' : `1. Introducere și Context ${summaryLength === 'short' ? 'Esențial' : 'Detaliat'}
2. Concepte Fundamentale ${summaryLength === 'short' ? 'Principale' : 'Avansate'}  
3. ${summaryLength === 'short' ? 'Puncte Cheie pe Capitole' : 'Dezvoltare pe Capitole Complete'}
4. Glosar Tehnic ${summaryLength === 'short' ? 'Esențial' : 'Curățat'}
5. ${summaryLength === 'short' ? 'Formule Principale' : 'Relații și Formule Esențiale Corectate'}
${summaryLength === 'short' ? '' : '6. Comparații și Clasificări Avansate\n'}${summaryLength === 'short' ? '6' : '7'}. Întrebări de Autoevaluare ${summaryLength === 'short' ? 'Focusate' : 'Avansate și Realiste'}`}

### **1. Introducere și Context ${summaryLength === 'short' ? 'Esențial' : summaryLength === 'academic' ? 'Detaliat Academic' : 'Detaliat'}**
${summaryLength === 'academic' ? `În cadrul acestui document despre [subiect], vom explora în profunzime conceptele legate de [domeniu], importanța lor în diverse aplicații industriale și academice, și [aspecte principale]. [Subiectul principal] reprezintă un element esențial în [domeniul de aplicare].

1.1 Scopul documentului
Scopul acestui document este de a oferi o analiză detaliată a [subiect principal], inclusiv principiile de funcționare, parametrii importanți, precum și tipurile și metodele utilizate.

1.2 Context teoretic  
Fundamentul științific al acestui document se bazează pe [teorii principale] și pe principiile de funcționare ale [componente/procese principale].

1.3 Importanța practică
Relevanța [subiectului] în aplicații reale este semnificativă, având un impact direct asupra [domeniilor de aplicare].` : `- Scopul documentului
- Context teoretic
- Importanța practică
${summaryLength === 'short' ? '' : '- Structură clară și detaliată pentru învățare eficientă'}`}

### **2. Concepte Fundamentale ${summaryLength === 'short' ? 'Principale' : summaryLength === 'academic' ? 'Avansate Ultra-Detaliate' : 'Avansate'}**
${summaryLength === 'academic' ? `2.1 Principii teoretice
[Descriere detaliată a principiilor de bază cu explicații complete]

2.2 Parametri critici
Parametrii esențiali includ:
- [Parametru 1]: [Descriere și formulă]
- [Parametru 2]: [Descriere și formulă]
- [Parametru 3]: [Descriere și formulă]

Formulele relevante includ:
[Formulă 1]: [Explicație detaliată]
[Formulă 2]: [Explicație detaliată]

2.3 Interrelații conceptuale
[Descriere detaliată a modului în care conceptele se interconectează]` : `- Principii teoretice cu formule matematice
- Parametri critici cu ecuații
${summaryLength === 'short' ? '' : '- Interrelații conceptuale'}`}

### **3. ${summaryLength === 'short' ? 'Puncte Cheie pe Capitole' : 'Dezvoltare pe Capitole Complete'}**
[Pentru ${summaryLength === 'short' ? 'conceptele principale' : 'fiecare capitol major'}:]
- Principiul de funcționare
- Formule matematice ${summaryLength === 'short' ? 'esențiale' : 'corectate'}
- ${summaryLength === 'short' ? 'Aplicații principale' : 'Avantaje și limitări\n- Aplicații industriale\n- Valori numerice și standarde\n- Considerații practice'}

### **4. Glosar Tehnic ${summaryLength === 'short' ? 'Esențial' : 'Curățat (fără zgomot)'}**
[Pentru ${summaryLength === 'short' ? 'termenii principali' : 'fiecare termen tehnic important - alfabetic'}]

### **5. ${summaryLength === 'short' ? 'Formule Principale' : 'Relații și Formule Esențiale (Corectate și Normalizate)'}**
[Pentru ${summaryLength === 'short' ? 'formulele principale' : 'fiecare formulă din text'} - PĂSTREAZĂ EXACT]

${summaryLength === 'short' ? '' : '### **6. Comparații și Clasificări Avansate**\n| Tip/Metodă | Avantaje | Dezavantaje | Aplicații Industriale | Costuri |\n[Tabele comparative detaliate]\n\n'}### **${summaryLength === 'short' ? '6' : '7'}. Întrebări de Autoevaluare ${summaryLength === 'short' ? 'Focusate' : 'Avansate și Realiste'}**
- ${summaryLength === 'short' ? 'Înțelegere conceptuală' : 'Problemă de calcul aplicat'}
- ${summaryLength === 'short' ? 'Aplicație practică de bază' : 'Analiză comparativă  \n- Aplicație practică\n- Interpretare de rezultate\n- Optimizare și inovație'}

Păstrează termenii tehnici originali. Folosește ${targetLanguage}. Maxim ${wordLimit}.`
    };

    // Generate sections based on subscription tier - single API call
    let summaryContent = '';

    for (const sectionType of config.sections) {
      if (sectionPrompts[sectionType]) {
        try {
          // Use only first chunk to avoid duplicates and reduce tokens
          const chunkPrompt = sectionPrompts[sectionType].replace(/\[TEXT\]/g, truncatedText);
          
          const sectionCompletion = await openai.chat.completions.create({
            model: summaryModel,
            messages: [
              { role: 'system', content: `Ești un expert tehnic specializat în generarea de materiale educaționale. Creează un rezumat ${summaryLength === 'short' ? 'concis și eficient' : 'detaliat dar structurat'}. Folosește limba ${targetLanguage}.` },
              { role: 'user', content: chunkPrompt },
            ],
            max_tokens: Math.floor(maxTokens * 0.85), // Use 85% of available tokens for response
            temperature,
          });
          
          const chunkContent = sectionCompletion.choices[0]?.message?.content?.trim() || '';
          if (chunkContent) {
            summaryContent = chunkContent;
          }

        } catch (error) {
          console.error(`Eroare generare secțiune ${sectionType}:`, error);
        }
      }
    }

    summaryContent = improveFormatting(summaryContent);

    // Cache the result for future use
    summaryCache.set(cacheKey, {
      summary: summaryContent,
      timestamp: Date.now()
    });

    // Clean old cache entries (simple cleanup)
    if (summaryCache.size > 100) {
      const entries = Array.from(summaryCache.entries());
      const now = Date.now();
      entries.forEach(([key, value]) => {
        if (now - value.timestamp > CACHE_DURATION) {
          summaryCache.delete(key);
        }
      });
    }

    let quiz: QuizQuestion[] = [];

    // Skip quiz generation for better performance - will be generated on demand
    const skipQuiz = summaryLength === 'short' || user.subscription === 'free';
    
    // Generate quiz based on subscription tier (only if not skipping)
    if (config.maxQuestions > 0 && !skipQuiz) {
      const numQuestions = config.maxQuestions;
      const quizModel = config.model;
      const quizMaxTokens = Math.floor(config.maxTokens * 0.5);

      // Enhanced quiz generation based on subscription tier
      const quizComplexity = {
        trial: 'Întrebări simple de înțelegere conceptuală',
        standard: 'Întrebări medii cu aplicații practice',
        premium: 'Întrebări complexe cu calcule și analize comparative'
      };

      const quizPrompt = `
Creează EXACT ${numQuestions} întrebări de evaluare pentru acest material tehnic (${targetLanguage}):

${summaryContent.substring(0, 2500)}

Nivel: ${quizComplexity[user.subscription as keyof typeof quizComplexity] || 'Întrebări simple'}

${user.subscription === 'premium' ? `
DISTRIBUȚIE ÎNTREBĂRI (${numQuestions} total):
- 35% Calcule numerice cu formule concrete din text: ${technicalContent.formulas.slice(0, 4).join(', ')}
- 25% Aplicații practice și studii de caz reale
- 20% Comparații detaliate între metode/tehnologii
- 15% Principii teoretice fundamentale
- 5% Interpretarea graficelor/diagramelor din text

CERINȚE SPECIALE PREMIUM:
- Fiecare întrebare să aibă explicații detaliate de minimum 2 propoziții
- Să includă calcule cu valori numerice concrete din text
- Să testeze înțelegerea profundă, nu memorarea
- Să aibă 4 opțiuni realiste de răspuns
` : user.subscription === 'standard' ? `
DISTRIBUȚIE ÎNTREBĂRI (${numQuestions} total):
- 50% Aplicarea conceptelor în practică
- 30% Înțelegerea formulelor de bază
- 20% Identificarea avantajelor/dezavantajelor
` : `
DISTRIBUȚIE ÎNTREBĂRI (${numQuestions} total):
- 70% Înțelegerea conceptelor de bază
- 30% Identificarea termenilor tehnici
`}

IMPORTANT: Returnează EXACT ${numQuestions} întrebări. Nu mai puține!

Format JSON:
{
  "questions": [
    {
      "question": "întrebarea completă cu context",
      "options": ["A) opțiunea completă", "B) opțiunea completă", "C) opțiunea completă", "D) opțiunea completă"],
      "correctAnswer": 0,
      "explanation": "explicație detaliată de minimum 2 propoziții"
    }
  ]
}
`;

      // Check if model supports JSON mode, fallback to text parsing
      const supportsJsonMode = (quizModel.includes('gpt-4-turbo') || quizModel.includes('gpt-3.5-turbo-1106') || quizModel.includes('gpt-3.5-turbo-0125') || quizModel.includes('gpt-4o-mini')) && !quizModel.includes('o1');
      
      const requestOptions: any = {
        model: quizModel,
        messages: [
          { role: 'system', content: `Ești un profesor expert care creează teste grilă de înaltă calitate. Trebuie să generezi EXACT ${numQuestions} întrebări relevante și provocatoare. Folosește limba: ${targetLanguage}.${!supportsJsonMode ? ' Răspunde strict în format JSON valid.' : ''}` },
          { role: 'user', content: quizPrompt },
        ],
        max_tokens: quizMaxTokens,
        temperature: 0.5,
      };

      // Only add response_format for models that support it
      if (supportsJsonMode) {
        requestOptions.response_format = { type: "json_object" };
      }
      
      const quizCompletion = await openai.chat.completions.create(requestOptions);

      try {
        const quizJson = JSON.parse(quizCompletion.choices[0]?.message?.content?.trim() || '{}');
        quiz = quizJson.questions || [];
      } catch (error) {
        console.error('Eroare parsare quiz JSON:', error);
      }
    }

    // Parallel database operations for better performance
    const titlePrefixes: Record<string, string> = {
      en: 'Summary',
      ro: 'Rezumat',
      fr: 'Résumé',
      de: 'Zusammenfassung',
      es: 'Resumen',
      it: 'Riassunto'
    };
    
    const titlePrefix = titlePrefixes[documentLanguage] || 'Summary';
    const summaryTitle = `${titlePrefix} ${filename.substring(0, 30)}`;

    // Execute all database operations in parallel
    const [usageRecord, fileRecord, summaryRecord] = await Promise.all([
      prisma.usage.create({
        data: {
          userId: user.id
        }
      }),
      prisma.file.create({
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
      }),
      prisma.summary.create({
        data: {
          title: summaryTitle,
          content: summaryContent,
          language: documentLanguage,
          userId: user.id,
        }
      })
    ]);

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