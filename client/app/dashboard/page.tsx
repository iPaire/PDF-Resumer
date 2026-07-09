//app/dashboard/page.tsx - Learning-first dashboard: greeting, continue
// learning row, quick actions, stats, courses and recent activity.
'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, BarChart2, User, Book, Plus, Trash2, Folder, ArrowRight } from 'react-feather';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card, CardBody, CardHeader, Badge, EmptyState, Spinner } from '@/components/ui';

type FileType = {
  id: string;
  name: string;
  date: string;
  type: 'summary' | 'quiz';
  status: string;
};

type CourseType = {
  id: string;
  title: string;
  description: string;
  fileCount: number;
  createdAt: string;
};

type StatsType = {
  filesProcessed: number;
  quizzesGenerated: number;
  summariesCreated: number;
  coursesCreated: number;
  storageUsed: string;
  storageLimit: string;
  storagePercentage: number;
  tokens: number;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<FileType[]>([]);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [stats, setStats] = useState<StatsType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const t = useTranslations('dashboard');
  const tc = useTranslations('common');
  const tWorkspace = useTranslations('workspace');

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.subscription === 'free') {
        setRedirecting(true);
        router.push('/summaries');
        return;
      }

      fetchDashboardData();
    }
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [filesRes, statsRes, coursesRes] = await Promise.all([
        fetch('/api/dashboard/files'),
        fetch('/api/dashboard/stats'),
        fetch('/api/courses')
      ]);

      if (!filesRes.ok) throw new Error('Failed to fetch files');
      if (!statsRes.ok) throw new Error('Failed to fetch stats');
      if (!coursesRes.ok) throw new Error('Failed to fetch courses');

      const filesData = await filesRes.json();
      const statsData = await statsRes.json();
      const coursesData = await coursesRes.json();

      setFiles(filesData);
      setStats(statsData);
      setCourses(coursesData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, type: 'summary' | 'quiz') => {
    try {
      const endpoint = type === 'summary' ? `/api/summaries/${id}` : `/api/quizzes/${id}`;
      const response = await fetch(endpoint, {
        method: 'DELETE'
      });

      if (response.ok) {
        setFiles(files.filter(file => file.id !== id));
        alert(t('deleteSuccess'));
        // Refresh stats after deletion
        fetchDashboardData();
      } else {
        const errorData = await response.json();
        alert(t('deleteError', { error: errorData.error }));
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(t('deleteErrorGeneral'));
    }
  };

  // The API returns status codes; translate for display. Legacy hardcoded
  // strings are mapped too in case cached responses still carry them.
  const normalizeStatus = (status: string): 'processed' | 'pending' | 'error' | null => {
    switch (status) {
      case 'processed':
      case 'Procesat':
      case 'Processed': return 'processed';
      case 'pending':
      case 'În așteptare':
      case 'Pending': return 'pending';
      case 'error':
      case 'Eroare':
      case 'Error': return 'error';
      default: return null;
    }
  };

  const statusLabel = (status: string): string => {
    const code = normalizeStatus(status);
    return code ? t(code) : status;
  };

  const statusTone = (status: string): 'success' | 'warn' | 'danger' | 'neutral' => {
    switch (normalizeStatus(status)) {
      case 'processed': return 'success';
      case 'pending': return 'warn';
      case 'error': return 'danger';
      default: return 'neutral';
    }
  };

  const storageColor = (percentage: number) => {
    if (percentage > 90) return 'bg-danger';
    if (percentage > 75) return 'bg-warn';
    return 'bg-success';
  };

  if (isLoading || redirecting) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-4 text-ink-soft">
            {redirecting ? t('redirecting') : t('loadingDashboard')}
          </p>
        </div>
      </div>
    );
  }

  const recentSummaries = files.filter((f) => f.type === 'summary').slice(0, 3);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-ink">{t('welcomeUser', { name: session?.user?.name || 'Utilizator' })}</h1>
            <p className="mt-2 text-ink-soft">{t('activityDescription')}</p>
          </div>
          <Button href="/upload">+ {tc('newDocument')}</Button>
        </div>

        {/* Continue learning */}
        {recentSummaries.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-ink mb-4">{t('continueLearning')}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recentSummaries.map((file) => (
                <Link key={file.id} href={`/workspace/${file.id}`}>
                  <Card hoverable className="h-full">
                    <CardBody className="flex flex-col h-full">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
                          <Book className="w-5 h-5 text-accent" />
                        </div>
                        <h3 className="font-semibold text-ink leading-snug line-clamp-2">{file.name}</h3>
                      </div>
                      <div className="mt-auto pt-4 flex items-center justify-between text-sm">
                        <span className="text-ink-faint">{file.date}</span>
                        <span className="inline-flex items-center gap-1 text-accent font-medium">
                          {tWorkspace('openWorkspace')}
                          <ArrowRight size={14} />
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
            <StatCard
              icon={<FileText className="w-5 h-5" />}
              title={t('filesProcessed')}
              value={stats.filesProcessed}
            />

            <StatCard
              icon={<Book className="w-5 h-5" />}
              title={t('summariesCreated')}
              value={stats.summariesCreated}
            />

            <StatCard
              icon={<BarChart2 className="w-5 h-5" />}
              title={t('quizzesGenerated')}
              value={stats.quizzesGenerated}
            />

            <StatCard
              icon={<Folder className="w-5 h-5" />}
              title={t('coursesCreated')}
              value={stats.coursesCreated}
            />

            {/* Storage Card with Percentage */}
            <Card>
              <CardBody>
                <div className="flex items-center">
                  <div className="flex-shrink-0 w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center text-accent">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-ink-soft">{t('storageUsed')}</h3>
                    <p className="text-2xl font-semibold text-ink">
                      {stats.storagePercentage}%
                    </p>
                    <div className="mt-1 text-xs text-ink-faint">
                      {stats.storageUsed} / {stats.storageLimit}
                    </div>
                    <div className="mt-2 w-full bg-sunken rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${storageColor(stats.storagePercentage)}`}
                        style={{ width: `${stats.storagePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <ActionCard
            title={t('uploadNewPdf')}
            description={t('uploadNewPdfDescription')}
            icon={<Plus className="w-6 h-6" />}
            buttonText={t('uploadFile')}
            buttonLink="/upload"
          />

          <ActionCard
            title={t('viewSummaries')}
            description={t('viewSummariesDescription')}
            icon={<Book className="w-6 h-6" />}
            buttonText={t('viewSummariesButton')}
            buttonLink="/summaries"
          />

          <ActionCard
            title={t('quizTests')}
            description={t('quizTestsDescription')}
            icon={<BarChart2 className="w-6 h-6" />}
            buttonText={t('accessQuizzes')}
            buttonLink="/quizzes"
          />

          <ActionCard
            title={t('manageCourses')}
            description={t('manageCoursesDescription')}
            icon={<Folder className="w-6 h-6" />}
            buttonText={t('accessCourses')}
            buttonLink="/courses"
          />
        </div>

        {/* Recent Courses Section */}
        <Card className="overflow-hidden mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-ink">{t('recentCourses')}</h2>
              <Link
                href="/courses"
                className="text-sm text-accent hover:text-accent-strong font-medium"
              >
                {t('viewAllCourses')}
              </Link>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-sunken">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('title')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('description')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('files')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-line">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-sunken transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-ink">{course.title}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-ink-soft">
                      {course.description || t('noDescription')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                      {course.fileCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                      {course.createdAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/courses/${course.id}`}
                        className="text-accent hover:text-accent-strong"
                      >
                        {t('open')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {courses.length === 0 && (
              <EmptyState
                icon={<Folder size={22} />}
                title={t('noCourses')}
                description={t('createFirstCourse')}
                action={
                  <Button href="/courses/new">
                    <Plus className="h-4 w-4" />
                    {t('createCourse')}
                  </Button>
                }
              />
            )}
          </div>
        </Card>

        {/* Recent Activity Section */}
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-ink">{t('recentActivity')}</h2>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead className="bg-sunken">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('activity')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('details')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('date')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-ink-faint uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface divide-y divide-line">
                {files.map((file) => (
                  <tr key={file.id} className="hover:bg-sunken transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {file.type === 'summary' ? (
                          <Book className="flex-shrink-0 h-4 w-4 text-success mr-2" />
                        ) : (
                          <BarChart2 className="flex-shrink-0 h-4 w-4 text-accent mr-2" />
                        )}
                        <div className="text-sm font-medium text-ink">
                          {file.type === 'summary' ? t('summary') : t('quiz')}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                      {file.type === 'summary' ? (
                        <Link href={`/workspace/${file.id}`} className="hover:text-accent transition-colors">
                          {file.name}
                        </Link>
                      ) : (
                        file.name
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-ink-soft">
                      {file.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge tone={statusTone(file.status)}>{statusLabel(file.status)}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        className="p-1.5 rounded-btn text-ink-faint hover:bg-danger-soft hover:text-danger transition-colors cursor-pointer"
                        onClick={() => handleDelete(file.id, file.type)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {files.length === 0 && (
              <EmptyState
                icon={<FileText size={22} />}
                title={t('noRecentActivity')}
                description={t('uploadFirstDocument')}
                action={
                  <Button href="/upload">
                    <Plus className="h-4 w-4" />
                    {t('uploadPdf')}
                  </Button>
                }
              />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, title, value }: {
  icon: React.ReactNode;
  title: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center">
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-accent-soft flex items-center justify-center text-accent">
            {icon}
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-ink-soft">{title}</h3>
            <p className="text-2xl font-semibold text-ink">{value}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Action Card Component
function ActionCard({
  title,
  description,
  icon,
  buttonText,
  buttonLink,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  buttonLink: string;
}) {
  return (
    <Card hoverable className="flex flex-col">
      <CardBody className="flex-1">
        <div className="bg-accent-soft text-accent w-11 h-11 rounded-btn flex items-center justify-center mb-4">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-ink mb-1.5">{title}</h3>
        <p className="text-ink-soft text-sm">{description}</p>
      </CardBody>
      <div className="px-5 pb-5">
        <Button href={buttonLink} variant="secondary" className="w-full">
          {buttonText}
        </Button>
      </div>
    </Card>
  );
}
