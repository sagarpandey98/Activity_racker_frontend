'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Target } from 'lucide-react';
import { goalsApi } from '@/lib/api/goalsApi';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { getHealthStatus, getHealthColor } from '@/lib/utils/healthUtils';
import { getPriorityLabel, getPriorityColor, isLeafGoal, isTrackedGoal } from '@/lib/utils/goalUtils';
import { formatDate, getRelativeTime, isToday } from '@/lib/utils/dateUtils';
import useAuthStore from '@/lib/store/authStore';
import useUIStore from '@/lib/store/uiStore';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { setIsQuickLogOpen } = useUIStore();

  const [stats, setStats] = useState(null);
  const [healthGoals, setHealthGoals] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [dueSoonGoals, setDueSoonGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Greeting helper
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  // Data fetching on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, healthRes, activitiesRes, dueSoonRes] = await Promise.all([
          goalsApi.getStatistics(),
          goalsApi.getHealthSummary(),
          activitiesApi.search({}, {
            page: 0,
            size: 5,
            sortBy: 'createdAt',
            sortDirection: 'DESC'
          }),
          goalsApi.getDueSoon()
        ]);

        // Parse responses carefully
        const parsedStats = statsRes?.data?.data || statsRes?.data || statsRes;
        const parsedHealthGoals = (healthRes?.data?.data || healthRes?.data || healthRes) || [];
        const parsedActivities = (
          activitiesRes?.data?.data?.activities ||
          activitiesRes?.data?.activities ||
          activitiesRes?.activities ||
          []
        ) || [];
        const parsedDueSoon = (dueSoonRes?.data?.data || dueSoonRes?.data || dueSoonRes) || [];

        setStats(parsedStats);
        setHealthGoals(parsedHealthGoals.slice(0, 5));
        setRecentActivities(parsedActivities);
        setDueSoonGoals(parsedDueSoon);
      } catch (e) {
        console.error('Dashboard fetch failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Count today's activities
  const todayActivityCount = recentActivities.filter(a => isToday(a.createdAt)).length;

  // Skeleton components
  const SkeletonCard = () => (
    <div className="h-24 bg-white/5 rounded-xl animate-pulse" />
  );

  const SkeletonRow = () => (
    <div className="h-12 bg-white/5 rounded animate-pulse mb-2" />
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        {/* Greeting skeleton */}
        <div className="mb-8">
          <div className="h-8 w-48 bg-white/5 rounded animate-pulse" />
          <div className="h-4 w-32 bg-white/5 rounded animate-pulse mt-2" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
          <div>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </div>
        </div>
      </div>
    );
  }

  // Main layout
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* SECTION 1 — Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here's your progress overview
        </p>
      </div>

      {/* SECTION 2 — Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Total Goals */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Total Goals</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.totalGoals || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {stats?.completedGoals || 0} completed
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide">In Progress</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.inProgressGoals || 0}
          </div>
          <div className={`text-xs mt-1 ${
            (stats?.overdueGoals || 0) > 0 ? 'text-red-400' : 'text-slate-500'
          }`}>
            {stats?.overdueGoals || 0} overdue
          </div>
        </div>

        {/* Card 3: Avg Health */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Avg Health</div>
          <div
            style={{ color: getHealthColor(stats?.averageHealthScore) }}
            className="text-2xl font-bold mt-1"
          >
            {stats?.averageHealthScore ? Math.round(stats.averageHealthScore) : '–'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {getHealthStatus(stats?.averageHealthScore)}
          </div>
        </div>

        {/* Card 4: Today's Activities */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Today</div>
          <div className="text-2xl font-bold text-white mt-1">
            {todayActivityCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">activities logged</div>
        </div>
      </div>

      {/* SECTION 3 — Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Goals Needing Attention */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Goals Needing Attention
              </h2>
              <a
                href="/goals"
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                View all
              </a>
            </div>

            {healthGoals.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm mb-3">
                  No goals yet — create your first goal
                </p>
                <a
                  href="/goals"
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Create goal
                </a>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                {healthGoals.map((goal, idx) => (
                  <div
                    key={goal.id}
                    className={`flex items-center gap-3 py-3 ${
                      idx !== healthGoals.length - 1
                        ? 'border-b border-white/[0.05]'
                        : ''
                    }`}
                  >
                    {/* Health score circle */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 font-bold text-xs"
                      style={{
                        borderColor: getHealthColor(goal.healthScore),
                        backgroundColor: getHealthColor(goal.healthScore) + '15',
                        color: getHealthColor(goal.healthScore)
                      }}
                    >
                      {goal.healthScore !== null && goal.healthScore !== undefined
                        ? Math.round(goal.healthScore)
                        : '–'}
                    </div>

                    {/* Goal title and health status */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {goal.title}
                      </div>
                      <div
                        style={{ color: getHealthColor(goal.healthScore) }}
                        className="text-xs mt-0.5"
                      >
                        {getHealthStatus(goal.healthScore)}
                      </div>
                    </div>

                    {/* Priority badge and progress */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(
                          goal.priority
                        )}`}
                      >
                        {getPriorityLabel(goal.priority)}
                      </span>
                      {isLeafGoal(goal) && isTrackedGoal(goal) && (
                        <span className="text-xs text-slate-500">
                          {goal.currentValue}/{goal.targetValue}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activities */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Recent Activities
              </h2>
              <a
                href="/activities"
                className="text-xs text-slate-500 hover:text-white transition-colors"
              >
                View all
              </a>
            </div>

            {recentActivities.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm mb-3">No activities yet</p>
                <button
                  onClick={() => setIsQuickLogOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Log Activity
                </button>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                {recentActivities.map((activity, idx) => {
                  const activityTime = new Date(activity.startTime).toLocaleTimeString(
                    'en-IN',
                    {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }
                  );

                  return (
                    <div
                      key={activity.id}
                      className={`flex items-center gap-3 py-3 ${
                        idx !== recentActivities.length - 1
                          ? 'border-b border-white/[0.05]'
                          : ''
                      }`}
                    >
                      {/* Time */}
                      <div className="text-xs text-slate-500 w-16 flex-shrink-0">
                        {activityTime}
                      </div>

                      {/* Activity name and goal link */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {activity.name}
                        </div>
                        {activity.goalId && (
                          <div className="text-xs text-slate-600 mt-0.5">
                            Linked to goal
                          </div>
                        )}
                      </div>

                      {/* Mood and relative time */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {activity.mood && (
                          <span className="text-sm">{activity.mood}</span>
                        )}
                        <span className="text-xs text-slate-600">
                          {getRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Due Soon */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Due Soon</h2>

            {dueSoonGoals.length === 0 ? (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                <p className="text-slate-500 text-sm">
                  No goals due in next 7 days
                </p>
              </div>
            ) : (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
                {dueSoonGoals.map((goal, idx) => {
                  const days = Math.ceil(
                    (new Date(goal.targetDate) - new Date()) /
                      (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={goal.id}
                      className={`py-2.5 ${
                        idx !== dueSoonGoals.length - 1
                          ? 'border-b border-white/[0.05]'
                          : ''
                      }`}
                    >
                      <div className="text-sm font-medium text-white truncate">
                        {goal.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">
                          {formatDate(goal.targetDate)}
                        </span>
                        <span
                          className={`text-xs ${
                            days <= 3 ? 'text-red-400' : 'text-yellow-400'
                          }`}
                        >
                          {days}d left
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-sm font-medium text-slate-400 mb-4">
              Quick Actions
            </h2>

            <div className="space-y-2">
              {/* Log Activity Button */}
              <button
                onClick={() => setIsQuickLogOpen(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
              >
                <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-sm text-white">Log Activity</span>
              </button>

              {/* New Goal Button */}
              <button
                onClick={() => router.push('/goals')}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.06] transition-all"
              >
                <Target className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span className="text-sm text-white">New Goal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
