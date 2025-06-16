'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, BarChart, ArrowRight, ArrowLeft } from 'react-feather';
import Link from 'next/link';

type QuizFile = {
  id: string;
  name: string;
  createdAt: string;
  quizCount: number;
};

export default function QuizzesPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<QuizFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchQuizFiles();
    }
  }, [session]);

  const fetchQuizFiles = async () => {
    try {
      const response = await fetch('/api/quizzes');
      const data = await response.json();
      if (response.ok) {
        setFiles(data);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter out quizzes with 0 questions
  const validQuizzes = files.filter(file => file.quizCount > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă testele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Înapoi la Dashboard
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Teste Grilă</h1>
          <p className="mt-2 text-gray-600">Testează-ți cunoștințele bazate pe documentele încărcate</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validQuizzes.map((file) => (
            <div 
              key={file.id} 
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-10 w-10 text-blue-500 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{file.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <BarChart className="mr-1 h-4 w-4" />
                    {file.quizCount} întrebări
                  </span>
                  
                  <Link 
                    href={`/quizzes/${file.id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Începe testul
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {validQuizzes.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-500 mb-4">
              <BarChart className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Niciun test disponibil</h3>
            <p className="text-gray-500 mb-6">
              {files.length > 0 
                ? "Toate testele generate au 0 întrebări. Încarcă un alt document PDF pentru a genera teste." 
                : "Încarcă un document PDF pentru a genera teste grilă."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/"
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                Încarcă PDF
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Înapoi la Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}