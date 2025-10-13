'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, BarChart, ArrowRight, ArrowLeft } from 'react-feather';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type QuizFile = {
  id: string;
  name: string;
  createdAt: string;
  quizCount: number;
};

export default function QuizzesPage() {
  const t = useTranslations('quizzes');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const [files, setFiles] = useState<QuizFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuizzes, setSelectedQuizzes] = useState<Set<string>>(new Set());

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

  const handleSelectQuiz = (quizId: string) => {
    const newSelected = new Set(selectedQuizzes);
    if (newSelected.has(quizId)) {
      newSelected.delete(quizId);
    } else {
      newSelected.add(quizId);
    }
    setSelectedQuizzes(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedQuizzes.size === validQuizzes.length) {
      setSelectedQuizzes(new Set());
    } else {
      setSelectedQuizzes(new Set(validQuizzes.map(q => q.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuizzes.size === 0) {
      alert(t('noQuizzesSelected') || 'Selectează cel puțin un quiz pentru ștergere');
      return;
    }

    if (!confirm(t('confirmBulkDelete', { count: selectedQuizzes.size }) || `Sigur vrei să ștergi ${selectedQuizzes.size} quiz-uri?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedQuizzes).map(quizId =>
        fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        setFiles(files.filter(file => !selectedQuizzes.has(file.id)));
        setSelectedQuizzes(new Set());
        alert(t('bulkDeleteSuccess') || 'Quiz-urile au fost șterse cu succes');
      } else {
        alert(t('bulkDeleteError') || 'Unele quiz-uri nu au putut fi șterse');
      }
    } catch (error) {
      console.error('Error deleting quizzes:', error);
      alert(t('bulkDeleteError') || 'Eroare la ștergerea quiz-urilor');
    }
  };

  // Filter out quizzes with 0 questions
  const validQuizzes = files.filter(file => file.quizCount > 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loadingQuizzes')}</p>
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
            {t('backToDashboard')}
          </Link>
        </div>
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
          <p className="mt-2 text-gray-600">{t('subtitle')}</p>
        </div>

        {validQuizzes.length > 0 && (
          <div className="mb-6 flex justify-between items-center bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuizzes.size === validQuizzes.length && validQuizzes.length > 0}
                  onChange={handleSelectAll}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  {t('selectAll') || 'Selectează toate'}
                </span>
              </label>
              <span className="text-sm text-gray-500">
                {selectedQuizzes.size > 0 && `${selectedQuizzes.size} ${t('selected') || 'selectate'}`}
              </span>
            </div>
            {selectedQuizzes.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {t('deleteSelected') || 'Șterge selectate'} ({selectedQuizzes.size})
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validQuizzes.map((file) => (
            <div
              key={file.id}
              className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 ${selectedQuizzes.has(file.id) ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={selectedQuizzes.has(file.id)}
                    onChange={() => handleSelectQuiz(file.id)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 mr-3"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <FileText className="h-10 w-10 text-blue-500 mr-3" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{file.name}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(file.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    <BarChart className="mr-1 h-4 w-4" />
                    {file.quizCount} {t('questions')}
                  </span>

                  <Link
                    href={`/quizzes/${file.id}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {t('startTest')}
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noQuizzesTitle')}</h3>
            <p className="text-gray-500 mb-6">
              {files.length > 0 
                ? t('noValidQuizzes')
                : t('noQuizzesDescription')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/"
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
              >
                {t('uploadPdf')}
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('backToDashboard')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}