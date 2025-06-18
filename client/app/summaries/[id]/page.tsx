'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Download, ArrowLeft, Printer, Trash2 } from 'react-feather';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

type Summary = {
  id: string;
  name: string;
  createdAt: string;
  size: string;
  pages: number;
  characters: number;
  summary: string;
  language: string;
  isPremium: boolean;
};

// Funcție îmbunătățită pentru formatarea Markdown
const formatMarkdownSpacing = (text: string) => {
  // Adaugă 2 newline-uri înainte de titluri
  let formatted = text.replace(/(?<=\n)(#+\s?.*)/g, '\n\n$1');
  
  // Adaugă spațiere după titlurile de secțiuni
  formatted = formatted.replace(/(## \d+\.\s+[^\n]+)([^\n])/g, '$1\n\n$2');
  
  // Adaugă newline după fiecare bloc de cod
  formatted = formatted.replace(/(```[\s\S]*?```)(?=\S)/g, '$1\n\n');
  
  // Adaugă spațiere între paragrafe
  formatted = formatted.replace(/(?<=\S)\n(?=\S)/g, '\n\n');
  
  return formatted;
};

// Funcție optimizată pentru parsarea conținutului premium
const parsePremiumContent = (content: string) => {
  const sectionTitles = [
    "1. Descriere pe subiecte principale",
    "2. Glosar de termeni",
    "3. Cunoștințe necesare pentru înțelegere",
    "4. Explicații detaliate ale conceptelor cheie",
    "5. Diagrame conceptuale",
    "6. Studii de caz/exemple practice",
    "7. Resurse recomandate",
    "8. Întrebări de autoevaluare"
  ];

  const sections: Record<string, string> = {};
  const lines = content.split('\n');
  let currentSection = "";
  let currentContent = "";

  for (const line of lines) {
    // Verifică dacă linia conține un titlu de secțiune
    const titleMatch = sectionTitles.find(title => 
      line.includes(`## ${title}`) || 
      line.includes(title)
    );
    
    if (titleMatch) {
      if (currentSection) {
        sections[currentSection] = currentContent.trim();
      }
      currentSection = titleMatch;
      currentContent = "";
    } else if (currentSection) {
      currentContent += line + '\n';
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.trim();
  }

  // Completează secțiunile lipsă
  sectionTitles.forEach(title => {
    if (!sections[title]) {
      sections[title] = "Conținutul nu este disponibil momentan";
    }
  });

  return sections;
};

export default function SummaryDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (session) {
      fetchSummary();
    } else {
      setIsLoading(false);
      setError('Trebuie să fii autentificat pentru a vizualiza acest rezumat.');
    }
  }, [session, params.id]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/summaries/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        // Aplică formatarea avansată Markdown
        data.summary = formatMarkdownSpacing(data.summary);
        setSummary(data);
      } else {
        setError(data.error || 'Eroare la încărcarea rezumatului');
      }
    } catch (error) {
      setError('Eroare de conexiune');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!summary) return;
    
    try {
      const response = await fetch(`/api/summaries/${params.id}/download`);
      if (!response.ok) throw new Error('Descărcarea rezumatului a eșuat');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.name.replace('.pdf', '')}_summary.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Eroare descărcare:', error);
      alert('Nu s-a putut descărca rezumatul');
    }
  };

  const handleDelete = async () => {
    if (!summary) return;
    
    if (!confirm('Sigur doriți să ștergeți acest rezumat? Această acțiune este permanentă.')) {
      return;
    }

    try {
      const response = await fetch(`/api/summaries/${params.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Rezumat șters cu succes!');
        router.push('/summaries');
      } else {
        const errorData = await response.json();
        alert(`Eroare ștergere: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Eroare ștergere:', error);
      alert('A apărut o eroare la ștergerea rezumatului');
    }
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Funcție pentru procesarea întrebărilor de autoevaluare
  const parseAssessmentQuestions = (content: string) => {
    const questions = [];
    const lines = content.split('\n');
    let currentQuestion = null;

    for (const line of lines) {
      const questionMatch = line.match(/^(\d+\.)\s*(.+)/);
      
      if (questionMatch) {
        // Salvează întrebarea anterioară dacă există
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        currentQuestion = {
          number: questionMatch[1],
          question: questionMatch[2].trim(),
          answer: ""
        };
      } else if (currentQuestion && line.trim().startsWith("- Răspuns:")) {
        // Extrage răspunsul
        currentQuestion.answer = line.replace("- Răspuns:", "").trim();
      } else if (currentQuestion) {
        // Adaugă la întrebarea curentă dacă nu e răspuns
        currentQuestion.question += " " + line.trim();
      }
    }

    // Adaugă ultima întrebare
    if (currentQuestion) {
      questions.push(currentQuestion);
    }

    return questions;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă rezumatul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-red-500 font-medium mb-4">{error}</div>
          <button
            onClick={() => router.push('/summaries')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la rezumate
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-gray-900 font-medium mb-4">Rezumatul nu a fost găsit.</div>
          <button
            onClick={() => router.push('/summaries')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la rezumate
          </button>
        </div>
      </div>
    );
  }

  const lang = summary.language || 'ro';
  
  // Detectare îmbunătățită a conținutului premium
  const hasPremiumStructure = 
    /## 5\. Diagrame conceptuale/.test(summary.summary) || 
    /5\. Diagrame conceptuale/.test(summary.summary);
  
  const isPremium = summary.isPremium && hasPremiumStructure;
  
  const sections = isPremium ? parsePremiumContent(summary.summary) : null;
  const assessmentQuestions = sections?.["8. Întrebări de autoevaluare"] 
    ? parseAssessmentQuestions(sections["8. Întrebări de autoevaluare"])
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/summaries" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            {lang === 'ro' ? 'Înapoi la rezumate' : 'Back to summaries'}
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{summary.name}</h1>
              <p className="mt-2 text-gray-600">
                {lang === 'ro' ? 'Generat pe' : 'Generated on'} {new Date(summary.createdAt).toLocaleDateString(lang === 'ro' ? 'ro-RO' : 'en-US')} • 
                {summary.pages} {lang === 'ro' ? 'pagini' : 'pages'} • {summary.characters.toLocaleString()} {lang === 'ro' ? 'caractere' : 'characters'}
                {isPremium && <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">PREMIUM</span>}
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                title={lang === 'ro' ? 'Printează' : 'Print'}
              >
                <Printer className="h-4 w-4" />
              </button>
              
              <button
                onClick={handleDelete}
                className="flex items-center px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                title={lang === 'ro' ? 'Șterge' : 'Delete'}
              >
                <Trash2 className="h-4 w-4" />
              </button>
              
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download className="mr-1 h-4 w-4" />
                {lang === 'ro' ? 'Descarcă' : 'Download'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="prose max-w-none">
              {isPremium && sections ? (
                <>
                  {/* Secțiuni standard */}
                  {Object.entries(sections).filter(([title]) => title !== "8. Întrebări de autoevaluare").map(([title, content], index) => (
                    <div 
                      key={index} 
                      className={`mb-8 ${
                        title.includes("Diagrame") ? "bg-blue-50 p-4 rounded-lg border border-blue-200" :
                        title.includes("Studii") ? "bg-green-50 p-4 rounded-lg border border-green-200" :
                        title.includes("Resurse") ? "bg-yellow-50 p-4 rounded-lg border border-yellow-200" : ""
                      }`}
                    >
                      <h2 className="text-2xl font-bold mb-4 border-b pb-2">{title}</h2>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]} 
                        rehypePlugins={title.includes("Explicații") ? [rehypeRaw] : undefined}
                        components={{
                          code({ node, className, children, ...props }) {
                            const isInline = !className;
                            return isInline ? (
                              <code 
                                className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-sm"
                                {...props}
                              >
                                {children}
                              </code>
                            ) : (
                              <code 
                                className={`${className} bg-gray-100 block p-4 rounded-md overflow-x-auto font-mono text-sm`}
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          a({ node, href, children, ...props }) {
                            return (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          }
                        }}
                      >
                        {content}
                      </ReactMarkdown>
                    </div>
                  ))}

                  {/* Secțiunea specială pentru întrebări */}
                  {assessmentQuestions.length > 0 && (
                    <div className="mt-10 pt-6 border-t border-gray-200">
                      <h2 className="text-2xl font-bold mb-4">8. Întrebări de autoevaluare</h2>
                      <div className="space-y-6">
                        {assessmentQuestions.map((q, index) => (
                          <div key={index} className="p-4 bg-white rounded-lg border border-gray-200">
                            <div className="font-medium text-gray-800 cursor-pointer" 
                                 onClick={() => toggleAnswer(index)}>
                              <span className="text-blue-600">{q.number}</span> {q.question}
                              <span className="ml-2 text-blue-600 text-sm">
                                ({revealedAnswers[index] ? 'Ascunde răspunsul' : 'Arată răspunsul'})
                              </span>
                            </div>
                            
                            {revealedAnswers[index] && q.answer && (
                              <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
                                <strong className="text-blue-700 block mb-2">Răspuns:</strong>
                                <div className="text-gray-700">{q.answer}</div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]} 
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1({ node, children, ...props }) {
                      return <h1 className="text-3xl font-bold mt-8 mb-4 border-b pb-2" {...props}>{children}</h1>;
                    },
                    h2({ node, children, ...props }) {
                      return <h2 className="text-2xl font-bold mt-6 mb-3 border-b pb-1" {...props}>{children}</h2>;
                    },
                    h3({ node, children, ...props }) {
                      return <h3 className="text-xl font-bold mt-4 mb-2" {...props}>{children}</h3>;
                    },
                    h4({ node, children, ...props }) {
                      return <h4 className="text-lg font-semibold mt-3 mb-1" {...props}>{children}</h4>;
                    },
                    p({ node, children, ...props }) {
                      return <p className="mb-4 text-gray-700 leading-relaxed" {...props}>{children}</p>;
                    },
                    ul({ node, children, ...props }) {
                      return <ul className="list-disc pl-6 mb-4 space-y-1" {...props}>{children}</ul>;
                    },
                    ol({ node, children, ...props }) {
                      return <ol className="list-decimal pl-6 mb-4 space-y-1" {...props}>{children}</ol>;
                    },
                    li({ node, children, ...props }) {
                      return <li className="mb-1" {...props}>{children}</li>;
                    },
                    code({ node, className, children, ...props }) {
                      const isInline = !className;
                      return isInline ? (
                        <code 
                          className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-sm"
                          {...props}
                        >
                          {children}
                        </code>
                      ) : (
                        <code 
                          className={`${className} bg-gray-100 block p-4 rounded-md overflow-x-auto font-mono text-sm`}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    a({ node, href, children, ...props }) {
                      return (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                          {...props}
                        >
                          {children}
                        </a>
                      );
                    },
                    table({ node, children, ...props }) {
                      return (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-gray-300" {...props}>
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ node, children, ...props }) {
                      return <thead className="bg-gray-100" {...props}>{children}</thead>;
                    },
                    th({ node, children, ...props }) {
                      return <th className="border border-gray-300 px-4 py-2 text-left font-semibold" {...props}>{children}</th>;
                    },
                    td({ node, children, ...props }) {
                      return <td className="border border-gray-300 px-4 py-2" {...props}>{children}</td>;
                    },
                    blockquote({ node, children, ...props }) {
                      return (
                        <blockquote className="border-l-4 border-blue-500 bg-blue-50 italic text-gray-700 pl-4 py-2 my-4" {...props}>
                          {children}
                        </blockquote>
                      );
                    },
                  }}
                >
                  {summary.summary}
                </ReactMarkdown>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}