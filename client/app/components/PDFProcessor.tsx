'use client';

import { useState, useRef, ChangeEvent } from 'react';

const parseJSON = async (response: Response) => {
  const text = await response.text();
  console.log('Răspuns server:', text);
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error('Invalid JSON response:', text);
    throw new Error('Răspuns invalid de la server');
  }
};

export default function PDFSummarizer() {
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Resetare stări anterioare
    setError('');
    setSummary('');
    setFileName(file.name);
    setFileSize(file.size);
    setIsLoading(true);
    
    // Verificări inițiale
    if (file.size > 10 * 1024 * 1024) {
      setError('Fișierul depășește limita de 10MB');
      setIsLoading(false);
      return;
    }
    
    if (file.type !== 'application/pdf') {
      setError('Vă rugăm să încărcați doar fișiere PDF');
      setIsLoading(false);
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('filename', file.name);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        body: formData
      });

      // Verifică tipul răspunsului
      const contentType = response.headers.get('content-type');
      
      // Dacă nu e JSON, tratează ca eroare
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        
        // Verifică dacă e pagină HTML de eroare Next.js
        if (text.startsWith('<!DOCTYPE html>')) {
          throw new Error('Eroare internă a serverului');
        }
        
        throw new Error(`Răspuns neașteptat: ${text.substring(0, 100)}`);
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Eroare necunoscută la procesare');
      }
      
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setError('Nu s-a putut genera rezumatul. Încercați cu alt fișier.');
      }
    } catch (err: any) {
      console.error('Eroare procesare PDF:', err);
      
      // Mesaj prietenos pentru utilizator
      let userMessage = err.message || 'Eroare necunoscută la procesare';
      
      if (err.message.includes('Failed to fetch')) {
        userMessage = 'Conexiunea cu serverul a eșuat. Verificați internetul.';
      } else if (err.message.includes('Eroare internă a serverului')) {
        userMessage = 'Eroare internă a serverului. Contactați suportul.';
      }
      
      setError(userMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const triggerFileInput = () => {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            PDF Summarizer
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Transformă documentele PDF în rezumate concise cu ajutorul AI
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
                Încărcați un document PDF
              </h3>
              
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Fișierul dvs. este procesat securizat și șters imediat după generarea rezumatului
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
                  disabled={isLoading}
                  className={`inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : 'transform hover:-translate-y-1'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Se procesează...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-3 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                      </svg>
                      Selectează PDF
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
                  {summary ? 'Rezumat generat' : 'Eroare procesare'}
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
                        <p>Recomandări:</p>
                        <ul className="list-disc pl-5 space-y-1 mt-1">
                          <li>Verificați conexiunea la internet</li>
                          <li>Încercați un fișier mai mic</li>
                          <li>Contactați suportul dacă problema persistă</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="prose prose-blue max-w-none bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-wrap">{summary}</p>
                  
                  <div className="mt-6 flex items-center text-sm text-gray-500">
                    <svg className="h-4 w-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>Rezumat generat cu succes</span>
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
              Date securizate
            </span>
            <span className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path>
              </svg>
              Limită 10MB
            </span>
            <span className="flex items-center">
              <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Procesare rapidă
            </span>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            Folosim modele AI avansate pentru a extrage esența documentelor dumneavoastră
          </p>
        </div>
      </div>
    </div>
  );
}