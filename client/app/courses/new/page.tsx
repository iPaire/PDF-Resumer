// app/courses/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FolderPlus } from 'react-feather';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function NewCoursePage() {
  const t = useTranslations('courses');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description })
      });

      if (response.ok) {
        const newCourse = await response.json();
        router.push(`/courses/${newCourse.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || t('errorOccurred'));
      }
    } catch (err) {
      setError(t('networkError'));
      console.error('Error creating course:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/courses" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            {t('backToCourses')}
          </Link>
        </div>
        
        <div className="bg-surface border border-line shadow-card rounded-card overflow-hidden">
          <div className="px-6 py-5 border-b border-line">
            <h1 className="text-2xl font-bold text-ink">{t('newCourseTitle')}</h1>
            <p className="mt-1 text-ink-soft">{t('newCourseSubtitle')}</p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-ink-soft mb-1">
                  {t('courseTitleLabel')}
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('courseTitlePlaceholder')}
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="description" className="block text-sm font-medium text-ink-soft mb-1">
                  {t('courseDescriptionLabel')}
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-line-strong rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('courseDescriptionPlaceholder')}
                />
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  <FolderPlus className="-ml-1 mr-2 h-5 w-5" />
                  {isSubmitting ? t('creatingCourse') : t('createCourseButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}