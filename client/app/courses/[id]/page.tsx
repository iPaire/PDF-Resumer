'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Folder, Plus, Trash2, ChevronRight, FileText, Copy, BookOpen, File, CheckSquare } from 'react-feather';

type Summary = {
  id: string;
  content: string;
  createdAt: string;
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
  const { id } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullSummary, setFullSummary] = useState('');
  const [cheatSheet, setCheatSheet] = useState('');
  const [quiz, setQuiz] = useState<any[]>([]);
  const [generating, setGenerating] = useState({
    summary: false,
    cheatSheet: false,
    quiz: false
  });
  const [newSummary, setNewSummary] = useState('');
  const [creatingSummary, setCreatingSummary] = useState(false);
  const [copied, setCopied] = useState({
    fullSummary: false,
    cheatSheet: false
  });

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        const res = await fetch(`/api/courses/${id}`);
        if (res.ok) {
          const data = await res.json();
          setCourse(data);
          
          if (data.fullSummary) setFullSummary(data.fullSummary);
          if (data.cheatSheet) setCheatSheet(data.cheatSheet);
          if (data.quiz) setQuiz(data.quiz);
        } else {
          const errorText = await res.text();
          console.error('Failed to fetch course:', res.status, errorText);
        }
      } catch (error) {
        console.error('Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCourse();
  }, [id]);

  const createSummary = async () => {
    if (!newSummary.trim()) return;
    
    setCreatingSummary(true);
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newSummary })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update course with new summary
        setCourse(prev => prev ? {
          ...prev,
          summaries: [...prev.summaries, data]
        } : null);
        setNewSummary('');
      } else {
        const errorText = await res.text();
        console.error('Failed to create summary:', res.status, errorText);
      }
    } catch (error) {
      console.error('Error creating summary:', error);
    } finally {
      setCreatingSummary(false);
    }
  };

  const generateSummary = async () => {
    setGenerating(prev => ({...prev, summary: true}));
    try {
      const res = await fetch(`/api/courses/${id}/summarize`, { 
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
      const res = await fetch(`/api/courses/${id}/cheatsheet`, { 
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
      const res = await fetch(`/api/courses/${id}/quiz`, { 
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
    setCopied({ ...copied, [type]: true });
    setTimeout(() => setCopied({ ...copied, [type]: false }), 2000);
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

        {/* Summary Creation Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Adaugă rezumat</h2>
          </div>
          
          <div className="flex flex-col gap-4">
            <textarea
              value={newSummary}
              onChange={(e) => setNewSummary(e.target.value)}
              placeholder="Scrie rezumatul aici..."
              className="w-full p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[120px]"
            />
            <div className="flex justify-end">
              <button
                onClick={createSummary}
                disabled={creatingSummary || !newSummary.trim()}
                className={`px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 ${
                  creatingSummary || !newSummary.trim()
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                }`}
              >
                <Plus className="h-5 w-5" />
                {creatingSummary ? 'Se salvează...' : 'Salvează rezumat'}
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
                  <div key={summary.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow bg-gradient-to-br from-indigo-50 to-indigo-100">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">
                          Rezumat {new Date(summary.createdAt).toLocaleDateString('ro-RO')}
                        </h3>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                    <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                      {summary.content}
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
                  Începe prin a adăuga fișiere și rezumate la acest curs.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (textarea) textarea.focus();
                    }}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Adaugă primul rezumat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}