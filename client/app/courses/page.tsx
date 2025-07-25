// app/courses/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Folder, Plus, Trash2, ChevronRight } from 'react-feather';
import Link from 'next/link';

type Course = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  summaryCount: number;
};

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses');
      if (res.ok) {
        const data = await res.json();
        // Adăugăm numărul de rezumate pentru fiecare curs
        const coursesWithCounts = await Promise.all(
          data.map(async (course: any) => {
            const countRes = await fetch(`/api/courses/${course.id}/summary-count`);
            const countData = await countRes.json();
            return {
              ...course,
              summaryCount: countData.count
            };
          })
        );
        setCourses(coursesWithCounts);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };


  const deleteCourse = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Sigur doriți să ștergeți acest curs? Această acțiune este permanentă.')) return;
    
    try {
      const res = await fetch(`/api/courses/${id}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setCourses(courses.filter(course => course.id !== id));
      }
    } catch (error) {
      console.error('Error deleting course:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă cursurile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Cursurile Tale</h1>
          <p className="mt-2 text-gray-600">Gestionează și organizează rezumatele tale în cursuri</p>
        </div>

        <div className="mb-6 flex justify-end">
          <button
            onClick={() => router.push('/courses/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="-ml-1 mr-2 h-5 w-5" />
            Creează Curs Nou
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <div 
              key={course.id}
              className="bg-white border border-gray-200 rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
              onClick={() => router.push(`/courses/${course.id}`)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <Folder className="h-10 w-10 text-indigo-500" />
                  </div>
                  <button 
                    onClick={(e) => deleteCourse(course.id, e)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">{course.title}</h3>
                <p className="mt-2 text-gray-500 text-sm">
                  {course.description || 'Fără descriere'}
                </p>
                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    {course.summaryCount} {course.summaryCount === 1 ? 'rezumat' : 'rezumate'}
                  </span>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Folder className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Nu ai niciun curs</h3>
            <p className="mt-2 text-sm text-gray-500">
              Începe prin a crea primul tău curs pentru a organiza rezumatele.
            </p>
            <div className="mt-6">
              <button
                onClick={() => router.push('/courses/new')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
>
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Creează Curs
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}