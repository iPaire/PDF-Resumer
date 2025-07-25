// app/courses/manage/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Folder, FileText, ChevronRight, Check } from 'react-feather';

type CourseType = {
  id: string;
  title: string;
};

type SummaryType = {
  id: string;
  name: string;
  courseId: string | null;
};

export default function ManageCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [summaries, setSummaries] = useState<SummaryType[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [coursesRes, summariesRes] = await Promise.all([
        fetch('/api/courses'),
        fetch('/api/summaries')
      ]);
      
      if (!coursesRes.ok || !summariesRes.ok) {
        throw new Error('Failed to fetch data');
      }
      
      const coursesData = await coursesRes.json();
      const summariesData = await summariesRes.json();
      
      setCourses(coursesData);
      setSummaries(summariesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
        // Update local state
        setSummaries(prev => prev.map(s => 
          s.id === summaryId ? {...s, courseId} : s
        ));
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Assignment error:', error);
      alert('Failed to assign summary to course');
    }
  };

  if (loading) {
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Gestionează Cursurile
          </h1>
          <p className="mt-3 text-lg text-gray-600">
            Asignează rezumate la cursuri pentru a le organiza
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Courses List */}
          <div className="bg-white rounded-lg shadow overflow-hidden md:col-span-1">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Cursurile Tale</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {courses.map(course => (
                <button
                  key={course.id}
                  className={`w-full text-left p-4 hover:bg-gray-50 flex justify-between items-center ${
                    selectedCourse === course.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedCourse(course.id)}
                >
                  <div className="flex items-center">
                    <Folder className="h-5 w-5 text-indigo-500 mr-3" />
                    <span className="font-medium">{course.title}</span>
                  </div>
                  {selectedCourse === course.id && (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
              ))}
              {courses.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  Nu ai niciun curs creat
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4">
              <button
                onClick={() => router.push('/courses/new')}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Creează Curs Nou
              </button>
            </div>
          </div>
          
          {/* Summaries List */}
          <div className="bg-white rounded-lg shadow overflow-hidden md:col-span-2">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedCourse 
                  ? `Rezumate pentru ${courses.find(c => c.id === selectedCourse)?.title || ''}` 
                  : 'Toate rezumatele'}
              </h2>
            </div>
            <div className="divide-y divide-gray-200">
              {summaries.map(summary => (
                <div key={summary.id} className="p-4 flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="font-medium">{summary.name}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => assignToCourse(summary.id, selectedCourse)}
                      disabled={summary.courseId === selectedCourse}
                      className={`p-2 rounded ${
                        summary.courseId === selectedCourse
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {summary.courseId === selectedCourse ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        'Adaugă la curs'
                      )}
                    </button>
                    <button
                      onClick={() => assignToCourse(summary.id, null)}
                      disabled={!summary.courseId}
                      className={`p-2 rounded ${
                        !summary.courseId
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      Elimină
                    </button>
                  </div>
                </div>
              ))}
              {summaries.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  Nu ai niciun rezumat creat
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}