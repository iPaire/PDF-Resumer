// lib/ai.ts
// Adăugăm o funcție pentru a combina rezumatele
export const combineSummaries = (summaries: any[]) => {
  return summaries
    .map(s => `## ${new Date(s.createdAt).toLocaleDateString('ro-RO')}\n\n${s.content}`)
    .join('\n\n')
}

// Actualizăm funcția de generare a răspunsului AI
export const generateAIResponse = async (prompt: string) => {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [{
          role: 'system',
          content: 'Ești un asistent specializat în crearea de rezumate academice. Ai abilități excelente de sinteză și poți organiza informația în mod coerent și structurat.'
        }, {
          role: 'user',
          content: prompt
        }],
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    const data = await response.json()
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim()
    }
    
    throw new Error('Nu s-a putut genera rezumatul')
  } catch (error) {
    console.error('AI API error:', error)
    throw new Error('Eroare la generarea rezumatului')
  }
}