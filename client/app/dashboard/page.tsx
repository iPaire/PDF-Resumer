// app/dashboard/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, BarChart2, User, Book, Plus, Download, Trash2 } from 'react-feather';
import Link from 'next/link';

type FileType = {
  id: string;
  name: string;
  date: string;
  size: string;
  status: string;
};

type StatsType = {
  filesProcessed: number;
  quizzesGenerated: number;
  summariesCreated: number;
  storageUsed: string;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [files, setFiles] = useState<FileType[]>([]);
  const [stats, setStats] = useState<StatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const [filesRes, statsRes] = await Promise.all([
        fetch('/api/dashboard/files'),
        fetch('/api/dashboard/stats')
      ]);
      
      const filesData = await filesRes.json();
      const statsData = await statsRes.json();
      
      if (filesRes.ok) setFiles(filesData);
      if (statsRes.ok) setStats(statsData);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadFile = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/files/${id}`);
      if (!response.ok) throw new Error('Failed to download file');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Nu s-a putut descărca fișierul');
    }
  };

  const handleDeleteFile = async (id: string) => {
    try {
      // In a real app, you would call an API to delete the file
      setFiles(files.filter(file => file.id !== id));
      // Show success message or update stats
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Procesat': return 'bg-green-100 text-green-800';
      case 'În așteptare': return 'bg-yellow-100 text-yellow-800';
      case 'Eroare': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă dashboard-ul...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Bun venit, {session?.user?.name || 'Utilizator'}!</h1>
          <p className="mt-2 text-gray-600">Aici poți gestiona toate fișierele și rezultatele tale.</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard 
              icon={<FileText className="w-6 h-6" />}
              title="Fișiere Procesate"
              value={stats.filesProcessed}
              color="bg-blue-100 text-blue-800"
            />
            
            <StatCard 
              icon={<Book className="w-6 h-6" />}
              title="Rezumate Create"
              value={stats.summariesCreated}
              color="bg-green-100 text-green-800"
            />
            
            <StatCard 
              icon={<BarChart2 className="w-6 h-6" />}
              title="Teste Generate"
              value={stats.quizzesGenerated}
              color="bg-purple-100 text-purple-800"
            />
            
            <StatCard 
              icon={<User className="w-6 h-6" />}
              title="Spațiu Utilizat"
              value={stats.storageUsed}
              color="bg-yellow-100 text-yellow-800"
            />
          </div>
        )}

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <ActionCard 
            title="Încarcă un PDF Nou"
            description="Începe procesarea unui nou document"
            icon={<Plus className="w-8 h-8" />}
            buttonText="Încarcă Fișier"
            buttonLink="/"
            color="bg-blue-500"
          />
          
          <ActionCard 
            title="Vezi Rezumatele Tale"
            description="Accesează toate rezumatele create"
            icon={<Book className="w-8 h-8" />}
            buttonText="Vizualizează Rezumate"
            buttonLink="/summaries"
            color="bg-green-500"
          />
          
          <ActionCard 
            title="Teste Grilă"
            description="Exersează cu testele generate"
            icon={<BarChart2 className="w-8 h-8" />}
            buttonText="Accesează Teste"
            buttonLink="/quizzes"
            color="bg-purple-500"
          />
        </div>

        {/* Recent Files Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Fișiere Recente</h2>
              <Link 
                href="/files" 
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Vezi toate fișierele
              </Link>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nume Fișier
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dată Încărcare
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mărime
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                        <div className="text-sm font-medium text-gray-900">{file.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor(file.status)}`}>
                        {file.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3"
                          onClick={() => handleDownloadFile(file.id, file.name)}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      <button 
                        className="text-red-600 hover:text-red-900"
                        onClick={() => handleDeleteFile(file.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {files.length === 0 && (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Niciun fișier încărcat</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Începe prin a încărca primul tău document PDF.
                </p>
                <div className="mt-6">
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
                    Încarcă PDF
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="mt-8 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Activitate Recentă</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {files.slice(0, 4).map((file, index) => (
              <ActivityItem 
                key={file.id}
                action={index === 0 ? "Ai generat un rezumat" : "Ai încărcat un fișier"}
                file={file.name}
                time={file.date}
                icon={index === 0 ? 
                  <Book className="w-5 h-5 text-green-500" /> : 
                  <Plus className="w-5 h-5 text-blue-500" />
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, title, value, color }: { 
  icon: React.ReactNode; 
  title: string; 
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-12 h-12 rounded-full ${color.split(' ')[0]} flex items-center justify-center`}>
            <div className={color.split(' ')[1]}>
              {icon}
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-gray-500">{title}</h3>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action Card Component
function ActionCard({ 
  title, 
  description, 
  icon, 
  buttonText, 
  buttonLink,
  color
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  buttonText: string;
  buttonLink: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col">
      <div className="p-5 flex-1">
        <div className={`${color} w-12 h-12 rounded-md flex items-center justify-center text-white mb-4`}>
          {icon}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 text-sm">{description}</p>
      </div>
      <div className="bg-gray-50 px-5 py-4">
        <Link 
          href={buttonLink}
          className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${color} hover:${color.replace('500', '600')} focus:outline-none focus:ring-2 focus:ring-offset-2 ${color.replace('500', '700')}`}
        >
          {buttonText}
        </Link>
      </div>
    </div>
  );
}

// Activity Item Component
function ActivityItem({ action, file, time, icon }: { 
  action: string; 
  file: string; 
  time: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="px-6 py-4">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-0.5">
          {icon}
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-gray-800">
            <span className="font-medium">{action}</span> - {file}
          </p>
          <p className="mt-1 text-sm text-gray-500">{time}</p>
        </div>
      </div>
    </div>
  );
}