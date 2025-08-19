//app/upload/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import PDFProcessor from '@/components/PDFProcessor';

export default function UploadPage() {
  const { data: session, status } = useSession();

  // Redirecționează utilizatorii neautentificați
  if (status === 'unauthenticated') {
    redirect('/login');
  }

  // Afișează loader în timp ce se verifică sesiunea
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă...</p>
        </div>
      </div>
    );
  }

  return (
            <PDFProcessor />
  );
}