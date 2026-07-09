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
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-ink-soft">{t('loadingQuizzes')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-accent hover:text-accent-strong"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t('backToDashboard')}
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-ink">{t('title')}</h1>
          <p className="mt-2 text-ink-soft">{t('subtitle')}</p>
        </div>

        {validQuizzes.length > 0 && (
          <div className="mb-6 flex justify-between items-center bg-surface border border-line p-4 rounded-card shadow-card">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedQuizzes.size === validQuizzes.length && validQuizzes.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-sm font-medium text-ink-soft">
                  {t('selectAll') || 'Selectează toate'}
                </span>
              </label>
              <span className="text-sm text-ink-faint">
                {selectedQuizzes.size > 0 && `${selectedQuizzes.size} ${t('selected') || 'selectate'}`}
              </span>
            </div>
            {selectedQuizzes.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-btn text-white bg-danger hover:opacity-90 transition-opacity cursor-pointer"
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
              className={`bg-surface border border-line rounded-card shadow-card overflow-hidden hover:shadow-pop hover:-translate-y-0.5 transition-all duration-150 ${selectedQuizzes.has(file.id) ? 'ring-2 ring-accent' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    checked={selectedQuizzes.has(file.id)}
                    onChange={() => handleSelectQuiz(file.id)}
                    className="w-4 h-4 accent-blue-600 rounded mr-3"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <FileText className="h-9 w-9 text-accent mr-3" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-ink truncate">{file.name}</h3>
                    <p className="text-sm text-ink-faint">
                      {new Date(file.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-pill text-sm font-medium bg-accent-soft text-accent-strong">
                    <BarChart className="mr-1 h-4 w-4" />
                    {file.quizCount} {t('questions')}
                  </span>

                  <Link
                    href={`/quizzes/${file.id}`}
                    className="inline-flex items-center text-accent hover:text-accent-strong font-medium"
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
          <div className="text-center py-12 bg-surface border border-line rounded-card shadow-card">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-soft text-accent mb-4">
              <BarChart className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">{t('noQuizzesTitle')}</h3>
            <p className="text-ink-soft mb-6">
              {files.length > 0
                ? t('noValidQuizzes')
                : t('noQuizzesDescription')}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/upload"
                className="inline-flex justify-center items-center px-4 py-2 text-sm font-semibold rounded-btn text-white bg-accent hover:bg-accent-strong transition-colors"
              >
                {t('uploadPdf')}
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex justify-center items-center px-4 py-2 border border-line-strong text-sm font-medium rounded-btn text-ink bg-surface hover:bg-sunken transition-colors"
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