// app/components/PDFProcessor.tsx
'use client';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import FeedbackPopup from './FeedbackPopup';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { analyticsEvents } from '@/lib/analytics';

const parseJSON = async (response: Response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Invalid JSON response:', text);
    throw new Error('Invalid server response');
  }
};

const getSectionTitles = (lang: string) => {
  const titles: Record<string, Record<string, string>> = {
    en: {
      topics: "1. Key Topics Overview",
      glossary: "2. Glossary of Terms",
      prerequisites: "3. Prerequisite Knowledge",
      concepts: "4. Key Concepts Explained",
      diagrams: "5. Conceptual Diagrams",
      examples: "6. Practical Examples/Case Studies",
      resources: "7. Recommended Resources",
      questions: "8. Self-Assessment Questions"
    },
    ro: {
      topics: "1. Descriere pe Subiecte Principale",
      glossary: "2. Glosar de Termeni",
      prerequisites: "3. Cunoștințe Necesare",
      concepts: "4. Explicații Detaliate ale Conceptelor Cheie",
      diagrams: "5. Diagrame Conceptuale",
      examples: "6. Studii de Caz/Exemple Practice",
      resources: "7. Resurse Recomandate",
      questions: "8. Întrebări de Autoevaluare"
    },
    fr: {
      topics: "1. Aperçu des sujets clés",
      glossary: "2. Glossaire des termes",
      prerequisites: "3. Connaissances préalables",
      concepts: "4. Explication des concepts clés",
      diagrams: "5. Diagrammes conceptuels",
      examples: "6. Exemples pratiques/Études de cas",
      resources: "7. Ressources recommandées",
      questions: "8. Questions d'auto-évaluation"
    },
    es: {
      topics: "1. Descripción de temas principales",
      glossary: "2. Glosario de términos",
      prerequisites: "3. Conocimientos previos necesarios",
      concepts: "4. Explicaciones detalladas de conceptos clave",
      diagrams: "5. Diagramas conceptuales",
      examples: "6. Ejemplos prácticos/Casos de estudio",
      resources: "7. Recursos recomendados",
      questions: "8. Preguntas de autoevaluación"
    },
    de: {
      topics: "1. Überblick über Hauptthemen",
      glossary: "2. Glossar der Begriffe",
      prerequisites: "3. Voraussetzungen",
      concepts: "4. Detaillierte Erklärungen der Schlüsselkonzepte",
      diagrams: "5. Konzeptionelle Diagramme",
      examples: "6. Praktische Beispiele/Fallstudien",
      resources: "7. Empfohlene Ressourcen",
      questions: "8. Selbstbewertungsfragen"
    },
    it: {
      topics: "1. Panoramica degli argomenti principali",
      glossary: "2. Glossario dei termini",
      prerequisites: "3. Conoscenze preliminari necessarie",
      concepts: "4. Spiegazioni dettagliate dei concetti chiave",
      diagrams: "5. Diagrammi concettuali",
      examples: "6. Esempi pratici/Casi di studio",
      resources: "7. Risorse consigliate",
      questions: "8. Domande di autovalutazione"
    }
  };
  
  return titles[lang] || titles.en;
};

