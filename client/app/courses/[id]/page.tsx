'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Folder, Plus, FileText, Copy, BookOpen, File, CheckSquare, Clipboard, Search, Trash2, Edit } from 'react-feather';

type Summary = {
  id: string;
  title?: string;
  name?: string;
  content: string;
  createdAt: string;
  courses: { id: string }[];
  file?: {
    name: string;
  };
  addedAt?: string;
};

type Course = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  summaries: Summary[];
  files: any[];
  fullSummary?: string;
  cheatSheet?: string;
  quiz?: any[];
};

export default function CoursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  
  // Course states
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Generation states
  const [fullSummary, setFullSummary] = useState('');
  const [cheatSheet, setCheatSheet] = useState('');
  const [quiz, setQuiz] = useState<any[]>([]);
  const [generating, setGenerating] = useState({
    summary: false,
    cheatSheet: false,
    quiz: false,
  });
  const [copied, setCopied] = useState({
    fullSummary: false,
    cheatSheet: false
  });
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  
  // Modal states
  const [showAddSummaries, setShowAddSummaries] = useState(false);
  const [showEditCourse, setShowEditCourse] = useState(false);
  
  // Form states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Summary selection
  const [availableSummaries, setAvailableSummaries] = useState<Summary[]>([]);
  const [selectedSummaryIds, setSelectedSummaryIds] = useState<string[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);

  // Helper function to get summary display name
  const getSummaryName = (summary: Summary) => {
    if (summary.name) return summary.name;
    if (summary.file?.name) return summary.file.name;
    if (summary.title) return summary.title;
    
    const date = new Date(summary.createdAt).toLocaleDateString('ro-RO');
    return `Rezumat ${date}`;
  };

  // Fetch course data
  const fetchCourse = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/courses/${courseId}`);
      
      if (!response.ok) {
        throw new Error('Eroare la încărcarea cursului');
      }

      const data = await response.json();
      const courseData = data.course || null;
      setCourse(courseData);
      
      // Set form data for editing
      if (courseData) {
        setEditTitle(courseData.title || '');
        setEditDescription(courseData.description || '');
        if (courseData.fullSummary) setFullSummary(courseData.fullSummary);
        if (courseData.cheatSheet) setCheatSheet(courseData.cheatSheet);
        if (courseData.quiz) setQuiz(courseData.quiz);
      }
      
      return courseData;
    } catch (error) {
      console.error('Error fetching course:', error);
      setError(error instanceof Error ? error.message : 'Eroare necunoscută');
      return null;
    }
  };

  // Fetch available summaries
  const fetchAvailableSummaries = async () => {
    try {
      setIsLoadingSummaries(true);
      const response = await fetch('/api/summaries');
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSummaries(data.summaries || []);
      }
    } catch (error) {
      console.error('Error fetching summaries:', error);
    } finally {
      setIsLoadingSummaries(false);
    }
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && courseId) {
      const loadData = async () => {
        await fetchCourse();
        setLoading(false);
      };
      loadData();
    }
  }, [status, courseId]);

  // Load summaries when modal opens
  useEffect(() => {
    if (showAddSummaries && status === 'authenticated') {
      fetchAvailableSummaries();
    }
  }, [showAddSummaries, status]);

  // Add selected summaries to course
  const addSelectedSummaryIds = async () => {
    if (selectedSummaryIds.length === 0) {
      alert('Te rog selectează cel puțin un rezumat');
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/summaries`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryIds: selectedSummaryIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la adăugarea rezumatelor');
      }

      // Refresh course data
      await fetchCourse();
      
      // Close modal and reset selection
      setShowAddSummaries(false);
      setSelectedSummaryIds([]);
      
      alert('Rezumate adăugate cu succes!');
    } catch (error) {
      console.error('Error adding summaries:', error);
      const errorMessage = error instanceof Error ? error.message : 'Eroare necunoscută';
      alert(`Eroare: ${errorMessage}`);
    }
  };

  // Remove summary from course
  const removeSummaryFromCourse = async (summaryId: string) => {
    if (!confirm('Ești sigur că vrei să elimini acest rezumat din curs?')) {
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/summaries`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId }),
      });

      if (response.ok) {
        // Refresh course data
        await fetchCourse();
        alert('Rezumat eliminat cu succes!');
      }
    } catch (error) {
      console.error('Error removing summary:', error);
      alert('Eroare la eliminarea rezumatului');
    }
  };

  // Update course details
  const updateCourse = async () => {
    if (!editTitle.trim()) {
      alert('Titlul este obligatoriu');
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
        }),
      });

      if (response.ok) {
        setShowEditCourse(false);
        await fetchCourse();
        alert('Curs actualizat cu succes!');
      }
    } catch (error) {
      console.error('Error updating course:', error);
      alert('Eroare la actualizarea cursului');
    }
  };

  // Generate final summary
  const generateFinalSummary = async () => {
    if (!course?.summaries || course.summaries.length === 0) {
      alert('Nu există rezumate în acest curs');
      return;
    }

    setGenerating(prev => ({...prev, summary: true}));
    try {
      const res = await fetch(`/api/courses/${courseId}/summarize`, { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setFullSummary(data.summary);
        // Update course state
        setCourse(prev => prev ? {...prev, fullSummary: data.summary} : null);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGenerating(prev => ({...prev, summary: false}));
    }
  };

  const generateCheatSheet = async () => {
    if (!course?.summaries || course.summaries.length === 0) {
      alert('Nu există rezumate în acest curs');
      return;
    }

    setGenerating(prev => ({...prev, cheatSheet: true}));
    try {
      const res = await fetch(`/api/courses/${courseId}/cheatsheet`, { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setCheatSheet(data.cheatSheet);
        setCourse(prev => prev ? {...prev, cheatSheet: data.cheatSheet} : null);
      }
    } catch (error) {
      console.error('Error generating cheat sheet:', error);
    } finally {
      setGenerating(prev => ({...prev, cheatSheet: false}));
    }
  };

  const generateQuiz = async () => {
    if (!course?.summaries || course.summaries.length === 0) {
      alert('Nu există rezumate în acest curs');
      return;
    }

    setGenerating(prev => ({...prev, quiz: true}));
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz`, { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setQuiz(data.quiz);
        setCourse(prev => prev ? {...prev, quiz: data.quiz} : null);
      }
    } catch (error) {
      console.error('Error generating quiz:', error);
    } finally {
      setGenerating(prev => ({...prev, quiz: false}));
    }
  };

  const copyToClipboard = (text: string, type: 'fullSummary' | 'cheatSheet') => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({...prev, [type]: true }));
    setTimeout(() => setCopied(prev => ({...prev, [type]: false })), 2000);
  };

  const copySummary = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSummaryId(id);
    setTimeout(() => setCopiedSummaryId(null), 2000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă cursul...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <Folder className="mx-auto h-16 w-16 text-red-500" />
          <h3 className="mt-4 text-xl font-bold text-gray-900">Eroare</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={() => {
              setError(null);
              fetchCourse();
            }}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Încearcă din nou
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-white rounded-xl shadow-lg">
          <Folder className="mx-auto h-16 w-16 text-gray-400" />
          <h3 className="mt-4 text-xl font-bold text-gray-900">Cursul nu a fost găsit</h3>
          <p className="mt-2 text-gray-600">
            Cursul solicitat nu există sau nu ai permisiunea de a-l accesa.
          </p>
          <button
            onClick={() => router.push('/courses')}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Înapoi la cursuri
          </button>
        </div>
      </div>
    );
  }

  const hasSummaries = course.summaries?.length > 0;
  const hasContent = course.files?.length > 0 || 
                    course.summaries?.length > 0 || 
                    fullSummary || 
                    cheatSheet || 
                    quiz.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              {course.description && (
                <p className="mt-2 text-gray-600 max-w-3xl">{course.description}</p>
              )}
              <div className="mt-3 text-sm text-gray-500">
                Creat: {new Date(course.createdAt).toLocaleDateString('ro-RO')}
                {course.updatedAt !== course.createdAt && (
                  <span className="ml-3">
                    • Actualizat: {new Date(course.updatedAt).toLocaleDateString('ro-RO')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowEditCourse(true)}
                className="px-4 py-2 flex items-center gap-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <Edit className="h-4 w-4" />
                Editează
              </button>
              <button
                onClick={() => router.push('/courses')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Înapoi
              </button>
            </div>
          </div>
        </div>

        {/* Summary Management Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-900">Rezumatele cursului</h2>
            </div>
            <div className="flex space-x-2">
              {course.summaries.length > 1 && (
                <button
                  onClick={generateFinalSummary}
                  disabled={generating.summary}
                  className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                    generating.summary
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md'
                  }`}
                >
                  {generating.summary ? (
                    <>
                      <span className="loading">...</span>
                      Se generează...
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-5 w-5" />
                      Rezumat final
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => setShowAddSummaries(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 shadow-md"
              >
                <Plus className="h-5 w-5" />
                Adaugă rezumate
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Rezumate adăugate ({course.summaries.length}):</h3>
            {course.summaries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.summaries.map(summary => (
                  <div 
                    key={summary.id}
                    className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50 to-indigo-100"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {getSummaryName(summary)}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Creat la: {new Date(summary.createdAt).toLocaleDateString('ro-RO')}
                            {summary.addedAt && (
                              <span className="ml-2">
                                • Adăugat: {new Date(summary.addedAt).toLocaleDateString('ro-RO')}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copySummary(summary.content, summary.id)}
                          className="text-gray-500 hover:text-indigo-600"
                        >
                          {copiedSummaryId === summary.id ? (
                            <span className="text-sm text-indigo-600 font-medium">Copiat!</span>
                          ) : (
                            <Clipboard className="h-5 w-5" />
                          )}
                        </button>
                        <button 
                          onClick={() => removeSummaryFromCourse(summary.id)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    <div 
                      className="prose max-h-40 overflow-y-auto bg-white p-3 rounded-lg border border-gray-200 text-sm"
                      dangerouslySetInnerHTML={{ __html: summary.content }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Nu ai rezumate în acest curs.</p>
                <button
                  onClick={() => setShowAddSummaries(true)}
                  className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Adaugă primul rezumat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Generation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg overflow-hidden ${
            !hasSummaries ? 'opacity-80' : ''
          }`}>
            <button 
              onClick={generateFinalSummary}
              disabled={!hasSummaries || generating.summary}
              className={`w-full h-full p-6 flex flex-col items-center justify-center ${
                !hasSummaries 
                  ? 'cursor-not-allowed' 
                  : 'hover:bg-blue-50'
              }`}
            >
              <div className="mb-4 p-3 bg-blue-100 rounded-full">
                <BookOpen className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Generează rezumat complet</h3>
              <p className="text-gray-600 text-center text-sm mb-3">
                Rezumat detaliat al întregului curs
              </p>
              {!hasSummaries ? (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full">
                  Adaugă rezumate mai întâi
                </span>
              ) : generating.summary ? (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Se generează...
                </span>
              ) : (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                  Disponibil
                </span>
              )}
            </button>
          </div>
          
          <div className={`bg-gradient-to-br from-green-50 to-green-100 rounded-2xl shadow-lg overflow-hidden ${
            !hasSummaries ? 'opacity-80' : ''
          }`}>
            <button 
              onClick={generateCheatSheet}
              disabled={!hasSummaries || generating.cheatSheet}
              className={`w-full h-full p-6 flex flex-col items-center justify-center ${
                !hasSummaries 
                  ? 'cursor-not-allowed' 
                  : 'hover:bg-green-50'
              }`}
            >
              <div className="mb-4 p-3 bg-green-100 rounded-full">
                <File className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Generează fișă de sinteză</h3>
              <p className="text-gray-600 text-center text-sm mb-3">
                Cheat sheet cu informații cheie
              </p>
              {!hasSummaries ? (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full">
                  Adaugă rezumate mai întâi
                </span>
              ) : generating.cheatSheet ? (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  Se generează...
                </span>
              ) : (
                <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  Disponibil
                </span>
              )}
            </button>
          </div>
          
          <div className={`bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl shadow-lg overflow-hidden ${
            !hasSummaries ? 'opacity-80' : ''
          }`}>
            <button 
              onClick={generateQuiz}
              disabled={!hasSummaries || generating.quiz}
              className={`w-full h-full p-6 flex flex-col items-center justify-center ${
                !hasSummaries 
                  ? 'cursor-not-allowed' 
                  : 'hover:bg-purple-50'
              }`}
            >
              <div className="mb-4 p-3 bg-purple-100 rounded-full">
                <CheckSquare className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">Generează test grilă</h3>
              <p className="text-gray-600 text-center text-sm mb-3">
                Test de evaluare a cunoștințelor
              </p>
              {!hasSummaries ? (
                <span className="text-xs font-medium text-red-500 bg-red-50 px-3 py-1 rounded-full">
                  Adaugă rezumate mai întâi
                </span>
              ) : generating.quiz ? (
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  Se generează...
                </span>
              ) : (
                <span className="text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  Disponibil
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Course Files */}
          {course.files?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-5">
                <FileText className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Fișiere în curs</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {course.files.map((file) => (
                  <div key={file.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-gray-50">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                      <h3 className="font-medium truncate">{file.name}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Adăugat pe {new Date(file.createdAt).toLocaleDateString('ro-RO')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Summary */}
          {fullSummary && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-6 w-6 text-indigo-600" />
                  <h2 className="text-xl font-bold text-gray-900">Rezumat complet al cursului</h2>
                </div>
                <button
                  onClick={() => copyToClipboard(fullSummary, 'fullSummary')}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copied.fullSummary ? 'Copiat!' : 'Copiază'}
                </button>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <p className="whitespace-pre-line text-gray-700">{fullSummary}</p>
              </div>
            </div>
          )}

          {/* Cheat Sheet */}
          {cheatSheet && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <File className="h-6 w-6 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">Fișă de sinteză</h2>
                </div>
                <button
                  onClick={() => copyToClipboard(cheatSheet, 'cheatSheet')}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  {copied.cheatSheet ? 'Copiat!' : 'Copiază'}
                </button>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-5">
                <p className="whitespace-pre-line text-gray-700 font-medium">{cheatSheet}</p>
              </div>
            </div>
          )}

          {/* Quiz */}
          {quiz.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-5">
                <CheckSquare className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Test grilă</h2>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
                {quiz.map((q, index) => (
                  <div key={index} className="mb-8 last:mb-0">
                    <h3 className="font-semibold text-lg mb-4 flex">
                      <span className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3">
                        {index + 1}
                      </span>
                      {q.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-4">
                      {q.options.map((option: string, optIndex: number) => (
                        <div key={optIndex} className="flex items-start bg-white p-3 rounded-lg border border-gray-200">
                          <input 
                            type="radio" 
                            id={`q${index}-opt${optIndex}`}
                            name={`question-${index}`} 
                            className="mt-1 mr-3"
                          />
                          <label 
                            htmlFor={`q${index}-opt${optIndex}`} 
                            className="text-gray-700 cursor-pointer"
                          >
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium shadow-md">
                  Trimite răspunsurile
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!hasContent && (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <div className="max-w-md mx-auto">
                <Folder className="mx-auto h-16 w-16 text-gray-400" />
                <h3 className="mt-4 text-xl font-bold text-gray-900">Curs gol</h3>
                <p className="mt-2 text-gray-600">
                  Începe prin a adăuga rezumate la acest curs.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Summaries Modal */}
      {showAddSummaries && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Adaugă rezumate la curs</h3>
                <button 
                  onClick={() => setShowAddSummaries(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {isLoadingSummaries ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-4 text-gray-600">Se încarcă rezumatele...</p>
                </div>
              ) : availableSummaries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Nu ai rezumate disponibile. Creează mai întâi rezumate.
                </div>
              ) : (
                <>
                  <div className="mb-4 max-h-[50vh] overflow-y-auto">
                    {availableSummaries.map((summary) => (
                      <div 
                        key={summary.id}
                        className={`p-3 border-b border-gray-200 flex items-center justify-between ${
                          selectedSummaryIds.includes(summary.id) 
                            ? 'bg-indigo-50' 
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedSummaryIds.includes(summary.id)}
                            onChange={() => {
                              if (selectedSummaryIds.includes(summary.id)) {
                                setSelectedSummaryIds(prev => prev.filter(id => id !== summary.id));
                              } else {
                                setSelectedSummaryIds(prev => [...prev, summary.id]);
                              }
                            }}
                            className="mr-3 h-4 w-4 text-indigo-600 rounded"
                          />
                          <div>
                            <p className="text-gray-800 font-medium">
                              {getSummaryName(summary)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Creat la: {new Date(summary.createdAt).toLocaleDateString('ro-RO')}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {summary.courses?.length || 0} cursuri
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setShowAddSummaries(false);
                        setSelectedSummaryIds([]);
                      }}
                      className="px-5 py-2.5 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={addSelectedSummaryIds}
                      disabled={selectedSummaryIds.length === 0}
                      className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
                        selectedSummaryIds.length === 0
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                      }`}
                    >
                      <Plus className="h-5 w-5" />
                      Adaugă rezumate ({selectedSummaryIds.length})
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Editează cursul</h3>
                <button 
                  onClick={() => setShowEditCourse(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Titlu curs *</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Titlul cursului"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Descriere (opțional)</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows={3}
                    placeholder="Descrierea cursului"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={() => setShowEditCourse(false)}
                  className="px-5 py-2.5 rounded-xl font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Anulează
                </button>
                <button
                  onClick={updateCourse}
                  className="px-5 py-2.5 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                >
                  Salvează modificările
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}