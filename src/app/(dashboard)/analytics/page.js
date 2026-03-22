'use client';

import { useEffect, useState } from 'react';
import { Zap, Target, Heart, Flame } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { goalsApi } from '@/lib/api/goalsApi';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { getHealthStatus, getHealthColor, getHealthBadgeClass } from '@/lib/utils/healthUtils';
import { getGoalTypeLabel } from '@/lib/utils/goalUtils';

// ChartCard wrapper component
function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
      <div className="mb-4">
        <div className="text-base font-semibold text-white">{title}</div>
        {subtitle && (
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}

// Stat card component
function StatCard({ icon: Icon, iconColor, label, value }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [healthGoals, setHealthGoals] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, healthRes, goalsRes, activitiesRes] = await Promise.all([
          goalsApi.getStatistics(),
          goalsApi.getHealthSummary(),
          goalsApi.getAll(),
          activitiesApi.search({}, {
            page: 0,
            size: 100,
            sortBy: 'createdAt',
            sortDirection: 'DESC'
          })
        ]);

        // Parse responses
        const parsedStats = statsRes?.data?.data || statsRes?.data || statsRes;
        const parsedHealthGoals = (healthRes?.data?.data || healthRes?.data || healthRes) || [];
        const parsedGoals = (goalsRes?.data?.data || goalsRes?.data || goalsRes) || [];
        const parsedActivities = (
          activitiesRes?.data?.data?.activities ||
          activitiesRes?.data?.activities ||
          activitiesRes?.activities ||
          []
        ) || [];

        setStats(parsedStats);
        setHealthGoals(parsedHealthGoals);
        setAllGoals(parsedGoals);
        setActivities(parsedActivities);
      } catch (e) {
        console.error('Analytics fetch failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper: Get last 7 days of activity data
  const getLast7Days = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = date.toLocaleDateString('en-IN', { weekday: 'short' });
      const count = activities.filter(a => {
        const actDate = new Date(a.startTime || a.created_at)
          .toISOString()
          .split('T')[0];
        return actDate === dateStr;
      }).length;
      days.push({ day: dayLabel, count, date: dateStr });
    }
    return days;
  };

  // Helper: Get goals by status
  const getGoalsByStatus = () => {
    if (!stats) return [];
    return [
      { name: 'Completed', value: stats.completedGoals || 0, color: '#22c55e' },
      { name: 'In Progress', value: stats.inProgressGoals || 0, color: '#6366f1' },
      { name: 'Not Started', value: stats.notStartedGoals || 0, color: '#475569' },
      { name: 'Overdue', value: stats.overdueGoals || 0, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  // Helper: Calculate average mood
  const getAverageMood = () => {
    const moodActivities = activities.filter(a => a.mood);
    if (moodActivities.length === 0) return '–';
    const avgMood = (
      moodActivities.reduce((s, a) => s + a.mood, 0) /
      moodActivities.length
    ).toFixed(1);
    return avgMood;
  };

  // Helper: Get best streak
  const getBestStreak = () => {
    return Math.max(...allGoals.map(g => g.longestStreak || 0), 0);
  };

  // Skeleton components
  const SkeletonCard = () => (
    <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
  );

  const SkeletonList = () => (
    <div className="h-48 bg-white/5 rounded-xl animate-pulse" />
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="h-8 w-32 bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-4 w-48 bg-white/5 rounded animate-pulse mb-8" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>

        <div className="mb-6">
          <SkeletonCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonList />
          <SkeletonList />
        </div>
      </div>
    );
  }

  // Main layout
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">
          Track your progress over time
        </p>
      </div>

      {/* Row 1: Two charts side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Chart 1: Activities This Week */}
        <ChartCard
          title="Activities This Week"
          subtitle="Number of activities logged each day"
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={getLast7Days()}
              margin={{ top: 5, right: 5, bottom: 5, left: -20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="day"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a1a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '12px'
                }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Bar
                dataKey="count"
                fill="#6366f1"
                radius={[6, 6, 0, 0]}
                name="Activities"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Goals by Status */}
        <ChartCard
          title="Goals by Status"
          subtitle="Current status distribution"
        >
          {getGoalsByStatus().length === 0 ? (
            <div className="h-48 flex items-center justify-center">
              <p className="text-slate-500 text-sm text-center">
                No goals data yet
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={getGoalsByStatus()}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {getGoalsByStatus().map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a1a',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                      {value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Full width health chart */}
      <ChartCard
        title="Goal Health Overview"
        subtitle="Health scores across all your goals"
      >
        {healthGoals.length === 0 ? (
          <div className="h-48 flex items-center justify-center">
            <p className="text-slate-500 text-sm text-center">
              No health data yet
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {healthGoals.slice(0, 8).map((goal) => (
              <div key={goal.id} className="flex items-center gap-3 py-2">
                <div className="w-32 flex-shrink-0 text-xs text-slate-400 truncate text-right">
                  {goal.title}
                </div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${goal.healthScore || 0}%`,
                      backgroundColor: getHealthColor(goal.healthScore)
                    }}
                  />
                </div>
                <div className="w-16 flex-shrink-0 flex items-center gap-1">
                  <span
                    className="text-xs font-medium"
                    style={{ color: getHealthColor(goal.healthScore) }}
                  >
                    {goal.healthScore ? Math.round(goal.healthScore) : '–'}
                  </span>
                  <span className="text-xs text-slate-600">
                    {getHealthStatus(goal.healthScore)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      {/* Row 3: Top performing and most neglected */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Top Performing Goals */}
        <ChartCard
          title="Top Performing Goals"
          subtitle="Highest health scores"
        >
          {healthGoals.length === 0 ? (
            <div className="py-8">
              <p className="text-slate-500 text-xs text-center">
                No data yet — log some activities to see scores
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {healthGoals
                .sort((a, b) => (b.healthScore || 0) - (a.healthScore || 0))
                .slice(0, 5)
                .map((goal, idx) => (
                  <div
                    key={goal.id}
                    className={`flex items-center gap-3 py-2.5 ${
                      idx !== Math.min(5, healthGoals.length) - 1
                        ? 'border-b border-white/[0.05]'
                        : ''
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xs text-slate-400">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {goal.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {getGoalTypeLabel(goal.goalType)}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getHealthBadgeClass(
                        goal.healthScore
                      )}`}
                    >
                      {goal.healthScore ? Math.round(goal.healthScore) : '–'}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </ChartCard>

        {/* Most Neglected Goals */}
        <ChartCard
          title="Needs Your Attention"
          subtitle="Goals with lowest health or untracked"
        >
          {healthGoals.length === 0 ? (
            <div className="py-8">
              <p className="text-slate-500 text-xs text-center">
                No data yet — create and track some goals
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {healthGoals
                .sort((a, b) => (a.healthScore || -1) - (b.healthScore || -1))
                .slice(0, 5)
                .map((goal, idx) => {
                  const healthStatus = getHealthStatus(goal.healthScore);
                  let actionHint = '';
                  let actionColor = '';

                  if (healthStatus === 'CRITICAL') {
                    actionHint = 'Log an activity today';
                    actionColor = 'text-red-400';
                  } else if (healthStatus === 'AT_RISK') {
                    actionHint = 'Keep going!';
                    actionColor = 'text-yellow-400';
                  } else if (healthStatus === 'UNTRACKED') {
                    actionHint = 'Setup tracking';
                    actionColor = 'text-slate-500';
                  }

                  return (
                    <div
                      key={goal.id}
                      className={`flex items-center gap-3 py-2.5 ${
                        idx !== Math.min(5, healthGoals.length) - 1
                          ? 'border-b border-white/[0.05]'
                          : ''
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xs text-slate-400">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {goal.title}
                        </div>
                        {actionHint && (
                          <div className={`text-xs mt-0.5 ${actionColor}`}>
                            {actionHint}
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${
                          healthStatus === 'UNTRACKED'
                            ? 'bg-slate-800 text-slate-500 border-slate-700'
                            : getHealthBadgeClass(goal.healthScore)
                        }`}
                      >
                        {healthStatus === 'UNTRACKED' ? 'UNTRACKED' : Math.round(goal.healthScore)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </ChartCard>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <StatCard
          icon={Zap}
          iconColor="bg-yellow-500/10 text-yellow-400"
          label="Total Activities"
          value={activities.length}
        />
        <StatCard
          icon={Target}
          iconColor="bg-blue-500/10 text-blue-400"
          label="Tracked Goals"
          value={stats?.trackedGoals || 0}
        />
        <StatCard
          icon={Heart}
          iconColor="bg-pink-500/10 text-pink-400"
          label="Avg Mood"
          value={
            getAverageMood() === '–'
              ? '–'
              : `${getAverageMood()} 😊`
          }
        />
        <StatCard
          icon={Flame}
          iconColor="bg-orange-500/10 text-orange-400"
          label="Best Streak"
          value={`${getBestStreak()} weeks`}
        />
      </div>
    </div>
  );
}

