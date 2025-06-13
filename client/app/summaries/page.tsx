'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Search, Eye } from 'react-feather';
import Link from 'next/link';

type Summary = {
  id: string;
  name: string;
  createdAt: string;
  size: string;
  pages: number;
  characters: number;
  summary: string;
};

export default function SummariesPage() {
  const { data: session } = useSession();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);

  useEffect(() => {
    if (session) {
      fetchSummaries();
    }
  }, [session]);

  const fetchSummaries = async () => {
    try {
      const response = await fetch('/api/summaries');
      const data = await response.json();
      if (response.ok) {
        setSummaries(data);
      }
    } catch (error) {
      console.error('Error fetching summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/summaries/${id}/download`);
      if (!response.ok) throw new Error('Failed to download summary');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace('.pdf', '')}_rezumat.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Nu s-a putut descărca rezumatul');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest rezumat?')) return;
    
    try {
      const response = await fetch(`/api/summaries/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSummaries(summaries.filter(summary => summary.id !== id));
        if (selectedSummary?.id === id) setSelectedSummary(null);
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const filteredSummaries = summaries.filter(summary => 
    summary.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă rezumatele...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Rezumatele Tale</h1>
          <p className="mt-2 text-gray-600">Toate rezumatele generate din documentele tale PDF</p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Caută după nume..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-sm text-gray-500">
              {filteredSummaries.length} {filteredSummaries.length === 1 ? 'rezultat' : 'rezultate'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Toate Rezumatele</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nume Fișier
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dată Generare
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mărime
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acțiuni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSummaries.map((summary) => (
                      <tr 
                        key={summary.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${selectedSummary?.id === summary.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedSummary(summary)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {summary.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(summary.createdAt).toLocaleDateString('ro-RO')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.size}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Buton nou pentru vizualizare */}
                          <Link
                            href={`/summaries/${summary.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          
                          <button 
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(summary.id, summary.name);
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-900"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(summary.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredSummaries.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Nu ai niciun rezumat</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Încarcă un document PDF pentru a genera primul tău rezumat.
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Încarcă PDF
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden h-full">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedSummary ? 'Rezumat Selectat' : 'Previzualizare Rezumat'}
                </h2>
              </div>
              
              <div className="p-6 h-[calc(100%-65px)] flex flex-col">
                {selectedSummary ? (
                  <>
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-900">{selectedSummary.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Generat pe {new Date(selectedSummary.createdAt).toLocaleString('ro-RO')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {selectedSummary.pages} pagini, {selectedSummary.characters.toLocaleString()} caractere
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 p-4 rounded-lg flex-grow overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700">
                        {selectedSummary.summary}
                      </pre>
                    </div>
                    
                    <div className="mt-4 flex justify-between">
                      <Link
                        href={`/summaries/${selectedSummary.id}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="-ml-1 mr-2 h-5 w-5" />
                        Vezi întreg rezumatul
                      </Link>
                      
                      <button
                        onClick={() => handleDownload(selectedSummary.id, selectedSummary.name)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Download className="-ml-1 mr-2 h-5 w-5" />
                        Descarcă
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <FileText className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">Selectează un rezumat</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Selectează un rezumat din listă pentru a-l vizualiza sau descărca.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}