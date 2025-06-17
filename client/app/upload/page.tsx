// app/upload/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import PDFProcessor from '@/components/PDFProcessor';
import { ArrowLeft } from 'react-feather';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          href="/dashboard" 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-6"
        >
          <ArrowLeft className="mr-2" />
          Înapoi la Dashboard
        </Link>
        
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <h1 className="text-2xl md:text-3xl font-bold">Procesează documente PDF</h1>
            <p className="mt-2 opacity-90">
              Încarcă fișierele tale pentru a genera rezumate, teste și lecții personalizate
            </p>
          </div>
          
          <div className="p-6">
            <PDFProcessor />
          </div>
        </div>
      </div>
    </div>
  );
}