'use client';

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConvertToPDF() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedFile, setConvertedFile] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setError('');
      setConvertedFile(null);
    }
  };

  const handleConvert = async () => {
    if (selectedFiles.length === 0) return;
    
    setIsConverting(true);
    setError('');
    
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Conversion failed');
      }

      // Primim PDF-ul ca blob
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      setConvertedFile(url);
    } catch (err: any) {
      setError(err.message || 'Conversia a eșuat. Vă rugăm încercați din nou.');
      console.error('Conversion error:', err);
    } finally {
      setIsConverting(false);
    }
  };

  const handleUploadConverted = () => {
    if (convertedFile) {
      router.push('/upload');
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType === 'application/pdf') return '📄';
    if (fileType === 'text/plain') return '📝';
    return '📁';
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Convertor în PDF
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Transformă fișierele într-un singur PDF
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8 mb-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl text-black font-semibold mb-4">Încarcă fișiere pentru conversie</h2>
              <p className="text-gray-600 mb-4">
                Convertește fișiere PDF, JPG, PNG și TXT într-un singur PDF
              </p>
              
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.pdf,.txt"
                multiple
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex justify-center items-center px-6 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                  </svg>
                  <span className="mt-2 block text-sm font-medium">
                    {selectedFiles.length > 0 
                      ? `${selectedFiles.length} fișiere selectate` 
                      : 'Click pentru a selecta fișiere'}
                  </span>
                </div>
              </button>
            </div>
            
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Fișiere selectate:</h3>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getFileIcon(file.type)}</span>
                      <span className="text-sm font-medium text-gray-800">
                        {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleConvert}
                disabled={selectedFiles.length === 0 || isConverting}
                className={`flex-1 px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all ${
                  selectedFiles.length === 0 || isConverting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isConverting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Se convertește...
                  </>
                ) : (
                  'Convertește în PDF'
                )}
              </button>
              
              <Link
                href="/upload"
                className="px-6 py-3 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-center"
              >
                Înapoi la Upload
              </Link>
            </div>
          </div>
        </div>

        {convertedFile && (
          <div className="bg-green-50 rounded-xl shadow-lg overflow-hidden p-8 mb-8 border border-green-200">
            <div className="flex items-center mb-4">
              <svg className="h-6 w-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <h2 className="text-xl font-semibold text-green-800">PDF generat cu succes!</h2>
            </div>
            
            <div className="bg-white p-4 rounded-lg flex items-center justify-between mb-6">
              <div className="flex items-center">
                <span className="text-3xl mr-3">📄</span>
                <div>
                  <p className="font-medium text-gray-900">documente-combinate.pdf</p>
                  <p className="text-sm text-gray-500">PDF cu {selectedFiles.length} fișier{selectedFiles.length > 1 ? 'e' : ''}</p>
                </div>
              </div>
              
              <a
                href={convertedFile}
                download={selectedFiles.length === 1 ? 
                  `${selectedFiles[0].name.replace(/\.[^/.]+$/, '')}.pdf` : 
                  "documente-combinate.pdf"
                }
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Descarcă PDF
              </a>
            </div>
            
            <button
              onClick={handleUploadConverted}
              className="w-full px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Încarcă pentru analiză
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
          <h2 className="text-xl text-black font-semibold mb-4">Cum funcționează</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Încarcă fișiere</h3>
              <p className="text-gray-600 text-sm">Selectează unul sau mai multe fișiere PDF, JPG, PNG sau TXT</p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Convertește în PDF</h3>
              <p className="text-gray-600 text-sm">Sistemul va combina toate fișierele într-un singur PDF</p>
            </div>
            <div className="text-center">
              <div className="mx-auto bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">Analizează conținutul</h3>
              <p className="text-gray-600 text-sm">Folosește PDF-ul generat pentru a crea un rezumat cu AI</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}