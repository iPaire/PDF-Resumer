// AI helper functions for cheat sheet generation

// AI Prompt generation functions
export function getFormulaGenerationPrompt(courseTitle: string, content: string, language: string): string {
  const contentSnippet = content.substring(0, 2000); // Limit to save tokens
  
  const prompts = {
    'ro': `Analizând cursul "${courseTitle}" și conținutul de mai jos, generează 8-10 formule matematice/științifice relevante și importante pentru acest subiect.

Conținut: ${contentSnippet}

Instrucțiuni:
- Creează formule care sunt ESENȚIALE pentru acest subiect chiar dacă nu apar explicit în text
- Folosește notația matematică standard
- Fiecare formulă pe o linie separată
- Format: [variable] = [expression]
- Doar formulele, fără explicații
- Maxim 50 caractere per formulă

Exemplu pentru fizică:
F = ma
E = mc²
v = d/t`,
    'en': `Analyzing the course "${courseTitle}" and content below, generate 8-10 relevant and important mathematical/scientific formulas for this subject.

Content: ${contentSnippet}

Instructions:
- Create formulas that are ESSENTIAL for this subject even if not explicitly mentioned in text
- Use standard mathematical notation
- Each formula on separate line
- Format: [variable] = [expression]
- Only formulas, no explanations
- Max 50 characters per formula

Example for physics:
F = ma
E = mc²
v = d/t`
  };
  
  return prompts[language as keyof typeof prompts] || prompts['en'];
}

export function getDefinitionsGenerationPrompt(courseTitle: string, content: string, language: string): string {
  const contentSnippet = content.substring(0, 2000);
  
  const prompts = {
    'ro': `Pentru cursul "${courseTitle}" și conținutul de mai jos, generează 8 definiții scurte pentru termenii cei mai importanți.

Conținut: ${contentSnippet}

Instrucțiuni:
- Identifică termenii cheie ESENȚIALI pentru acest subiect
- Definițiile să fie de maxim 60 caractere
- Format: Termen: Definiție
- Un termen per linie
- Termenii să fie relevanți chiar dacă nu apar exact în text

Exemplu:
Accelerația: Rata de schimbare a vitezei în timp
Forța: Cauza care modifică starea de mișcare`,
    'en': `For the course "${courseTitle}" and content below, generate 8 concise definitions for the most important terms.

Content: ${contentSnippet}

Instructions:
- Identify ESSENTIAL key terms for this subject
- Definitions max 60 characters
- Format: Term: Definition
- One term per line
- Terms should be relevant even if not appearing exactly in text

Example:
Acceleration: Rate of change of velocity over time
Force: Cause that changes motion state`
  };
  
  return prompts[language as keyof typeof prompts] || prompts['en'];
}

// Parse AI responses
export function parseFormulasFromAIResponse(response: string): string[] {
  const formulas: string[] = [];
  const lines = response.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const trimmed = line.trim();
    // Look for formula patterns: variable = expression
    if (/^[A-Za-z][\w\s]*\s*=\s*.+/.test(trimmed) && trimmed.length < 60) {
      formulas.push(trimmed);
    }
  });
  
  return formulas.slice(0, 10);
}

export function parseDefinitionsFromAIResponse(response: string): Array<{term: string, definition: string}> {
  const definitions: Array<{term: string, definition: string}> = [];
  const lines = response.split('\n').filter(line => line.trim());
  
  lines.forEach(line => {
    const match = line.match(/^([^:]+):\s*(.+)$/);
    if (match) {
      const term = match[1].trim();
      const definition = match[2].trim();
      
      if (term.length > 2 && term.length < 40 && definition.length > 5 && definition.length < 80) {
        definitions.push({ term, definition });
      }
    }
  });
  
  return definitions.slice(0, 8);
}

// AI-powered formula generation
export async function generateRelevantFormulas(courseTitle: string, content: string, language: string): Promise<string[]> {
  const prompt = getFormulaGenerationPrompt(courseTitle, content, language);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 800
      })
    });
    
    const data = await response.json();
    const formulasText = data.choices[0]?.message?.content || '';
    
    // Parse formulas from response
    return parseFormulasFromAIResponse(formulasText);
  } catch (error) {
    console.error('Error generating formulas:', error);
    return [];
  }
}

// AI-powered key definitions generation
export async function generateKeyDefinitions(courseTitle: string, content: string, language: string): Promise<Array<{term: string, definition: string}>> {
  const prompt = getDefinitionsGenerationPrompt(courseTitle, content, language);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    const definitionsText = data.choices[0]?.message?.content || '';
    
    // Parse definitions from response
    return parseDefinitionsFromAIResponse(definitionsText);
  } catch (error) {
    console.error('Error generating definitions:', error);
    return [];
  }
}