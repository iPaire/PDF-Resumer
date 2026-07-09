// app/summaries/page.tsx - The Library: every document as a learning
// workspace card. Keeps search, bulk delete, download and course assignment.
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Search, FolderPlus, Printer } from 'react-feather';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, Card, CardBody, Badge, EmptyState, Spinner } from '@/components/ui';

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
  const tWorkspace = useTranslations('workspace');
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
          s.id === summaryId ? { ...s, courseId } : s
        ));

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
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-4 text-ink-soft">{t('loadingSummaries')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ink">{t('libraryTitle')}</h1>
            <p className="mt-2 text-ink-soft">{t('librarySubtitle')}</p>
          </div>
          <Button href="/upload">+ {tCommon('newDocument')}</Button>
        </div>

        {/* Toolbar */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-ink-faint" />
            </div>
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              className="block w-full pl-9 pr-3 py-2.5 border border-line rounded-btn bg-surface text-sm text-ink placeholder:text-ink-faint focus:outline-2 focus:outline-accent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            {filteredSummaries.length > 0 && (
              <label className="flex items-center gap-2 cursor-pointer text-sm text-ink-soft">
                <input
                  type="checkbox"
                  checked={selectedSummaries.size === filteredSummaries.length && filteredSummaries.length > 0}
                  onChange={handleSelectAll}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                {t('selectAll')}
              </label>
            )}
            {selectedSummaries.size > 0 && (
              <Button variant="danger" size="sm" onClick={handleBulkDelete}>
                {t('deleteSelected')} ({selectedSummaries.size})
              </Button>
            )}
            <span className="text-sm text-ink-faint">
              {filteredSummaries.length} {filteredSummaries.length === 1 ? t('result') : t('results')}
            </span>
          </div>
        </div>

        {/* Document grid */}
        {filteredSummaries.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileText size={22} />}
              title={t('noSummariesTitle')}
              description={t('noSummariesDescription')}
              action={<Button href="/upload">{t('uploadPdf')}</Button>}
            />
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSummaries.map((summary) => (
              <Card key={summary.id} hoverable className="flex flex-col">
                <CardBody className="flex flex-col flex-1">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedSummaries.has(summary.id)}
                      onChange={() => handleSelectSummary(summary.id)}
                      className="mt-1 w-4 h-4 accent-blue-600 rounded shrink-0"
                      aria-label={summary.title || summary.name || 'Untitled'}
                    />
                    <Link href={`/workspace/${summary.id}`} className="flex-1 min-w-0 group">
                      <h3 className="font-semibold text-ink leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                        {summary.title || summary.name || 'Untitled'}
                      </h3>
                    </Link>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge>{new Date(summary.createdAt).toLocaleDateString()}</Badge>
                    {summary.pages ? <Badge>{summary.pages} {t('pages')}</Badge> : null}
                    {summary.coursesCount > 0 && (
                      <Badge tone="accent">{summary.coursesCount} {tCommon('courses')}</Badge>
                    )}
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between gap-2">
                    <Button href={`/workspace/${summary.id}`} size="sm">
                      ✨ {t('openLearn')}
                    </Button>
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={`/summaries/${summary.id}`}
                        title={tWorkspace('printView')}
                        className="p-2 rounded-btn text-ink-faint hover:bg-sunken hover:text-ink transition-colors"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                      {!isFreeUser && (
                        <button
                          title={t('downloadTxt')}
                          className="p-2 rounded-btn text-ink-faint hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                          onClick={() => handleDownload(summary.id, summary.title || summary.name || 'summary')}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        title={t('assignToCourse')}
                        className="p-2 rounded-btn text-ink-faint hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                        onClick={() => openAssignModal(summary)}
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                      <button
                        title={t('deleteSummary')}
                        className="p-2 rounded-btn text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer"
                        onClick={() => handleDelete(summary.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCourseModal && selectedSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-card shadow-pop p-6 sm:p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold text-ink mb-4">
              {t('assignSummaryToCourse')}
            </h3>

            <p className="text-sm text-ink-soft mb-5">
              <span className="font-semibold text-ink">{t('summaryLabel')}</span>{' '}
              {selectedSummary.title || selectedSummary.name || 'Untitled'}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-ink mb-2">
                {t('selectCourse')}
              </label>
              <select
                className="w-full px-4 py-2.5 border border-line rounded-btn text-sm text-ink bg-surface focus:outline-2 focus:outline-accent"
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
              <Button variant="secondary" onClick={() => setShowCourseModal(false)}>
                {tCommon('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
