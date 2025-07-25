// lib/ai.ts
export const combineSummaries = (summaries: any[]) => {
  return summaries
    .map(s => `## ${s.name}\n\n${s.content}`)
    .join('\n\n')
}

export const generateAIResponse = async (prompt: string) => {
  // Implementați logica pentru a trimite prompt-ul către un serviciu AI
  // (de ex. OpenAI API, Hugging Face, etc.)
  
  // Exemplu simplificat:
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000
    })
  })

  const data = await response.json()
  return data.choices[0].message.content.trim()
}