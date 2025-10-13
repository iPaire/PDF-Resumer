// app/components/PDFProcessor.tsx
'use client';
import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
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
      intro: "1. Introduction and Context",
      fundamentals: "2. Fundamental Concepts",
      development: "3. Chapter Development",
      glossary: "4. Extended Technical Glossary",
      relations: "5. Essential Relations and Formulas",
      comparisons: "6. Comparisons and Classifications", 
      questions: "7. Advanced Self-Assessment Questions"
    },
    ro: {
      intro: "1. Introducere și context",
      fundamentals: "2. Concepte fundamentale", 
      development: "3. Dezvoltare pe capitole",
      glossary: "4. Glosar tehnic extins",
      relations: "5. Relații și formule esențiale",
      comparisons: "6. Comparații și clasificări",
      questions: "7. Întrebări de autoevaluare avansate"
    },
    fr: {
      intro: "1. Introduction et contexte",
      fundamentals: "2. Concepts fondamentaux",
      development: "3. Développement par chapitres",
      glossary: "4. Glossaire technique étendu", 
      relations: "5. Relations et formules essentielles",
      comparisons: "6. Comparaisons et classifications",
      questions: "7. Questions d'auto-évaluation avancées"
    },
    es: {
      intro: "1. Introducción y contexto",
      fundamentals: "2. Conceptos fundamentales",
      development: "3. Desarrollo por capítulos",
      glossary: "4. Glosario técnico extendido",
      relations: "5. Relaciones y fórmulas esenciales", 
      comparisons: "6. Comparaciones y clasificaciones",
      questions: "7. Preguntas de autoevaluación avanzadas"
    },
    de: {
      intro: "1. Einführung und Kontext",
      fundamentals: "2. Grundlegende Konzepte",
      development: "3. Kapitelentwicklung",
      glossary: "4. Erweitertes technisches Glossar",
      relations: "5. Wesentliche Beziehungen und Formeln",
      comparisons: "6. Vergleiche und Klassifikationen", 
      questions: "7. Erweiterte Selbstbewertungsfragen"
    },
    it: {
      intro: "1. Introduzione e contesto",
      fundamentals: "2. Concetti fondamentali",
      development: "3. Sviluppo per capitoli", 
      glossary: "4. Glossario tecnico esteso",
      relations: "5. Relazioni e formule essenziali",
      comparisons: "6. Confronti e classificazioni",
      questions: "7. Domande di autovalutazione avanzate"
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summaryLength, setSummaryLength] = useState<'short' | 'long' | 'academic'>('long');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch usage data on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchUsage();
    }
  }, [status]);

  // Check if we should show feedback request at exactly 3 usages
  useEffect(() => {
    if (status === 'authenticated' && usage.used === 3) {
      setTimeout(() => setShowFeedback(true), 1500);
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

  const selectFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError(t('pdfOnly'));
      return;
    }
    
    if (file.size > usage.fileSizeLimit) {
      const maxSizeMB = usage.fileSizeLimit / (1024 * 1024);
      setError(t('fileTooBig', { maxSizeMB }));
      return;
    }
    
    setError('');
    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(file.size);
    setSummary('');
    
    // Automatically start processing the file
    await processFile(file);
  };

  const processFile = async (file: File) => {
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
    
    // Track PDF upload
    analyticsEvents.pdfUpload(file.size);
    
    setIsLoading(true);
    
    try {
      // Track processing started
      analyticsEvents.pdfProcessingStarted();
      const processingStartTime = Date.now();
      
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('filename', file.name);
      formData.append('summaryLength', summaryLength);

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
        
        // Check if we should show feedback after exactly 3 summaries
        const totalSummaries = (usage.used || 0) + 1; // Current usage + the one we just generated
        if (totalSummaries === 3) {
          setTimeout(() => setShowFeedback(true), 2000);
        }
        
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

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    await selectFile(file);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      await selectFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
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
    
    // Reset states when selecting new file
    setSelectedFile(null);
    setFileName('');
    setFileSize(0);
    setError('');
    setSummary('');
    
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

        <div 
          className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
            isDragOver ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
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
                {isDragOver ? t('dropHere') : t('secureProcessing')}
              </p>
              
              {/* Summary Length Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {t('summaryLength')}
                </label>
                <div className="flex justify-center flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSummaryLength('short')}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                      summaryLength === 'short'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {t('shortSummary')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSummaryLength('long')}
                    className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                      summaryLength === 'long'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {t('longSummary')}
                  </button>
                  {session && usage.limit  > 3 && session.user.subscription == 'premium' && (
                    <button
                      type="button"
                      onClick={() => setSummaryLength('academic')}
                      className={`px-4 py-2 text-sm font-medium rounded-full border transition-all flex items-center space-x-2 ${
                        summaryLength === 'academic'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-600 shadow-lg'
                          : 'bg-white text-gray-700 border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-bold">PREMIUM</span>
                      <span>{t('academicSummary')}</span>
                    </button>
                  )}
                </div>
                {summaryLength === 'academic' && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-purple-800 font-medium">
                        {t('academicSummaryDescription')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
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
                    setSelectedFile(null);
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
                          const text = String(children);
                          const isMainSection = /^\d+\.\s/.test(text);
                          return (
                            <h1 
                              className={`text-3xl font-bold mt-8 mb-4 pb-2 ${
                                isMainSection 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent border-b-2 border-blue-300' 
                                  : 'border-b'
                              }`} 
                              {...props}
                            >
                              {children}
                            </h1>
                          );
                        },
                        h2({ node, children, ...props }) {
                          const text = String(children);
                          const isMainSection = /^\d+\.\s/.test(text);
                          return (
                            <h2 
                              className={`text-2xl font-bold mt-6 mb-3 pb-1 ${
                                isMainSection 
                                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent border-b-2 border-blue-200' 
                                  : 'border-b'
                              }`} 
                              {...props}
                            >
                              {children}
                            </h2>
                          );
                        },
                        h3({ node, children, ...props }) {
                          const text = String(children);
                          const isTechnicalSection = text.includes('Glosar') || text.includes('Formule') || text.includes('Glossary') || text.includes('Formula');
                          return (
                            <h3 
                              className={`text-xl font-bold mt-4 mb-2 ${
                                isTechnicalSection ? 'text-green-700 bg-green-50 p-2 rounded-md' : ''
                              }`} 
                              {...props}
                            >
                              {children}
                            </h3>
                          );
                        },
                        h4({ node, children, ...props }) {
                          return <h4 className="text-lg font-semibold mt-3 mb-1 text-indigo-700" {...props}>{children}</h4>;
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
                          const text = String(children);
                          
                          // Enhanced formula detection for LaTeX and mathematical expressions
                          const isLatexFormula = /\\[a-zA-Z]+\{|\\frac\{|\\sqrt\{|\\sum|\\int|\\cdot|\\[a-zA-Z_]+|\$.*\$/.test(text);
                          const isMathFormula = /[A-Za-z_]+\s*[=≈≤≥<>]\s*|[A-Za-z_]+\s*[=≈≤≥<>]\s*[A-Za-z_0-9\s\.\,\-\+\*\/\(\)\{\}\[\]\\]+|\([A-Za-z_]+\s*[=≈≤≥<>]/.test(text);
                          const hasSubscriptSuperscript = /[A-Za-z_]+[_{][A-Za-z0-9}]+|[A-Za-z_]+\^[A-Za-z0-9]+|[A-Z]+_[A-Z]+/.test(text);
                          const containsFormulaKeywords = /Formulă:|Formula:/i.test(text);
                          
                          // Function to convert common notation to LaTeX
                          const convertToLatex = (text) => {
                            return text
                              // Convert subscripts: A_1 -> A_{1}
                              .replace(/([A-Za-z]+)_([A-Za-z0-9]+)/g, '$1_{$2}')
                              // Convert superscripts: A^2 -> A^{2}  
                              .replace(/([A-Za-z]+)\^([A-Za-z0-9]+)/g, '$1^{$2}')
                              // Convert fractions: a/b -> \frac{a}{b}
                              .replace(/([A-Za-z0-9]+)\/([A-Za-z0-9]+)/g, '\\frac{$1}{$2}')
                              // Convert multiplication: * -> \cdot
                              .replace(/\*/g, '\\cdot')
                              // Convert square root: sqrt -> \sqrt
                              .replace(/sqrt\(([^)]+)\)/g, '\\sqrt{$1}')
                              // Convert infinity
                              .replace(/infinity|∞/g, '\\infty')
                              // Convert degrees
                              .replace(/(\d+)°/g, '$1^{\\circ}')
                              // Remove Formula: prefix for cleaner display
                              .replace(/^(Formulă|Formula):\s*/i, '');
                          };
                          
                          if ((isLatexFormula || isMathFormula || hasSubscriptSuperscript || containsFormulaKeywords)) {
                            const latexText = convertToLatex(text.replace(/^\$|\$$/g, '')); // Remove $ delimiters
                            
                            try {
                              if (!inline) {
                                return (
                                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 my-6 shadow-lg">
                                    <div className="flex items-center mb-4">
                                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                                      <span className="text-sm font-bold text-blue-700 uppercase tracking-wide">Formulă Matematică</span>
                                    </div>
                                    <div className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                                      <BlockMath math={latexText} />
                                    </div>
                                  </div>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center bg-blue-100 border border-blue-300 rounded-md px-2 py-1 mx-1">
                                    <InlineMath math={latexText} />
                                  </span>
                                );
                              }
                            } catch (error) {
                              // Fallback to enhanced text display if KaTeX fails
                              const processedText = text
                                .replace(/\*/g, '×')
                                .replace(/([A-Za-z]+)_([A-Za-z0-9]+)/g, '$1₍$2₎')
                                .replace(/([A-Za-z]+)\^([A-Za-z0-9]+)/g, '$1^($2)')
                                .replace(/<=?/g, '≤').replace(/>=?/g, '≥').replace(/!=/g, '≠').replace(/~=/g, '≈');
                              
                              if (!inline) {
                                return (
                                  <div className="bg-blue-50 border-l-4 border-blue-400 pl-4 py-3 my-4 rounded-r">
                                    <div className="flex items-center mb-2">
                                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Formulă</span>
                                    </div>
                                    <code className="font-mono text-blue-900 text-lg font-semibold whitespace-pre-wrap block" {...props}>
                                      {processedText}
                                    </code>
                                  </div>
                                );
                              } else {
                                return (
                                  <code className="font-mono text-blue-800 bg-blue-100 px-2 py-1 rounded text-base font-semibold" {...props}>
                                    {processedText}
                                  </code>
                                );
                              }
                            }
                          }
                          
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
                        strong({ node, children, ...props }) {
                          const text = String(children);
                          const isLatexFormula = /\\[a-zA-Z]+\{|\\frac\{|\\sqrt\{|\\cdot|Formulă:|Formula:/i.test(text);
                          const isMathFormula = /[A-Za-z_]+\s*[=≈≤≥<>]\s*|[A-Za-z_]+\s*[=≈≤≥<>]\s*[A-Za-z_0-9\s\.\,\-\+\*\/\(\)\{\}\[\]\\]+/.test(text);
                          const hasSubscriptSuperscript = /[A-Za-z_]+[_{][A-Za-z0-9}]+|[A-Za-z_]+\^[A-Za-z0-9]+|[A-Z]+_[A-Z]+/.test(text);
                          
                          if (isLatexFormula || isMathFormula || hasSubscriptSuperscript) {
                            return (
                              <strong className="font-mono text-blue-800 font-bold bg-blue-50 px-2 py-1 rounded" {...props}>
                                {children}
                              </strong>
                            );
                          }
                          
                          return <strong {...props}>{children}</strong>;
                        },
                        blockquote({ node, children, ...props }) {
                          const text = String(children);
                          const isTechnicalNote = text.includes('Important') || text.includes('Note') || text.includes('Notă') || text.includes('Importante');
                          
                          return (
                            <blockquote 
                              className={`border-l-4 pl-4 py-3 my-4 rounded-r-md ${
                                isTechnicalNote 
                                  ? 'border-orange-500 bg-orange-50 text-orange-800' 
                                  : 'border-blue-500 bg-blue-50 text-gray-700'
                              } italic`} 
                              {...props}
                            >
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
        
        /* Formula highlighting */
        .prose .formula-highlight {
          background: linear-gradient(120deg, #a8e6cf 0%, #dcedc8 100%);
          padding: 0.5em 1em;
          border-radius: 0.5rem;
          font-weight: 600;
          margin: 1em 0;
          border-left: 4px solid #4caf50;
        }
        
        /* Numerical values highlighting */
        .prose .numerical-highlight {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 0.75em;
          margin: 0.5em 0;
          border-radius: 0.375rem;
        }
        
        /* Section separators */
        .prose .section-separator {
          border-top: 2px solid #e2e8f0;
          margin: 2em 0;
          padding-top: 1.5em;
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