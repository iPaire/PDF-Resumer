// app/summaries/[id]/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Download, ArrowLeft, Printer, FileText } from 'react-feather';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Summary = {
  id: string;
  name: string;
  createdAt: string;
  size: string;
  pages: number;
  characters: number;
  summary: string;
};

export default function SummaryDetailPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      fetchSummary();
    } else {
      setIsLoading(false);
      setError('Trebuie să fii autentificat pentru a vedea acest rezumat.');
    }
  }, [session, params.id]);

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/summaries/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setSummary(data);
      } else {
        setError(data.error || 'Eroare la încărcarea rezumatului');
      }
    } catch (error) {
      setError('Eroare de conexiune');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!summary) return;
    
    try {
      const response = await fetch(`/api/summaries/${params.id}/download`);
      if (!response.ok) throw new Error('Failed to download summary');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${summary.name.replace('.pdf', '')}_rezumat.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Nu s-a putut descărca rezumatul');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă rezumatul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-red-500 font-medium mb-4">{error}</div>
          <button
            onClick={() => router.push('/summaries')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la rezumate
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-gray-900 font-medium mb-4">Rezumatul nu a fost găsit.</div>
          <button
            onClick={() => router.push('/summaries')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la rezumate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link 
            href="/summaries" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Înapoi la rezumate
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{summary.name}</h1>
              <p className="mt-2 text-gray-600">
                Generat pe {new Date(summary.createdAt).toLocaleDateString('ro-RO')} • 
                {summary.pages} pagini • {summary.characters.toLocaleString()} caractere
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center px-3 py-2 rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300"
                title="Printează"
              >
                <Printer className="h-4 w-4" />
              </button>
              
              <button
                onClick={handleDownload}
                className="flex items-center px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                <Download className="mr-1 h-4 w-4" />
                Descarcă
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="prose max-w-none">
              {summary.summary.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}