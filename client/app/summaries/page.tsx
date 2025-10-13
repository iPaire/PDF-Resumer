// app/summaries/page.tsx
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Search, Eye, ArrowLeft, FolderPlus } from 'react-feather';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type Summary = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  coursesCount: number;
  courses: Array<{
    id: string;
    title: string;
  }>;
  name?: string;
  size?: string;
  pages?: number;
  characters?: number;
  summary?: string;
  courseId?: string | null;
};

type Course = {
  id: string;
  title: string;
};

export default function SummariesPage() {
  const t = useTranslations('summaries');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSummary, setSelectedSummary] = useState<Summary | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [selectedSummaries, setSelectedSummaries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    try {
      const [summariesRes, coursesRes] = await Promise.all([
        fetch('/api/summaries'),
        fetch('/api/courses')
      ]);
      
      if (summariesRes.ok) {
        const summariesData = await summariesRes.json();
        setSummaries(Array.isArray(summariesData.summaries) ? summariesData.summaries : []);
      } else {
        console.error('Failed to fetch summaries');
        setSummaries([]);
      }
      
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(Array.isArray(coursesData) ? coursesData : []);
      } else {
        console.error('Failed to fetch courses');
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSummaries([]);
      setCourses([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/summaries/${id}/download`);
      if (response.status === 403) {
        const errorData = await response.json();
        alert(errorData.error || t('downloadErrorFree'));
        return;
      }
      if (!response.ok) throw new Error('Failed to download summary');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace('.pdf', '')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert(t('downloadError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;

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

  const handleSelectSummary = (summaryId: string) => {
    const newSelected = new Set(selectedSummaries);
    if (newSelected.has(summaryId)) {
      newSelected.delete(summaryId);
    } else {
      newSelected.add(summaryId);
    }
    setSelectedSummaries(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSummaries.size === filteredSummaries.length) {
      setSelectedSummaries(new Set());
    } else {
      setSelectedSummaries(new Set(filteredSummaries.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSummaries.size === 0) {
      alert(t('noSummariesSelected') || 'Selectează cel puțin un rezumat pentru ștergere');
      return;
    }

    if (!confirm(t('confirmBulkDelete', { count: selectedSummaries.size }) || `Sigur vrei să ștergi ${selectedSummaries.size} rezumate?`)) {
      return;
    }

    try {
      const deletePromises = Array.from(selectedSummaries).map(summaryId =>
        fetch(`/api/summaries/${summaryId}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const allSuccessful = results.every(res => res.ok);

      if (allSuccessful) {
        setSummaries(summaries.filter(summary => !selectedSummaries.has(summary.id)));
        setSelectedSummaries(new Set());
        if (selectedSummary && selectedSummaries.has(selectedSummary.id)) {
          setSelectedSummary(null);
        }
        alert(t('bulkDeleteSuccess') || 'Rezumatele au fost șterse cu succes');
      } else {
        alert(t('bulkDeleteError') || 'Unele rezumate nu au putut fi șterse');
      }
    } catch (error) {
      console.error('Error deleting summaries:', error);
      alert(t('bulkDeleteError') || 'Eroare la ștergerea rezumatelor');
    }
  };

  const assignToCourse = async (summaryId: string, courseId: string | null) => {
    try {
      const response = await fetch(`/api/summaries/${summaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId })
      });
      
      if (response.ok) {
        setSummaries(prev => prev.map(s => 
          s.id === summaryId ? {...s, courseId} : s
        ));
        
        if (selectedSummary?.id === summaryId) {
          setSelectedSummary(prev => prev ? {...prev, courseId} : null);
        }
        
        setShowCourseModal(false);
        alert(t('assignmentSuccess'));
      } else {
        const errorData = await response.json();
        alert(`Eroare: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Assignment error:', error);
      alert(t('assignmentError'));
    }
  };

  const createQuickCourse = async () => {
    const title = prompt(t('enterCourseTitle'));
    if (!title) return null;
    
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });
      
      if (response.ok) {
        const newCourse = await response.json();
        setCourses([...courses, newCourse]);
        return newCourse.id;
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert(t('assignmentError'));
    }
    return null;
  };

  const openAssignModal = (summary: Summary) => {
    setSelectedSummary(summary);
    setShowCourseModal(true);
  };

  const filteredSummaries = Array.isArray(summaries) ? summaries.filter(summary => 
    (summary.title || summary.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const isFreeUser = session?.user?.subscription === 'free';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loadingSummaries')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-4">
              {filteredSummaries.length > 0 && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSummaries.size === filteredSummaries.length && filteredSummaries.length > 0}
                    onChange={handleSelectAll}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {t('selectAll') || 'Selectează toate'}
                  </span>
                </label>
              )}
              {selectedSummaries.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  {t('deleteSelected') || 'Șterge'} ({selectedSummaries.size})
                </button>
              )}
              <span className="text-sm text-gray-500">
                {filteredSummaries.length} {filteredSummaries.length === 1 ? t('result') : t('results')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">{t('allSummaries')}</h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <input
                          type="checkbox"
                          checked={selectedSummaries.size === filteredSummaries.length && filteredSummaries.length > 0}
                          onChange={handleSelectAll}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('titleColumn')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('createdDateColumn')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('coursesColumn')}
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('actionsColumn')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSummaries.map((summary) => (
                      <tr
                        key={summary.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedSummary?.id === summary.id ? 'bg-blue-50' : ''} ${selectedSummaries.has(summary.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedSummary(summary)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedSummaries.has(summary.id)}
                            onChange={() => handleSelectSummary(summary.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <FileText className="flex-shrink-0 h-5 w-5 text-gray-400 mr-2" />
                            <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                              {summary.title || summary.name || 'Untitled'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(summary.createdAt).toLocaleDateString('ro-RO')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {summary.coursesCount ? `${summary.coursesCount} ${tCommon('courses')}` : t('noCourses')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            href={`/summaries/${summary.id}`}
                            className="text-blue-600 hover:text-blue-900 mr-3 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {!isFreeUser && (
                            <button
                              className="text-blue-600 hover:text-blue-900 mr-3"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(summary.id, summary.title || summary.name || 'summary');
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(summary);
                            }}
                          >
                            <FolderPlus className="w-4 h-4" />
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
                    <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noSummariesTitle')}</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {t('noSummariesDescription')}
                    </p>
                    <div className="mt-6">
                      <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        {t('uploadPdf')}
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedSummary ? t('selectedSummary') : t('summaryPreview')}
                </h2>
              </div>
              
              <div className="p-6">
                {selectedSummary ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {selectedSummary.title || selectedSummary.name || 'Untitled'}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {t('createdOn')} {new Date(selectedSummary.createdAt).toLocaleString('ro-RO')}
                      </p>
                      
                      {selectedSummary.coursesCount > 0 && (
                        <p className="text-sm text-gray-500">
                          {t('assignedTo')} {selectedSummary.coursesCount} {tCommon('courses')}: {' '}
                          {selectedSummary.courses.map(course => course.title).join(', ')}
                        </p>
                      )}
                      
                      {selectedSummary.pages && selectedSummary.characters && (
                        <p className="text-sm text-gray-500">
                          {selectedSummary.pages} {t('pages')}, {selectedSummary.characters.toLocaleString()} {t('characters')}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col gap-3 pt-4">
                      <Link
                        href={`/summaries/${selectedSummary.id}`}
                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="mr-2 h-5 w-5" />
                        {t('viewFullSummary')}
                      </Link>
                      
                      {!isFreeUser && (
                        <button
                          onClick={() => handleDownload(
                            selectedSummary.id, 
                            selectedSummary.title || selectedSummary.name || 'summary'
                          )}
                          className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <Download className="mr-2 h-5 w-5" />
                          {t('downloadTxt')}
                        </button>
                      )}
                      
                      <button
                        onClick={() => openAssignModal(selectedSummary)}
                        className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <FolderPlus className="mr-2 h-5 w-5" />
                        {t('assignToCourse')}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(selectedSummary.id)}
                        className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="mr-2 h-5 w-5" />
                        {t('deleteSummary')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <FileText className="mx-auto h-16 w-16 text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">{t('selectSummary')}</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      {t('selectSummaryDescription')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCourseModal && selectedSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-nunito">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-5">
              {t('assignSummaryToCourse')}
            </h3>

            <p className="text-base text-gray-700 mb-5">
              <span className="font-semibold">{t('summaryLabel')}</span> {selectedSummary.title || selectedSummary.name || 'Untitled'}
            </p>

            <div className="mb-6">
              <label className="block text-base font-medium text-gray-700 mb-2">
                {t('selectCourse')}
              </label>
              <select
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm text-gray-800 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
                onChange={(e) => {
                  if (e.target.value === 'new') {
                    createQuickCourse().then((newCourseId) => {
                      if (newCourseId) {
                        assignToCourse(selectedSummary.id, newCourseId);
                      }
                    });
                  } else {
                    assignToCourse(selectedSummary.id, e.target.value || null);
                  }
                }}
              >
                <option value="">{t('noCourseOption')}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
                <option value="new">{t('createNewCourse')}</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowCourseModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium transition-colors duration-150 text-base"
              >
                {tCommon('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}