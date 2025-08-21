'use client';

import { useTranslations } from 'next-intl';

export default function Contact() {
  const t = useTranslations('contact');
  
  return (
    <div className='max-w-3xl mx-auto p-6 text-black'>
      <h1 className='text-2xl font-bold mb-4'>{t('title')}</h1>
      <p>{t('description')} <a href='mailto:smartpdfnote@gmail.com' className='text-blue-600 underline'>smartpdfnote@gmail.com</a></p>
    </div>
  );
}
