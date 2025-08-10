// lib/ai.ts - Librărie pentru integrarea cu API-uri AI

// Tipuri pentru diferitele tipuri de conținut generat
export type AIContentType = 'summary' | 'cheatsheet' | 'quiz';

export interface AIConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// Configurația pentru diferite providere AI
const AI_CONFIGS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4',
    maxTokens: 4000,
    temperature: 0.7
  }
};

// Funcția principală pentru generarea de conținut AI
export async function generateAIResponse(
  prompt: string, 
  type: AIContentType = 'summary',
  provider: 'openai' | 'claude' | 'local' = 'openai'
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey && provider !== 'local') {
    console.warn('No AI API key found, using fallback generation');
    return generateFallbackContent(prompt, type);
  }

  try {
    switch (provider) {
      case 'openai':
        return await generateWithOpenAI(prompt, type, apiKey);
      case 'claude':
        return await generateWithClaude(prompt, type, apiKey);
      case 'local':
        return await generateWithLocal(prompt, type);
      default:
        return generateFallbackContent(prompt, type);
    }
  } catch (error) {
    console.error(`AI generation failed for ${provider}:`, error);
    return generateFallbackContent(prompt, type);
  }
}

// Implementare pentru OpenAI
async function generateWithOpenAI(prompt: string, type: AIContentType, apiKey: string): Promise<string> {
  const systemPrompts = {
    summary: `Ești un asistent educațional expert. Creează un rezumat final comprehensiv și structurat în limba română. 
    Folosește următoarea structură:
    - Introducere cu contextul
    - Concepte fundamentale
    - Formule și relații cheie  
    - Puncte esențiale
    - Aplicații practice
    - Concluzie
    Scrie profesional și accesibil.`,
    
    cheatsheet: `Ești un expert în crearea de materiale de studiu. Creează o copiuță printabilă în format HTML cu:
    - Formule matematice clare
    - Definiții concise
    - Constante importante
    - Proceduri pas-cu-pas
    - Layout optimizat pentru print (A4)
    - Font-uri mici dar lizibile
    Folosește HTML și CSS inline pentru formatare.`,
    
    quiz: `Ești un profesor expert în evaluare. Creează 10 întrebări de tip multiple choice în română:
    - Varietate de dificultate (ușor, mediu, greu)
    - 4 opțiuni per întrebare
    - Explicații pentru răspunsul corect
    - Acoperire echilibrată a subiectului
    Returnează JSON valid cu structura: [{"question": "...", "options": [...], "correct": 0, "explanation": "..."}]`
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_CONFIGS.openai.model,
      messages: [
        {
          role: 'system',
          content: systemPrompts[type]
        },
        {
          role: 'user', 
          content: prompt
        }
      ],
      max_tokens: AI_CONFIGS.openai.maxTokens,
      temperature: AI_CONFIGS.openai.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Implementare pentru Claude (Anthropic)
async function generateWithClaude(prompt: string, type: AIContentType, apiKey: string): Promise<string> {
  const systemPrompts = {
    summary: "Creează un rezumat final comprehensiv în limba română, bine structurat și informativ.",
    cheatsheet: "Generează o copiuță printabilă în format HTML cu formule și concepte cheie.",
    quiz: "Creează un test cu 10 întrebări multiple choice în format JSON."
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: AI_CONFIGS.claude.model,
      max_tokens: AI_CONFIGS.claude.maxTokens,
      temperature: AI_CONFIGS.claude.temperature,
      system: systemPrompts[type],
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// Implementare pentru model local (Ollama)
async function generateWithLocal(prompt: string, type: AIContentType): Promise<string> {
  const systemPrompts = {
    summary: "Generate a comprehensive final summary in Romanian language.",
    cheatsheet: "Create a printable cheat sheet in HTML format with key formulas and concepts.", 
    quiz: "Create 10 multiple choice questions in JSON format."
  };

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: AI_CONFIGS.local.model,
      prompt: `${systemPrompts[type]}\n\n${prompt}`,
      stream: false,
      options: {
        temperature: AI_CONFIGS.local.temperature,
        num_predict: AI_CONFIGS.local.maxTokens
      }
    }),
  });

  if (!response.ok) {
    throw new Error(`Local AI error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.response;
}

// Generarea de fallback când AI nu funcționează
function generateFallbackContent(prompt: string, type: AIContentType): string {
  const contentLength = prompt.length;
  const currentDate = new Date().toLocaleDateString('ro-RO');
  
  switch (type) {
    case 'summary':
      return `# Rezumat Final
      
## Introducere
Acest rezumat a fost generat pe baza materialelor de curs disponibile.

## Concepte Principale
${extractFallbackConcepts(prompt)}

## Puncte Cheie
${extractFallbackKeyPoints(prompt)}

## Concluzie
Materialele analizate (${contentLength} caractere) oferă o perspectivă comprehensivă asupra subiectului studiat.

---
*Generat automat pe ${currentDate}*`;

    case 'cheatsheet':
      return `<div style="font-family: Arial; font-size: 10px; padding: 10mm;">
<h1 style="text-align: center; font-size: 14px;">Copiuță de Studiu</h1>

<h3>📐 Formule Cheie:</h3>
${extractFallbackFormulas(prompt)}

<h3>📚 Definiții:</h3>
${extractFallbackDefinitions(prompt)}

<h3>🎯 Concepte Importante:</h3>
${extractFallbackKeyTerms(prompt)}

<p style="text-align: center; font-size: 8px; margin-top: 20px;">
Generat pe ${currentDate}
</p>
</div>`;

    case 'quiz':
      return JSON.stringify(generateFallbackQuiz(prompt));
      
    default:
      return 'Conținut generat automat indisponibil.';
  }
}

// Funcții helper pentru fallback

function extractFallbackConcepts(text: string): string {
  const sentences = text.split(/[.!?]+/).slice(0, 5);
  return sentences
    .filter(s => s.length > 20)
    .map(s => `• ${s.trim()}`)
    .join('\n');
}

function extractFallbackKeyPoints(text: string): string {
  const keywords = ['important', 'esențial', 'principal', 'fundamental'];
  const sentences = text.split(/[.!?]+/);
  const keyPoints = sentences.filter(sentence => 
    keywords.some(keyword => sentence.toLowerCase().includes(keyword))
  ).slice(0, 4);
  
  return keyPoints.length > 0 
    ? keyPoints.map(s => `⭐ ${s.trim()}`).join('\n')
    : '⭐ Concepte fundamentale ale cursului';
}

function extractFallbackFormulas(text: string): string {
  const formulas = text.match(/[A-Z]\s*=\s*[^.]{5,30}/g) || [];
  return formulas.length > 0
    ? formulas.slice(0, 5).map(f => `<div>• ${f}</div>`).join('')
    : '<div>• Formule specifice domeniului</div>';
}

function extractFallbackDefinitions(text: string): string {
  const definitions = text.match(/([A-Z][a-z]+)\s+(este|reprezintă)\s+[^.]{10,50}/g) || [];
  return definitions.length > 0
    ? definitions.slice(0, 4).map(d => `<div>• ${d}</div>`).join('')
    : '<div>• Definiții importante ale cursului</div>';
}

function extractFallbackKeyTerms(text: string): string {
  const terms = text.match(/\b[A-Z][a-z]{3,15}\b/g) || [];
  const uniqueTerms = [...new Set(terms)].slice(0, 8);
  return uniqueTerms.length > 0
    ? uniqueTerms.map(t => `<div>• ${t}</div>`).join('')
    : '<div>• Termeni cheie din curs</div>';
}

function generateFallbackQuiz(text: string): any[] {
  const baseQuestions = [
    {
      question: "Care este unul dintre conceptele principale studiate în curs?",
      options: [
        "Conceptele fundamentale",
        "Noțiuni secundare", 
        "Aspecte irelevante",
        "Informații suplimentare"
      ],
      correct: 0,
      explanation: "Conceptele fundamentale reprezintă baza cursului studiat."
    },
    {
      question: "Cum se aplică principiile învățate în practică?",
      options: [
        "Nu se aplică",
        "Prin exerciții practice", 
        "Doar teoretic",
        "În alte domenii"
      ],
      correct: 1,
      explanation: "Principiile se consolidează prin exerciții practice."
    }
  ];
  
  // Adaugă mai multe întrebări generice până la 10
  while (baseQuestions.length < 10) {
    baseQuestions.push({
      question: `Întrebarea ${baseQuestions.length + 1} despre materialul studiat:`,
      options: [
        "Prima opțiune",
        "A doua opțiune",
        "A treia opțiune", 
        "A patra opțiune"
      ],
      correct: Math.floor(Math.random() * 4),
      explanation: "Explicație generată automat pentru această întrebare."
    });
  }
  
  return baseQuestions;
}

// Funcții de utilitate pentru debugging și monitoring

export function getAIProviderStatus(): Record<string, boolean> {
  return {
    openai: !!process.env.OPENAI_API_KEY,
    claude: !!process.env.ANTHROPIC_API_KEY,
    local: true // Presupunem că este disponibil local
  };
}

export function estimateTokenCount(text: string): number {
  // Estimare aproximativă: ~4 caractere = 1 token
  return Math.ceil(text.length / 4);
}

export function validateAIResponse(response: string, type: AIContentType): boolean {
  if (!response || response.trim().length === 0) {
    return false;
  }

  switch (type) {
    case 'summary':
      return response.length > 100 && response.includes('#');
    
    case 'cheatsheet':
      return response.includes('<div') && response.includes('</div>');
    
    case 'quiz':
      try {
        const parsed = JSON.parse(response);
        return Array.isArray(parsed) && 
               parsed.length > 0 && 
               parsed[0].hasOwnProperty('question') &&
               parsed[0].hasOwnProperty('options') &&
               parsed[0].hasOwnProperty('correct');
      } catch {
        return false;
      }
    
    default:
      return true;
  }
}

// Rate limiting pentru API-urile AI
class AIRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits = {
    openai: { requests: 60, window: 60000 }, // 60 requests per minute
    claude: { requests: 50, window: 60000 }, // 50 requests per minute
    local: { requests: 1000, window: 60000 } // Higher limit for local
  };

  canMakeRequest(provider: keyof typeof this.limits): boolean {
    const now = Date.now();
    const limit = this.limits[provider];
    
    if (!this.requests.has(provider)) {
      this.requests.set(provider, []);
    }
    
    const requests = this.requests.get(provider)!;
    
    // Remove old requests outside the window
    const recentRequests = requests.filter(time => now - time < limit.window);
    this.requests.set(provider, recentRequests);
    
    return recentRequests.length < limit.requests;
  }

  recordRequest(provider: keyof typeof this.limits): void {
    const now = Date.now();
    if (!this.requests.has(provider)) {
      this.requests.set(provider, []);
    }
    this.requests.get(provider)!.push(now);
  }
}

const rateLimiter = new AIRateLimiter();

// Enhanced AI generation with rate limiting and retries
export async function generateAIResponseWithRetry(
  prompt: string,
  type: AIContentType = 'summary',
  provider: 'openai' | 'claude' | 'local' = 'openai',
  maxRetries: number = 3
): Promise<string> {
  if (!rateLimiter.canMakeRequest(provider)) {
    console.warn(`Rate limit exceeded for ${provider}, using fallback`);
    return generateFallbackContent(prompt, type);
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      rateLimiter.recordRequest(provider);
      const response = await generateAIResponse(prompt, type, provider);
      
      if (validateAIResponse(response, type)) {
        return response;
      } else {
        console.warn(`Invalid AI response on attempt ${attempt} for ${provider}`);
      }
    } catch (error) {
      console.error(`AI generation attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        return generateFallbackContent(prompt, type);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return generateFallbackContent(prompt, type);
}

// Specialized functions for each content type with optimized prompts

export async function generateOptimizedSummary(
  courseTitle: string,
  combinedContent: string,
  moduleCount: number
): Promise<string> {
  const optimizedPrompt = `
INSTRUCȚIUNI PENTRU REZUMAT FINAL:
Creează un rezumat final comprehensiv pentru cursul "${courseTitle}" pe baza a ${moduleCount} module.

STRUCTURA OBLIGATORIE:
1. **Prezentare Generală** - Context și obiective
2. **Structura Cursului** - Prezentarea modulelor  
3. **Concepte Fundamentale** - Teorii și principii de bază
4. **Formule și Relații Cheie** - Aspecte matematice/tehnice
5. **Puncte Esențiale** - Informații critice
6. **Aplicații Practice** - Exemple și cazuri de studiu
7. **Concluzie** - Sinteză și recomandări

CERINȚE:
- Limba română academică
- Maxim 2000 cuvinte
- Utilizează bullet points și numerotări
- Evidențiază conceptele cheie cu **bold**
- Include formule în format LaTeX unde este cazul

CONȚINUT DE ANALIZAT:
${combinedContent.slice(0, 8000)} // Limitează pentru a nu depăși token limit
`;

  return await generateAIResponseWithRetry(optimizedPrompt, 'summary');
}

export async function generateOptimizedCheatSheet(
  courseTitle: string,
  finalSummary: string
): Promise<string> {
  const optimizedPrompt = `
INSTRUCȚIUNI PENTRU COPIUȚĂ:
Creează o copiuță printabilă pe format A4 pentru "${courseTitle}".

CERINȚE TEHNICE:
- Format HTML cu CSS inline
- Font: 8-10px pentru conținut, 12px pentru titluri
- Layout în 2-3 coloane
- Margini: 10mm pe toate părțile
- Printable pe o singură foaie A4

SECȚIUNI OBLIGATORII:
1. **Header** - Titlu curs + dată
2. **Formule Cheie** - Maxim 15 formule esențiale
3. **Definiții** - Maxim 10 definiții concise
4. **Constante** - Valori numerice importante  
5. **Proceduri** - Pași algoritmi
6. **Diagrame** - Spații pentru schițe
7. **Footer** - Spațiu notițe

STIL CSS:
- Folosește grid layout
- Border-uri pentru separare
- Background-uri ușoare pentru secțiuni
- Optimizat pentru print (@media print)

SURSA:
${finalSummary.slice(0, 6000)}
`;

  return await generateAIResponseWithRetry(optimizedPrompt, 'cheatsheet');
}

export async function generateOptimizedQuiz(
  courseTitle: string,
  combinedContent: string,
  difficulty: 'mixed' | 'beginner' | 'intermediate' | 'advanced' = 'mixed'
): Promise<any[]> {
  const difficultyInstructions = {
    mixed: 'Amestec de dificultăți: 3 ușoare, 4 medii, 3 grele',
    beginner: 'Toate întrebările să fie de nivel începător',
    intermediate: 'Toate întrebările să fie de nivel intermediar', 
    advanced: 'Toate întrebările să fie de nivel avansat'
  };

  const optimizedPrompt = `
INSTRUCȚIUNI PENTRU QUIZ:
Creează un quiz de 10 întrebări pentru "${courseTitle}".

DISTRIBUȚIA ÎNTREBĂRILOR:
- ${difficultyInstructions[difficulty]}
- 3 întrebări despre definiții/concepte
- 2 întrebări despre formule/calcule
- 3 întrebări despre aplicații practice
- 2 întrebări despre proceduri/metode

FORMAT JSON OBLIGATORIU:
[
  {
    "question": "Textul întrebării în română",
    "options": ["Opțiunea A", "Opțiunea B", "Opțiunea C", "Opțiunea D"],
    "correct": 0,
    "explanation": "Explicația detaliată a răspunsului corect",
    "difficulty": "easy|medium|hard",
    "topic": "categoria întrebării"
  }
]

CERINȚE CALITATE:
- Întrebări clare și precise
- Opțiuni plausibile (nu evident greșite)
- Explicații educative
- Acoperire echilibrată a cursului
- Evită ambiguități

CONȚINUT SURSĂ:
${combinedContent.slice(0, 7000)}
`;

  const response = await generateAIResponseWithRetry(optimizedPrompt, 'quiz');
  
  try {
    return JSON.parse(response);
  } catch (error) {
    console.error('Failed to parse quiz JSON, using fallback');
    return generateFallbackQuiz(combinedContent);
  }
}

// Analytics și monitoring pentru utilizarea AI
export class AIUsageTracker {
  private static instance: AIUsageTracker;
  private usage: Map<string, { requests: number, tokens: number, costs: number }> = new Map();

  static getInstance(): AIUsageTracker {
    if (!AIUsageTracker.instance) {
      AIUsageTracker.instance = new AIUsageTracker();
    }
    return AIUsageTracker.instance;
  }

  trackUsage(
    provider: string, 
    contentType: AIContentType, 
    inputTokens: number, 
    outputTokens: number
  ): void {
    const key = `${provider}-${contentType}`;
    const existing = this.usage.get(key) || { requests: 0, tokens: 0, costs: 0 };
    
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(provider, totalTokens);
    
    this.usage.set(key, {
      requests: existing.requests + 1,
      tokens: existing.tokens + totalTokens,
      costs: existing.costs + estimatedCost
    });
  }

  private calculateCost(provider: string, tokens: number): number {
    const rates = {
      'openai': 0.03 / 1000,    // $0.03 per 1k tokens (approximate)
      'claude': 0.025 / 1000,   // $0.025 per 1k tokens (approximate) 
      'local': 0                // Free for local models
    };
    
    return (rates[provider as keyof typeof rates] || 0) * tokens;
  }

  getUsageReport(): Record<string, any> {
    const report: Record<string, any> = {};
    
    this.usage.forEach((data, key) => {
      report[key] = {
        requests: data.requests,
        tokens: data.tokens,
        estimatedCost: `${data.costs.toFixed(4)}`,
        avgTokensPerRequest: Math.round(data.tokens / data.requests)
      };
    });
    
    return report;
  }

  getTotalCosts(): number {
    let total = 0;
    this.usage.forEach(data => total += data.costs);
    return total;
  }
}

// Export pentru utilizare în aplicație
export const aiTracker = AIUsageTracker.getInstance();