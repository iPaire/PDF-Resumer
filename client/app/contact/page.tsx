'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export default function Contact() {
  const t = useTranslations('contact');
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ feedback: feedback.trim() }),
      });
      
      if (response.ok) {
        setSubmitStatus('success');
        setFeedback('');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className='max-w-3xl mx-auto p-6 text-black space-y-8'>
      <div>
        <h1 className='text-2xl font-bold mb-4'>{t('title')}</h1>
        <p>{t('description')} <a href='mailto:smartpdfnote@gmail.com' className='text-blue-600 underline'>smartpdfnote@gmail.com</a></p>
      </div>
      
      <div className='bg-gray-50 rounded-lg p-6'>
        <h2 className='text-xl font-semibold mb-3'>{t('feedback.title')}</h2>
        <p className='text-gray-600 mb-4'>{t('feedback.description')}</p>
        
        <form onSubmit={handleSubmitFeedback} className='space-y-4'>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder={t('feedback.placeholder')}
            rows={6}
            className='w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
            disabled={isSubmitting}
          />
          
          {submitStatus === 'success' && (
            <div className='text-green-600 text-sm'>
              {t('feedback.success')}
            </div>
          )}
          
          {submitStatus === 'error' && (
            <div className='text-red-600 text-sm'>
              {t('feedback.error')}
            </div>
          )}
          
          <button
            type='submit'
            disabled={isSubmitting || !feedback.trim()}
            className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors'
          >
            {isSubmitting ? t('feedback.submitting') : t('feedback.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
