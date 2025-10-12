"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface AnalyticsSummary {
  summary: {
    totalClicks: number;
    totalPurchases: number;
    totalRevenue: number;
    conversionRate: string;
  };
  byPlan: Array<{
    plan: string;
    purchases: number;
    revenue: number;
  }>;
}

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchAnalytics();
    }
  }, [status, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end,
      });

      const response = await fetch(`/api/analytics?${params}`);

      if (response.status === 403) {
        setError('Access forbidden - Admin privileges required');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-600 text-center">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h2 className="text-xl font-bold mb-2">Error</h2>
            <p>{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">Purchase Analytics Dashboard</h1>
          <p className="text-gray-600">Track conversion rates and revenue from your pricing page</p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Date Range</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAnalytics}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Clicks</h3>
            <p className="text-3xl font-bold text-gray-800">{analytics.summary.totalClicks}</p>
            <p className="text-xs text-gray-500 mt-1">Purchase button clicks</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Purchases</h3>
            <p className="text-3xl font-bold text-gray-800">{analytics.summary.totalPurchases}</p>
            <p className="text-xs text-gray-500 mt-1">Completed transactions</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Conversion Rate</h3>
            <p className="text-3xl font-bold text-gray-800">{analytics.summary.conversionRate}</p>
            <p className="text-xs text-gray-500 mt-1">Clicks to purchases</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Revenue</h3>
            <p className="text-3xl font-bold text-gray-800">
              ${analytics.summary.totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1">From all purchases</p>
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Revenue by Plan</h2>
          {analytics.byPlan.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Plan</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Purchases</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg. Value</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byPlan.map((plan) => (
                    <tr key={plan.plan} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-800 capitalize">
                        {plan.plan.replace('_', ' ')}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">{plan.purchases}</td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        ${plan.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-700">
                        ${(plan.revenue / plan.purchases).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No purchase data available for this period</p>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-800 mb-2">About this dashboard</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Track how many users click on purchase buttons vs. complete purchases</li>
            <li>• Monitor conversion rates to optimize your pricing strategy</li>
            <li>• View revenue breakdown by subscription plan</li>
            <li>• All data is also sent to Google Analytics for cross-reference</li>
          </ul>
        </div>

        {/* Google Analytics Link */}
        <div className="mt-6 text-center">
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            View detailed analytics in Google Analytics
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
