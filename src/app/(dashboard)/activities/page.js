'use client';

import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { activitiesApi } from '@/lib/api/activitiesApi';
import useUIStore from '@/lib/store/uiStore';
import ActivityCard from '@/components/activities/ActivityCard';

const DATE_FILTERS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('week');
  const { setIsQuickLogOpen } = useUIStore();

  const fetchActivities = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const now = new Date();
      let filter = {};

      if (dateFilter === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        filter = {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        };
      } else if (dateFilter === 'week') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        filter = { startTime: start.toISOString() };
      } else if (dateFilter === 'month') {
        const start = new Date(now);
        start.setDate(now.getDate() - 30);
        filter = { startTime: start.toISOString() };
      }

      if (searchTerm.trim()) {
        filter.searchTerm = searchTerm.trim();
      }

      const res = await activitiesApi.search(filter, {
        page: 0,
        size: 50,
        sortBy: 'createdAt',
        sortDirection: 'DESC',
      });

      const data =
        res?.activities ||
        res?.data?.activities ||
        res?.data?.data?.activities ||
        [];

      setActivities(data);
    } catch (e) {
      setError(e?.message || 'Failed to load activities');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchActivities();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  return (
    <div className="max-w-4xl">
      {/* Top Bar */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Activities</h1>
        <button
          onClick={() => setIsQuickLogOpen(true)}
          className="bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors flex-shrink-0"
        >
          Log Activity
        </button>
      </div>

      {/* Search Bar */}
      <div className="mt-4 relative">
        <input
          type="text"
          placeholder="Search activities..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Date Filter Pills */}
      <div className="mt-3 flex gap-2 flex-wrap">
        {DATE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setDateFilter(filter.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              dateFilter === filter.value
                ? 'bg-white text-black font-medium'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Activities List */}
      <div className="mt-6">
        {isLoading ? (
          // Skeleton Loading
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="border-b border-white/5 py-4 flex gap-4 animate-pulse"
              >
                <div className="w-16 h-8 bg-white/5 rounded flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-white/5 rounded" />
                  <div className="h-3 w-32 bg-white/5 rounded" />
                </div>
                <div className="w-12 h-6 bg-white/5 rounded flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
            <div className="font-medium mb-1">{error}</div>
            <button
              onClick={() => fetchActivities()}
              className="text-xs text-red-300 hover:text-red-200 transition-colors mt-2"
            >
              Retry
            </button>
          </div>
        ) : activities.length === 0 ? (
          // Empty State
          <div className="text-center mt-20">
            <Zap className="w-16 h-16 text-slate-700 mx-auto" />
            <h3 className="text-xl font-semibold text-white mt-4">
              No activities yet
            </h3>
            <p className="text-slate-400 text-sm mt-2">
              Start logging your daily activities
            </p>
            <button
              onClick={() => setIsQuickLogOpen(true)}
              className="bg-white text-black rounded-xl px-6 py-3 mt-6 font-semibold hover:bg-gray-100 transition-colors"
            >
              Log your first activity
            </button>
          </div>
        ) : (
          // Activities List
          <div>
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