export default function PDFProcessor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('pdfProcessor');
  const [summary, setSummary] = useState('');
  const [summaryLanguage, setSummaryLanguage] = useState('en');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [usage, setUsage] = useState({ 
    used: 0, 
    limit: 3,
    fileSizeLimit: 10 * 1024 * 1024  // Default to 10MB
  });
  const [showFeedback, setShowFeedback] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch usage data on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsage();
    }
  }, [status]);

  // Check if we should show feedback request
  useEffect(() => {
    if (status === 'authenticated' && usage.used >= usage.limit && usage.limit === 3) {
      const feedbackDismissed = localStorage.getItem('feedbackDismissed');
      if (!feedbackDismissed) {
        setTimeout(() => setShowFeedback(true), 1500);
      }
    }
  }, [usage, status]);

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/usage');
      if (!response.ok) throw new Error('Failed to fetch usage');
      
      const data = await response.json();
      if (response.ok) {
        const fileSizeLimitBytes = data.fileSizeLimit * 1024 * 1024;
        setUsage({ ...data, fileSizeLimit: fileSizeLimitBytes });
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }

    if (usage.used >= usage.limit) {
      setError(usage.limit === 3 
        ? t('limitReached', { limit: usage.limit })
        : t('limitReachedWait', { limit: usage.limit }));
      return;
    }

    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Track PDF upload
    analyticsEvents.pdfUpload(file.size);
    
    setError('');
    setSummary('');
    setFileName(file.name);
    setFileSize(file.size);
    setIsLoading(true);
    
    if (file.size > usage.fileSizeLimit) {
      const maxSizeMB = usage.fileSizeLimit / (1024 * 1024);
      setError(t('fileTooBig', { maxSizeMB }));
      setIsLoading(false);
      return;
    }
    
    if (file.type !== 'application/pdf') {
      setError(t('pdfOnly'));
      setIsLoading(false);
      return;
    }
    
    try {
      // Track processing started
      analyticsEvents.pdfProcessingStarted();
      const processingStartTime = Date.now();
      
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('filename', file.name);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData
      });

      const contentType = response.headers.get('content-type');
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        if (text.startsWith('<!DOCTYPE html>')) {
          throw new Error('Internal server error');
        }
        throw new Error(`Unexpected response: ${text.substring(0, 100)}`);
      }

      const data = await parseJSON(response);
      
      if (!response.ok) {
        throw new Error(data.error || 'Unknown processing error');
      }
      
      if (data.summary) {
        setSummary(data.summary);
        setSummaryLanguage(data.meta?.language || 'en');
        fetchUsage();
        
        // Track successful processing
        const processingTime = Date.now() - processingStartTime;
        analyticsEvents.pdfProcessingCompleted(processingTime);
        analyticsEvents.summaryGenerated();
      } else {
        setError(t('noSummary'));
        analyticsEvents.pdfProcessingFailed('no_summary_generated');
      }
    } catch (err: any) {
      console.error('PDF processing error:', err);
      
      // Track processing failure
      analyticsEvents.pdfProcessingFailed(err.message || 'unknown_error');
      
      let userMessage = err.message || 'Unknown processing error';
      
      if (err.message.includes('Failed to fetch')) {
        userMessage = t('connectionFailed');
      } else if (err.message.includes('Internal server error')) {
        userMessage = t('serverError');
      } else if (err.message.includes('monthly limit')) {
        userMessage = err.message;
      }
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAnswer = (index: number) => {
    setRevealedAnswers(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const triggerFileInput = () => {
    if (status !== 'authenticated') {
      router.push('/login');
      return;
    }
    
    if (usage.used >= usage.limit) {
      setError(usage.limit === 3 
        ? t('limitReached', { limit: usage.limit })
        : t('limitReachedWait', { limit: usage.limit }));
      return;
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const submitFeedback = async (rating: number, comment: string) => {
    setIsSubmittingFeedback(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rating,
          comment,
        })
      });

      if (response.ok) {
        setFeedbackSubmitted(true);
        setTimeout(() => {
          setShowFeedback(false);
          localStorage.setItem('feedbackDismissed', 'true');
        }, 2000);
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      setError(t('feedbackError'));
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const maxSizeMB = usage.fileSizeLimit / (1024 * 1024);
  const sectionTitles = getSectionTitles(summaryLanguage);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {status === 'authenticated' && (
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center">
            <div className="mb-2 sm:mb-0">
              <span className="font-medium text-gray-700">{t('monthlyUsage')} </span>
              <span className="font-semibold">
                {usage.used} / {usage.limit} {t('summaries')}
              </span>
              <span className="ml-4 font-medium text-gray-700">
                {t('fileLimit')} {maxSizeMB}MB
              </span>
            </div>
            {usage.used >= usage.limit && (
              <button 
                onClick={() => router.push('/pricing')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full text-sm font-medium hover:from-blue-700 hover:to-indigo-800 transition"
              >
                {t('upgradePlan')}
              </button>
            )}
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('title')}
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            {t('subtitle')}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl">
          <div className="px-6 py-8 sm:p-10">
            <div className="text-center">
              <div className="mx-auto bg-blue-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                <svg 
                  className="h-12 w-12 text-blue-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={1.5} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {t('uploadDocument')}
              </h3>
              
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {t('secureProcessing')}
              </p>
              
              <div className="mt-6">
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={isLoading || (status === 'authenticated' && usage.used >= usage.limit)}
                  className={`inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ${
                    isLoading || (status === 'authenticated' && usage.used >= usage.limit) 
                      ? 'opacity-70 cursor-not-allowed' 
                      : 'transform hover:-translate-y-1'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t('processing')}
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      {t('selectPdf')}
                    </>
                  )}
                </button>
                
                {fileName && !error && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg inline-flex items-center">
                    <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <span className="text-sm font-medium text-blue-800">
                      {fileName} ({formatFileSize(fileSize)})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {(summary || error) && (
          <div className={`mt-8 bg-white rounded-xl shadow-lg overflow-hidden transition-all duration-500 ${summary ? 'animate-fadeIn' : ''}`}>
            <div className="px-6 py-8 sm:p-10">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {summary ? t('generatedSummary') : t('processingError')}
                </h2>
                
                <button
                  type="button"
                  onClick={() => {
                    setSummary('');
                    setFileName('');
                    setFileSize(0);
                    setError('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
              
              {error ? (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-red-800">{error}</p>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{t('recommendations')}</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                          <li>{t('checkConnection')}</li>
                          <li>{t('trySmaller')}</li>
                          <li>{t('contactSupport')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <div className="prose max-w-none">
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
                        code({ node, inline, className, children, ...props }) {
                          return !inline ? (
                            <code className={`${className} bg-gray-100 block p-4 rounded-md overflow-x-auto font-mono text-sm`} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-sm" {...props}>
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
                      {summary}
                    </ReactMarkdown>

                    {summary.includes(sectionTitles.questions) && (
                      <div className="mt-10 pt-6 border-t border-gray-200">
                        <h2 className="text-2xl font-bold mb-4">{sectionTitles.questions}</h2>
                        
                        {summary.split('\n').map((line, index) => {
                          const questionRegex = new RegExp(`\\d+\\.\\s(.+?)\\s\\((?:click|click|clique|klicken|clicca)\\s`, 'i');
                          const match = line.match(questionRegex);
                          
                          if (match) {
                            const question = match[1].trim();
                            const answer = line.replace(match[0], '').replace(/\)$/, '').trim();
                            
                            return (
                              <div key={`qa-${index}`} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="font-medium text-gray-800">{question}</p>
                                <button 
                                  onClick={() => toggleAnswer(index)}
                                  className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                                >
                                  <span>
                                    {t('clickToSeeAnswer')}
                                  </span>
                                </button>
                                
                                {revealedAnswers[index] && (
                                  <div className="mt-3 p-3 bg-white rounded-md border border-blue-200">
                                    <strong className="text-blue-700">
                                      {t('answer')}
                                    </strong>
                                    {answer}
                                  </div>
                                )}
                              </div>
                            );
                          }
                          
                          return null;
                        })}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 flex items-center text-sm text-gray-500">
                    <svg className="h-4 w-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{t('summarySuccess')}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 text-center">
          <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-600">
            <span className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              {t('secureData')}
            </span>
            <span className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
              </svg>
              {maxSizeMB}{t('limitMB')}
            </span>
            <span className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              {t('fastProcessing')}
            </span>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            {t('aiModels')}
          </p>
        <div className="mt-4">
            <Link 
              href="/convert-to-pdf" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center"
            >
              {t('noPdf')}
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </Link>
          </div>
        </div>
      </div>
      
      <FeedbackPopup 
        show={showFeedback}
        onClose={() => {
          setShowFeedback(false);
          localStorage.setItem('feedbackDismissed', 'true');
        }}
        onSubmit={submitFeedback}
        isSubmitting={isSubmittingFeedback}
        feedbackSubmitted={feedbackSubmitted}
      />
      
      <style jsx global>{`
        .prose {
          line-height: 1.6;
        }
        .prose h1, 
        .prose h2, 
        .prose h3, 
        .prose h4 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
          color: #1a202c;
        }
        .prose h1 {
          font-size: 1.875rem;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 0.5rem;
        }
        .prose h2 {
          font-size: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 0.3rem;
        }
        .prose h3 {
          font-size: 1.25rem;
        }
        .prose p {
          margin-bottom: 1em;
          color: #2d3748;
        }
        .prose ul, 
        .prose ol {
          padding-left: 1.5em;
          margin-bottom: 1em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
        .prose code {
          background-color: #edf2f7;
          padding: 0.2em 0.4em;
          border-radius: 0.25rem;
          font-family: monospace;
        }
        .prose pre {
          background-color: #2d3748;
          color: #e2e8f0;
          padding: 1em;
          border-radius: 0.5rem;
          overflow-x: auto;
          margin-bottom: 1.5em;
        }
        .prose blockquote {
          border-left: 4px solid #cbd5e0;
          padding-left: 1em;
          margin-left: 0;
          color: #4a5568;
        }
        .prose table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5em;
        }
        .prose th, 
        .prose td {
          border: 1px solid #cbd5e0;
          padding: 0.5em 1em;
          text-align: left;
        }
        .prose th {
          background-color: #edf2f7;
          font-weight: 600;
        }
        
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}