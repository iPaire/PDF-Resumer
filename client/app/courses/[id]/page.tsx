'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Folder, Plus, FileText, Copy, BookOpen, File, CheckSquare, Clipboard, Search } from 'react-feather';

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
};

type Course = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  summaries: Summary[];
  files: any[];
  fullSummary?: string;
  cheatSheet?: string;
  quiz?: any[];
};

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  console.log("Course ID from params:", courseId);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullSummary, setFullSummary] = useState('');
  const [cheatSheet, setCheatSheet] = useState('');
  const [quiz, setQuiz] = useState<any[]>([]);
  const [generating, setGenerating] = useState({
    summary: false,
    cheatSheet: false,
    quiz: false,
    addSummary: false
  });
  const [copied, setCopied] = useState({
    fullSummary: false,
    cheatSheet: false
  });
  const [copiedSummaryId, setCopiedSummaryId] = useState<string | null>(null);
  
  // State for adding existing summaries
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSummaries, setAvailableSummaries] = useState<Summary[]>([]);
  const [selectedSummaries, setSelectedSummaries] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [availableForCourse, setAvailableForCourse] = useState<Summary[]>([]);

  // Helper function to get summary display name
  const getSummaryName = (summary: Summary) => {
    if (summary.name) return summary.name;
    if (summary.file?.name) return summary.file.name;
    if (summary.title) return summary.title;
    
    // Fallback to generated name
    const date = new Date(summary.createdAt).toLocaleDateString('ro-RO');
    return `Rezumat ${date}`;
  };

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
        return courseData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching course:', error);
      return null;
    }
  };

  useEffect(() => {
    if (!courseId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch course data
        const courseData = await fetchCourse();
        if (courseData) {
          if (courseData.fullSummary) setFullSummary(courseData.fullSummary);
          if (courseData.cheatSheet) setCheatSheet(courseData.cheatSheet);
          if (courseData.quiz) setQuiz(courseData.quiz);
          
          // Pre-select existing summaries
          setSelectedSummaries(courseData.summaries.map((s: Summary) => s.id));
        }
        
        // Fetch available summaries
        const summariesRes = await fetch('/api/summaries');
        if (summariesRes.ok) {
          const summariesData = await summariesRes.json();
          setAvailableSummaries(summariesData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [courseId]);

  // Update availableForCourse when course or availableSummaries change
  useEffect(() => {
    if (course && availableSummaries.length > 0) {
      const filtered = availableSummaries.filter(
        summary => !course.summaries.some(s => s.id === summary.id)
      );
      setAvailableForCourse(filtered);
    }
  }, [course, availableSummaries]);

  const handleSummarySelection = (summaryId: string) => {
    setSelectedSummaries(prev => {
      if (prev.includes(summaryId)) {
        return prev.filter(id => id !== summaryId);
      } else {
        return [...prev, summaryId];
      }
    });
  };

  const addSelectedSummaries = async () => {
     if (!courseId) {
    console.error("Course ID is undefined!");
    alert("Eroare: ID-ul cursului lipsește");
    return;
  }

  setGenerating(prev => ({ ...prev, addSummary: true }));
    
    try {
      const response = await fetch(`/api/courses/${courseId}/summaries`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          summaryIds: selectedSummaries 
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Eroare la adăugarea rezumatelor';
        
        if (errorData.missingIds) {
          errorMessage += ` (ID-uri lipsă: ${errorData.missingIds.join(', ')})`;
        }
        
        throw new Error(errorMessage);
      }

      // Refresh course data
      const updatedCourse = await fetchCourse();
      if (updatedCourse) {
        setCourse(updatedCourse);
        setSelectedSummaries([]);
        
        // Update available summaries
        const summariesRes = await fetch('/api/summaries');
        if (summariesRes.ok) {
          const summariesData = await summariesRes.json();
          setAvailableSummaries(summariesData);
        }
      }
      
    } catch (error: any) {
      console.error('Error adding summaries:', error);
      alert(error.message || 'Eroare necunoscută la adăugarea rezumatelor');
    } finally {
      setGenerating(prev => ({ ...prev, addSummary: false }));
    }
  };

  const searchSummaries = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/summaries?query=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        setAvailableSummaries(await res.json());
      }
    } catch (error) {
      console.error('Error searching summaries:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const generateSummary = async () => {
    setGenerating(prev => ({...prev, summary: true}));
    try {
      const res = await fetch(`/api/courses/${courseId}/summarize`, { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setFullSummary(data.summary);
        // Update course state with new summary
        setCourse(prev => prev ? {...prev, fullSummary: data.summary} : null);
      } else {
        const errorData = await res.json();
        console.error('Failed to generate summary:', errorData);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setGenerating(prev => ({...prev, summary: false}));
    }
  };

  const generateCheatSheet = async () => {
    setGenerating(prev => ({...prev, cheatSheet: true}));
    try {
      const res = await fetch(`/api/courses/${courseId}/cheatsheet`, { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setCheatSheet(data.cheatSheet);
        // Update course state with new cheat sheet
        setCourse(prev => prev ? {...prev, cheatSheet: data.cheatSheet} : null);
      } else {
        const errorData = await res.json();
        console.error('Failed to generate cheat sheet:', errorData);
      }
    } catch (error) {
      console.error('Error generating cheat sheet:', error);
    } finally {
      setGenerating(prev => ({...prev, cheatSheet: false}));
    }
  };

  const generateQuiz = async () => {
    setGenerating(prev => ({...prev, quiz: true}));
    try {
      const res = await fetch(`/api/courses/${courseId}/quiz`, { 
        method: 'POST' 
      });
      
      if (res.ok) {
        const data = await res.json();
        setQuiz(data.quiz);
        // Update course state with new quiz
        setCourse(prev => prev ? {...prev, quiz: data.quiz} : null);
      } else {
        const errorData = await res.json();
        console.error('Failed to generate quiz:', errorData);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă cursul...</p>
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
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              {course.description && (
                <p className="mt-2 text-gray-600 max-w-3xl">{course.description}</p>
              )}
            </div>
            <div className="flex space-x-2">
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
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Gestionează rezumate</h2>
          </div>
          
          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Rezumate adăugate la curs:</h3>
            <div className="flex flex-wrap gap-2">
              {course.summaries.map(summary => (
                <span 
                  key={summary.id}
                  className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full flex items-center"
                >
                  {getSummaryName(summary)}
                  <button 
                    onClick={() => copySummary(summary.content, summary.id)}
                    className="ml-2 text-indigo-600 hover:text-indigo-900"
                  >
                    {copiedSummaryId === summary.id ? (
                      <span className="text-xs">Copiat!</span>
                    ) : (
                      <Clipboard className="h-4 w-4" />
                    )}
                  </button>
                </span>
              ))}
              {course.summaries.length === 0 && (
                <p className="text-gray-500 italic">Niciun rezumat adăugat încă</p>
              )}
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-6">
            <h3 className="font-medium text-gray-700 mb-3">Adaugă rezumate existente:</h3>
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Caută rezumate..."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-10"
                  onKeyDown={(e) => e.key === 'Enter' && searchSummaries()}
                />
                <button
                  onClick={searchSummaries}
                  className="absolute right-3 top-3 text-gray-500 hover:text-indigo-600"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <span className="loading">...</span>
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-xl mb-4">
              {availableForCourse.length > 0 ? (
                availableForCourse.map(summary => (
                  <div 
                    key={summary.id}
                    className={`p-3 border-b border-gray-200 flex items-center justify-between ${
                      selectedSummaries.includes(summary.id) 
                        ? 'bg-indigo-50' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedSummaries.includes(summary.id)}
                        onChange={() => handleSummarySelection(summary.id)}
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
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  {availableSummaries.length > 0
                    ? 'Toate rezumatele sunt deja adăugate în acest curs'
                    : 'Nu ai rezumate disponibile'}
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={addSelectedSummaries}
                disabled={generating.addSummary || selectedSummaries.length === 0}
                className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
                  generating.addSummary || selectedSummaries.length === 0
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                }`}
              >
                {generating.addSummary ? (
                  <>
                    <span className="loading">...</span>
                    Se adaugă...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    Adaugă rezumate selectate ({selectedSummaries.length})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Generation Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl shadow-lg overflow-hidden ${
            !hasSummaries ? 'opacity-80' : ''
          }`}>
            <button 
              onClick={generateSummary}
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

          {/* Course Summaries */}
          {course.summaries?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-5">
                <BookOpen className="h-6 w-6 text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Rezumate în curs</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {course.summaries.map((summary) => (
                  <div key={summary.id} className="border rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50 to-indigo-100">
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
                          </p>
                        </div>
                      </div>
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
                    </div>
                    <div 
                      className="prose max-h-40 overflow-y-auto bg-white p-3 rounded-lg border border-gray-200 text-sm"
                      dangerouslySetInnerHTML={{ __html: summary.content }}
                    />
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
    </div>
  );
}