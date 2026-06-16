'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  LineChart as LineChartIcon,
  Link2,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { goalsApi, priorityApi } from '@/lib/api/goalsApi';
import {
  formatHealthScore,
  getHealthBadgeClass,
  getHealthColor,
  getHealthStatus,
} from '@/lib/utils/healthUtils';
import {
  getGoalTypeLabel,
  getPriorityColor,
  getPriorityLabel,
  getPriorityValue,
} from '@/lib/utils/goalUtils';

const ANALYTICS_DAYS = 14;
const ACTIVITY_PAGE_SIZE = 2000;
const NO_GOAL_KEY = 'group_no_goal';
const ACTIVITY_CHART_TYPES = [
  { value: 'stacked', label: 'Stacked Bar', Icon: BarChart2 },
  { value: 'line', label: 'Line', Icon: LineChartIcon },
];
const ACTIVITY_QUICK_RANGES = [
  { value: '14d', label: 'Last 14 days', days: 14 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];
const ACTIVE_EXCLUDED_STATUSES = new Set([
  'COMPLETED',
  'ARCHIVED',
  'CANCELLED',
  'DELETED',
]);

const CHART_COLORS = [
  '#6366f1',
  '#22c55e',
  '#f59e0b',
  '#06b6d4',
  '#ef4444',
  '#14b8a6',
  '#a855f7',
  '#f97316',
  '#84cc16',
  '#ec4899',
  '#64748b',
  '#3b82f6',
];

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getPathValue(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function asArray(response, paths = []) {
  const value = unwrapResponse(response);
  if (Array.isArray(value)) return value;

  for (const path of paths) {
    const nested = getPathValue(value, path);
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function getGoalId(goal) {
  return goal?.id || goal?.uuid || goal?.goalId || goal?.goalUuid;
}

function getGoalTitle(goal) {
  return goal?.title || goal?.name || 'Untitled goal';
}

function getActivityGoalId(activity) {
  return (
    activity?.goalId ||
    activity?.goalUuid ||
    activity?.goal?.id ||
    activity?.goal?.uuid
  );
}

function getActivityDateValue(activity) {
  return (
    activity?.startTime ||
    activity?.startedAt ||
    activity?.createdAt ||
    activity?.created_at
  );
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKey(date);
}

function getDefaultActivityRange(days = ANALYTICS_DAYS) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  return {
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
  };
}

function getActivityRangeFilter(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  if (!start || !end) return {};

  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startTime: start.toISOString(),
    endTime: endOfDay.toISOString(),
  };
}

function getRangeDays(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  if (!start || !end || end < start) return 0;

  return Math.round((end - start) / 86400000) + 1;
}

function getDateWindow(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  if (!start || !end || end < start) return [];

  const days = getRangeDays(range);

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date: formatDateKey(date),
      day: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      }),
      weekday: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      total: 0,
    };
  });
}

function formatActivityRangeLabel(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  const days = getRangeDays(range);

  if (!start || !end || days === 0) return 'selected range';

  const formatOptions = {
    day: '2-digit',
    month: 'short',
  };

  return `${start.toLocaleDateString('en-IN', formatOptions)} - ${end.toLocaleDateString(
    'en-IN',
    formatOptions
  )} (${days} days)`;
}

function getDurationMinutes(activity) {
  const explicit = toOptionalNumber(
    activity?.durationMinutes || activity?.durationInMinutes || activity?.minutes
  );
  if (explicit !== null) return explicit;

  if (!activity?.startTime || !activity?.endTime) return 0;
  const start = new Date(activity.startTime);
  const end = new Date(activity.endTime);
  const diff = end - start;

  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 60000);
}

function formatMinutes(minutes) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  if (safeMinutes < 60) return `${safeMinutes}m`;

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function formatStatus(status) {
  if (!status) return 'Active';
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatLastLogged(value) {
  if (!value) return 'No recent log';

  const logged = new Date(value);
  if (Number.isNaN(logged.getTime())) return 'No recent log';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const loggedDay = new Date(logged);
  loggedDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - loggedDay) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;

  return logged.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function getProgressPercentage(goal) {
  const explicit = toOptionalNumber(
    goal?.progressPercentage ??
      goal?.progressPercent ??
      goal?.completionPercentage
  );
  if (explicit !== null) return clamp(explicit);

  const current = toOptionalNumber(goal?.currentValue ?? goal?.currentProgress);
  const target = toOptionalNumber(goal?.targetValue ?? goal?.targetProgress);

  if (current !== null && target !== null && target > 0) {
    return clamp((current / target) * 100);
  }

  return null;
}

function getGoalPriorityScore(goal) {
  const effective = toOptionalNumber(
    goal?.effectivePriorityScore ?? goal?.priorityScore
  );
  return effective ?? getPriorityValue(goal?.priority);
}

function isActiveGoal(goal) {
  const status = String(goal?.status || '').toUpperCase();
  return !status || !ACTIVE_EXCLUDED_STATUSES.has(status);
}

function mergeGoalLists(...goalLists) {
  const goalsById = new Map();

  goalLists.flat().forEach((goal) => {
    if (!goal) return;

    const id = getGoalId(goal);
    const key = id ? String(id) : `title:${getGoalTitle(goal)}`;
    goalsById.set(key, {
      ...(goalsById.get(key) || {}),
      ...goal,
      id: id || goal.id || key,
    });
  });

  return Array.from(goalsById.values());
}

function sortGoalsByPriority(a, b) {
  const scoreDiff = getGoalPriorityScore(b) - getGoalPriorityScore(a);
  if (scoreDiff !== 0) return scoreDiff;

  const priorityDiff = getPriorityValue(b?.priority) - getPriorityValue(a?.priority);
  if (priorityDiff !== 0) return priorityDiff;

  const aHealth = toOptionalNumber(a?.healthScore);
  const bHealth = toOptionalNumber(b?.healthScore);
  if (aHealth !== null && bHealth !== null && aHealth !== bHealth) {
    return aHealth - bHealth;
  }

  return getGoalTitle(a).localeCompare(getGoalTitle(b));
}

function getGoalGroupKey(goalId) {
  return `goal_${String(goalId).replace(/[^a-zA-Z0-9]/g, '_')}`;
}

function buildActivityGroup(activity, goalsById) {
  const goalId = getActivityGoalId(activity);
  if (!goalId) {
    return {
      key: NO_GOAL_KEY,
      label: 'No Goal',
      goalId: null,
    };
  }

  const goal = goalsById.get(String(goalId));
  return {
    key: getGoalGroupKey(goalId),
    label:
      goal?.title ||
      goal?.name ||
      activity?.goalTitle ||
      activity?.goalName ||
      'Linked Goal',
    goalId: String(goalId),
  };
}

function getGoalsByStatus(stats, goals) {
  const statusRowsFromStats = [
    { name: 'Completed', value: toNumber(stats?.completedGoals), color: '#22c55e' },
    { name: 'In Progress', value: toNumber(stats?.inProgressGoals), color: '#3b82f6' },
    { name: 'Not Started', value: toNumber(stats?.notStartedGoals), color: '#64748b' },
    { name: 'Overdue', value: toNumber(stats?.overdueGoals), color: '#ef4444' },
  ].filter((item) => item.value > 0);

  if (statusRowsFromStats.length > 0) return statusRowsFromStats;

  const counts = goals.reduce((acc, goal) => {
    const status = formatStatus(goal?.status);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, value], index) => ({
    name,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
  }));
}

function getInsightClasses(tone) {
  switch (tone) {
    case 'danger':
      return 'border-red-500/20 bg-red-500/10 text-red-300';
    case 'warning':
      return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
    case 'success':
      return 'border-green-500/20 bg-green-500/10 text-green-300';
    default:
      return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
  }
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
      <div className="mb-4">
        <div className="text-base font-semibold text-white">{title}</div>
        {subtitle ? (
          <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function StatCard({ icon: Icon, iconColor, label, value, detail }) {
  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 flex items-center gap-3 min-w-0">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-slate-500 truncate">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5 truncate">{value}</div>
        {detail ? (
          <div className="text-xs text-slate-600 mt-0.5 truncate">{detail}</div>
        ) : null}
      </div>
    </div>
  );
}

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const rows = payload
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-[#080816] px-3 py-2 shadow-xl">
      <div className="text-xs font-semibold text-white">{label}</div>
      <div className="text-xs text-slate-500 mb-2">{total} logs</div>
      <div className="space-y-1">
        {rows.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="max-w-40 truncate text-slate-300">
              {item.name}
            </span>
            <span className="ml-auto font-medium text-white">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon = BarChart2, title, body }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center text-center">
      <Icon className="w-10 h-10 text-slate-700" />
      <div className="mt-3 text-sm font-medium text-slate-300">{title}</div>
      {body ? <div className="mt-1 text-xs text-slate-500">{body}</div> : null}
    </div>
  );
}

function GoalPerformanceRow({ goal, index }) {
  const healthStatus = getHealthStatus(goal.healthScore);
  const progress =
    goal.progressPercentage === null ? null : Math.round(goal.progressPercentage);

  return (
    <div className="grid grid-cols-1 gap-3 border-b border-white/[0.05] py-4 last:border-b-0 lg:grid-cols-[minmax(0,1.7fr)_120px_160px_130px_110px] lg:items-center">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-xs text-slate-400 flex-shrink-0">
          {index + 1}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${getPriorityColor(
                goal.priority
              )}`}
            >
              {getPriorityLabel(goal.priority)}
            </span>
            <div className="text-sm font-medium text-white truncate">
              {getGoalTitle(goal)}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{getGoalTypeLabel(goal.goalType)}</span>
            <span>{formatStatus(goal.status)}</span>
            {goal.effectivePriorityScore ? (
              <span>Score {toNumber(goal.effectivePriorityScore).toFixed(1)}</span>
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 lg:hidden">Health</div>
        <span
          className={`inline-flex text-xs px-2 py-0.5 rounded-full border ${getHealthBadgeClass(
            goal.healthScore
          )}`}
        >
          {healthStatus === 'UNTRACKED'
            ? 'UNTRACKED'
            : `${formatHealthScore(goal.healthScore)} ${healthStatus}`}
        </span>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="font-medium text-slate-300">
            {progress === null ? '-' : `${progress}%`}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-2 rounded-full bg-blue-500"
            style={{ width: `${progress ?? 0}%` }}
          />
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 lg:hidden">Recent activity</div>
        <div className="text-sm font-semibold text-white">
          {goal.recentActivityCount} logs
        </div>
        <div className="text-xs text-slate-500">
          {formatMinutes(goal.recentMinutes)}
        </div>
      </div>

      <div>
        <div className="text-xs text-slate-500 lg:hidden">Last logged</div>
        <div className="text-sm text-slate-300">
          {formatLastLogged(goal.lastLoggedAt)}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [activityGoalIdFromUrl, setActivityGoalIdFromUrl] = useState(null);
  const activityGoalKeyFromUrl = activityGoalIdFromUrl
    ? getGoalGroupKey(activityGoalIdFromUrl)
    : null;
  const [stats, setStats] = useState(null);
  const [healthGoals, setHealthGoals] = useState([]);
  const [allGoals, setAllGoals] = useState([]);
  const [priorityGoals, setPriorityGoals] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loadErrors, setLoadErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(null);
  const [activityRange, setActivityRange] = useState(() =>
    getDefaultActivityRange()
  );
  const [activityChartType, setActivityChartType] = useState('stacked');
  const [selectedActivityKeys, setSelectedActivityKeys] = useState(null);
  const [isActivityGoalMenuOpen, setIsActivityGoalMenuOpen] = useState(false);
  const [appliedActivityGoalKey, setAppliedActivityGoalKey] = useState(null);

  useEffect(() => {
    const goalId = new URLSearchParams(window.location.search).get('goal');
    if (goalId) setActivityGoalIdFromUrl(goalId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoading(true);
      setLoadErrors([]);

      const results = await Promise.allSettled([
        goalsApi.getStatistics(),
        goalsApi.getHealthSummary(),
        goalsApi.getAll(),
        priorityApi.getSortedGoals(),
      ]);

      if (!isMounted) return;

      const [statsRes, healthRes, goalsRes, priorityRes] = results.map((result) =>
        result.status === 'fulfilled' ? result.value : null
      );

      setStats(unwrapResponse(statsRes) || null);
      setHealthGoals(
        asArray(healthRes, ['goals', 'healthGoals', 'healthSummary', 'items', 'content'])
      );
      setAllGoals(asArray(goalsRes, ['goals', 'items', 'content']));
      setPriorityGoals(asArray(priorityRes, ['goals', 'items', 'content']));
      setLoadErrors(
        results
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason?.message || 'Unable to load data')
      );
      setIsLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      setIsActivityLoading(true);
      setActivityError(null);

      try {
        const response = await activitiesApi.search(getActivityRangeFilter(activityRange), {
          page: 0,
          size: ACTIVITY_PAGE_SIZE,
          sortBy: 'createdAt',
          sortDirection: 'DESC',
        });

        if (!isMounted) return;

        setActivities(
          asArray(response, [
            'activities',
            'content',
            'items',
            'data.activities',
          ])
        );
      } catch (error) {
        if (!isMounted) return;

        setActivities([]);
        setActivityError(error?.message || 'Unable to load activity data');
      } finally {
        if (isMounted) setIsActivityLoading(false);
      }
    };

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [activityRange]);

  const mergedGoals = useMemo(
    () => mergeGoalLists(allGoals, priorityGoals, healthGoals),
    [allGoals, priorityGoals, healthGoals]
  );

  const goalsById = useMemo(() => {
    const map = new Map();
    mergedGoals.forEach((goal) => {
      const id = getGoalId(goal);
      if (id) map.set(String(id), goal);
    });
    return map;
  }, [mergedGoals]);

  const goalActivity = useMemo(() => {
    const map = new Map();

    activities.forEach((activity) => {
      if (activity.entryType === 'SKIP') return; // skips never count toward goal activity stats
      const goalId = getActivityGoalId(activity);
      if (!goalId) return;

      const key = String(goalId);
      const dateValue = getActivityDateValue(activity);
      const current = map.get(key) || {
        count: 0,
        minutes: 0,
        lastLoggedAt: null,
      };

      current.count += 1;
      current.minutes += getDurationMinutes(activity);

      if (
        dateValue &&
        (!current.lastLoggedAt ||
          new Date(dateValue) > new Date(current.lastLoggedAt))
      ) {
        current.lastLoggedAt = dateValue;
      }

      map.set(key, current);
    });

    return map;
  }, [activities]);

  const activeGoalPerformance = useMemo(
    () =>
      mergedGoals
        .filter(isActiveGoal)
        .map((goal) => {
          const id = getGoalId(goal);
          const activity = id ? goalActivity.get(String(id)) : null;

          return {
            ...goal,
            healthScore: toOptionalNumber(goal.healthScore),
            progressPercentage: getProgressPercentage(goal),
            priorityScore: getGoalPriorityScore(goal),
            recentActivityCount: activity?.count || 0,
            recentMinutes: activity?.minutes || 0,
            lastLoggedAt: activity?.lastLoggedAt || null,
          };
        })
        .sort(sortGoalsByPriority),
    [mergedGoals, goalActivity]
  );

  const activityInsights = useMemo(() => {
    const rows = getDateWindow(activityRange);
    const rowsByDate = new Map(rows.map((row) => [row.date, row]));
    const groups = new Map();
    let total = 0;
    let goalLinked = 0;
    let noGoal = 0;

    activeGoalPerformance.forEach((goal) => {
      const goalId = getGoalId(goal);
      if (!goalId) return;

      const key = getGoalGroupKey(goalId);
      groups.set(key, {
        key,
        label: getGoalTitle(goal),
        goalId: String(goalId),
        total: 0,
        minutes: 0,
      });
    });

    activities.forEach((activity) => {
      if (activity.entryType === 'SKIP') return; // skips are not counted in activity insights
      const dateKey = getLocalDateKey(getActivityDateValue(activity));
      const row = rowsByDate.get(dateKey);
      if (!row) return;

      const group = buildActivityGroup(activity, goalsById);
      const durationMinutes = getDurationMinutes(activity);

      if (!groups.has(group.key)) {
        groups.set(group.key, {
          ...group,
          total: 0,
          minutes: 0,
        });
      }

      const groupStats = groups.get(group.key);
      groupStats.total += 1;
      groupStats.minutes += durationMinutes;

      row[group.key] = (row[group.key] || 0) + 1;
      row.total += 1;
      total += 1;

      if (group.key === NO_GOAL_KEY) noGoal += 1;
      else goalLinked += 1;
    });

    const series = Array.from(groups.values()).sort((a, b) => {
      if (a.key === NO_GOAL_KEY) return 1;
      if (b.key === NO_GOAL_KEY) return -1;
      return b.total - a.total;
    });

    const colorByKey = new Map(
      series.map((group, index) => [
        group.key,
        group.key === NO_GOAL_KEY
          ? '#64748b'
          : CHART_COLORS[index % CHART_COLORS.length],
      ])
    );

    rows.forEach((row) => {
      series.forEach((group) => {
        row[group.key] = row[group.key] || 0;
      });
    });

    return {
      rows,
      series,
      total,
      goalLinked,
      noGoal,
      colorByKey,
    };
  }, [activities, activeGoalPerformance, activityRange, goalsById]);

  const activityRangeDays = getRangeDays(activityRange);
  const activityRangeLabel = formatActivityRangeLabel(activityRange);

  const activityGroupKeys = useMemo(
    () => activityInsights.series.map((group) => group.key),
    [activityInsights.series]
  );

  useEffect(() => {
    if (!activityGoalKeyFromUrl) {
      if (appliedActivityGoalKey) setAppliedActivityGoalKey(null);
      return;
    }

    if (appliedActivityGoalKey === activityGoalKeyFromUrl) return;
    if (!activityGroupKeys.includes(activityGoalKeyFromUrl)) return;

    setSelectedActivityKeys([activityGoalKeyFromUrl]);
    setAppliedActivityGoalKey(activityGoalKeyFromUrl);
    setIsActivityGoalMenuOpen(false);

    window.setTimeout(() => {
      document
        .getElementById('activities-by-goal')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }, [activityGoalKeyFromUrl, activityGroupKeys, appliedActivityGoalKey]);

  const selectedActivityGroupKeys = useMemo(() => {
    const availableKeys = new Set(activityGroupKeys);
    const keys = selectedActivityKeys ?? activityGroupKeys;

    return new Set(keys.filter((key) => availableKeys.has(key)));
  }, [activityGroupKeys, selectedActivityKeys]);

  const visibleActivityInsights = useMemo(() => {
    const series = activityInsights.series.filter((group) =>
      selectedActivityGroupKeys.has(group.key)
    );

    const rows = activityInsights.rows.map((row) => {
      const nextRow = { ...row, total: 0 };
      series.forEach((group) => {
        const value = toNumber(row[group.key]);
        nextRow[group.key] = value;
        nextRow.total += value;
      });
      return nextRow;
    });

    return {
      ...activityInsights,
      rows,
      series,
      total: rows.reduce((sum, row) => sum + row.total, 0),
    };
  }, [activityInsights, selectedActivityGroupKeys]);

  const selectedActivityCount = selectedActivityGroupKeys.size;
  const allActivityGroupsSelected =
    activityGroupKeys.length > 0 &&
    selectedActivityCount === activityGroupKeys.length;
  const selectedActivityTotal = visibleActivityInsights.total;
  const activityGoalSelectionLabel = allActivityGroupsSelected
    ? 'All goals'
    : selectedActivityCount === 0
      ? 'No goals selected'
      : `${selectedActivityCount} goal${selectedActivityCount === 1 ? '' : 's'}`;
  const activityGoalSelectionDetail = `${selectedActivityTotal} activit${
    selectedActivityTotal === 1 ? 'y' : 'ies'
  } in range`;
  const activityChartTitle =
    selectedActivityCount === 1 && visibleActivityInsights.series[0]?.label
      ? `Activities for ${visibleActivityInsights.series[0].label}`
      : 'Activities by Goal';

  const selectAllActivityGroups = () => {
    setSelectedActivityKeys(null);
  };

  const clearActivityGroups = () => {
    setSelectedActivityKeys([]);
  };

  const toggleActivityGroup = (key) => {
    setSelectedActivityKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys ?? activityGroupKeys);

      if (nextKeys.has(key)) {
        nextKeys.delete(key);
      } else {
        nextKeys.add(key);
      }

      return Array.from(nextKeys);
    });
  };

  const setQuickActivityRange = (days) => {
    setActivityRange(getDefaultActivityRange(days));
  };

  const setActivityDate = (field, value) => {
    setActivityRange((current) => {
      const next = { ...current, [field]: value };

      if (next.startDate && next.endDate && next.startDate > next.endDate) {
        if (field === 'startDate') next.endDate = next.startDate;
        else next.startDate = next.endDate;
      }

      return next;
    });
  };

  const goalsByStatus = useMemo(
    () => getGoalsByStatus(stats, mergedGoals),
    [stats, mergedGoals]
  );

  const needsAttention = useMemo(
    () =>
      activeGoalPerformance.filter((goal) => {
        const status = getHealthStatus(goal.healthScore);
        return (
          status === 'CRITICAL' ||
          status === 'AT_RISK' ||
          status === 'UNTRACKED' ||
          goal.recentActivityCount === 0
        );
      }),
    [activeGoalPerformance]
  );

  const quickWins = useMemo(() => {
    const insights = [];
    const staleHighPriority = activeGoalPerformance.filter(
      (goal) =>
        getPriorityValue(goal.priority) >= 3 && goal.recentActivityCount === 0
    );
    const weakHealth = activeGoalPerformance.filter((goal) =>
      ['CRITICAL', 'AT_RISK'].includes(getHealthStatus(goal.healthScore))
    );
    const untracked = activeGoalPerformance.filter(
      (goal) => getHealthStatus(goal.healthScore) === 'UNTRACKED'
    );

    if (staleHighPriority.length > 0) {
      const names = staleHighPriority.slice(0, 2).map(getGoalTitle).join(', ');
      const extra =
        staleHighPriority.length > 2
          ? ` and ${staleHighPriority.length - 2} more`
          : '';

      insights.push({
        tone: 'danger',
        title: 'High-priority goals are quiet',
        body: `${names}${extra} ${
          staleHighPriority.length === 1 ? 'has' : 'have'
        } no logs in the selected ${activityRangeDays || ANALYTICS_DAYS}-day range.`,
      });
    }

    if (weakHealth.length > 0) {
      insights.push({
        tone: 'warning',
        title: 'Health needs attention',
        body: `${weakHealth.length} active goal${
          weakHealth.length === 1 ? '' : 's'
        } are at risk or critical right now.`,
      });
    }

    if (activityInsights.noGoal > 0) {
      insights.push({
        tone: 'info',
        title: 'Unlinked activity is hiding progress',
        body: `${activityInsights.noGoal} recent log${
          activityInsights.noGoal === 1 ? '' : 's'
        } are not connected to any goal.`,
      });
    }

    if (untracked.length > 0) {
      insights.push({
        tone: 'info',
        title: 'Tracking setup is incomplete',
        body: `${untracked.length} active goal${
          untracked.length === 1 ? '' : 's'
        } do not have a health score yet.`,
      });
    }

    if (insights.length === 0) {
      insights.push({
        tone: 'success',
        title: 'No obvious quick fixes',
        body: 'Active goals have recent logs and no urgent health warnings.',
      });
    }

    return insights.slice(0, 4);
  }, [activeGoalPerformance, activityInsights.noGoal, activityRangeDays]);

  const linkedRate =
    activityInsights.total === 0
      ? '-'
      : `${Math.round((activityInsights.goalLinked / activityInsights.total) * 100)}%`;

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="h-8 w-32 bg-white/5 rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-white/5 rounded animate-pulse mb-8" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-24 bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>

        <div className="h-80 bg-white/5 rounded-xl animate-pulse mb-6" />
        <div className="h-80 bg-white/5 rounded-xl animate-pulse mb-6" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
          <div className="h-64 bg-white/5 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 text-sm mt-1">
          Priority, progress, and recent activity across your goals
        </p>
      </div>

      {loadErrors.length > 0 ? (
        <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          Some analytics data could not load. Showing the available data.
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Target}
          iconColor="bg-blue-500/10 text-blue-400"
          label="Active Goals"
          value={activeGoalPerformance.length}
          detail={`${needsAttention.length} need attention`}
        />
        <StatCard
          icon={Zap}
          iconColor="bg-yellow-500/10 text-yellow-400"
          label={`Activities ${activityRangeDays || ANALYTICS_DAYS}d`}
          value={isActivityLoading ? '...' : activityInsights.total}
          detail={`${activityInsights.goalLinked} linked`}
        />
        <StatCard
          icon={Link2}
          iconColor="bg-green-500/10 text-green-400"
          label="Goal Linked"
          value={linkedRate}
          detail={`${activityInsights.noGoal} no-goal logs`}
        />
        <StatCard
          icon={AlertTriangle}
          iconColor="bg-red-500/10 text-red-400"
          label="At Risk"
          value={needsAttention.length}
          detail="Health or activity gaps"
        />
      </div>

      <ChartCard
        title="Active Goals by Priority"
        subtitle="Performance is ordered by effective priority first"
      >
        {activeGoalPerformance.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No active goals"
            body="Create or resume goals to see priority performance."
          />
        ) : (
          <>
            <div className="hidden border-b border-white/[0.08] pb-2 text-xs uppercase tracking-wide text-slate-600 lg:grid lg:grid-cols-[minmax(0,1.7fr)_120px_160px_130px_110px]">
              <div>Goal</div>
              <div>Health</div>
              <div>Progress</div>
              <div>Recent</div>
              <div>Last Log</div>
            </div>
            <div>
              {activeGoalPerformance.map((goal, index) => (
                <GoalPerformanceRow
                  key={getGoalId(goal) || `${getGoalTitle(goal)}-${index}`}
                  goal={goal}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </ChartCard>

      <div id="activities-by-goal" className="mt-6 scroll-mt-6">
        <ChartCard
          title={activityChartTitle}
          subtitle={`Count of activity logs by day for ${activityRangeLabel}`}
        >
          <div className="mb-5 rounded-xl border border-indigo-400/15 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.08),rgba(236,72,153,0.05))] p-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Visualisation
                </div>
                <div className="mt-2 inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                  {ACTIVITY_CHART_TYPES.map(({ value, label, Icon }) => {
                    const isActive = activityChartType === value;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setActivityChartType(value)}
                        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${
                          isActive
                            ? 'bg-white text-slate-950 shadow-lg shadow-indigo-950/30'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Time Range
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ACTIVITY_QUICK_RANGES.map((range) => {
                    const preset = getDefaultActivityRange(range.days);
                    const isActive =
                      activityRange.startDate === preset.startDate &&
                      activityRange.endDate === preset.endDate;

                    return (
                      <button
                        key={range.value}
                        type="button"
                        onClick={() => setQuickActivityRange(range.days)}
                        className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                          isActive
                            ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100'
                            : 'border-white/10 bg-black/15 text-slate-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-500">
                    Start
                    <input
                      type="date"
                      value={activityRange.startDate}
                      onChange={(event) =>
                        setActivityDate('startDate', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    End
                    <input
                      type="date"
                      value={activityRange.endDate}
                      onChange={(event) =>
                        setActivityDate('endDate', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="relative max-w-2xl">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Goal Selection
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActivityGoalMenuOpen((isOpen) => !isOpen)}
                    className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1">
                          {visibleActivityInsights.series.slice(0, 4).map((group) => (
                            <span
                              key={group.key}
                              className="h-3 w-3 rounded-full border border-[#080816]"
                              style={{
                                backgroundColor: activityInsights.colorByKey.get(
                                  group.key
                                ),
                              }}
                            />
                          ))}
                        </div>
                        <span className="truncate text-sm font-medium text-white">
                          {activityGoalSelectionLabel}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {activityGoalSelectionDetail}
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 flex-shrink-0 text-slate-500 transition ${
                        isActivityGoalMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isActivityGoalMenuOpen ? (
                    <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-white/10 bg-[#080816] shadow-2xl shadow-black/50">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                        <div className="text-xs text-slate-500">
                          {selectedActivityCount} of {activityGroupKeys.length} shown
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={selectAllActivityGroups}
                            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                              allActivityGroupsSelected
                                ? 'border-emerald-300/40 bg-emerald-300/15 text-emerald-100'
                                : 'border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            All
                          </button>
                          <button
                            type="button"
                            onClick={clearActivityGroups}
                            className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
                          >
                            Clear
                          </button>
                        </div>
                      </div>

                      {activityInsights.series.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          Goals will appear here once analytics data is loaded.
                        </div>
                      ) : (
                        <div className="max-h-72 overflow-y-auto p-2">
                          {activityInsights.series.map((group) => {
                            const isSelected = selectedActivityGroupKeys.has(
                              group.key
                            );

                            return (
                              <button
                                key={group.key}
                                type="button"
                                onClick={() => toggleActivityGroup(group.key)}
                                className={`flex w-full min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                                  isSelected
                                    ? 'bg-white/10 text-white'
                                    : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
                                }`}
                              >
                                <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                                  {isSelected ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                                  ) : null}
                                </span>
                                <span
                                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: activityInsights.colorByKey.get(
                                      group.key
                                    ),
                                  }}
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {group.label}
                                </span>
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                  {group.total} logs
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="border-t border-white/10 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => setIsActivityGoalMenuOpen(false)}
                          className="w-full rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-200"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  ) : null}
              </div>
            </div>
          </div>

          {activityError ? (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {activityError}
            </div>
          ) : null}

          {isActivityLoading ? (
            <EmptyState
              icon={BarChart2}
              title="Loading activity graph"
              body="Fetching logs for the selected range."
            />
          ) : activityInsights.series.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No goals to graph"
              body="Create goals or log activity to start comparing trends."
            />
          ) : selectedActivityCount === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No goals selected"
              body="Choose at least one goal to see the activity graph."
            />
          ) : (
            <div className="min-h-[320px]">
              <ResponsiveContainer width="100%" height={320}>
                {activityChartType === 'stacked' ? (
                  <BarChart
                    data={visibleActivityInsights.rows}
                    margin={{ top: 8, right: 8, bottom: 8, left: -20 }}
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
                      domain={[0, (dataMax) => Math.max(1, dataMax)]}
                    />
                    <Tooltip
                      content={<ActivityTooltip />}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      formatter={(value) => (
                        <span className="text-xs text-slate-400">{value}</span>
                      )}
                    />
                    {visibleActivityInsights.series.map((group, index) => (
                      <Bar
                        key={group.key}
                        dataKey={group.key}
                        stackId="activities"
                        name={group.label}
                        fill={activityInsights.colorByKey.get(group.key)}
                        radius={
                          index === visibleActivityInsights.series.length - 1
                            ? [6, 6, 0, 0]
                            : [0, 0, 0, 0]
                        }
                      />
                    ))}
                  </BarChart>
                ) : (
                  <LineChart
                    data={visibleActivityInsights.rows}
                    margin={{ top: 8, right: 14, bottom: 8, left: -20 }}
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
                      domain={[0, (dataMax) => Math.max(1, dataMax)]}
                    />
                    <Tooltip
                      content={<ActivityTooltip />}
                      cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      formatter={(value) => (
                        <span className="text-xs text-slate-400">{value}</span>
                      )}
                    />
                    {visibleActivityInsights.series.map((group) => (
                      <Line
                        key={group.key}
                        type="monotone"
                        dataKey={group.key}
                        name={group.label}
                        stroke={activityInsights.colorByKey.get(group.key)}
                        strokeWidth={2.5}
                        dot={{ r: 2.5 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard
          title="Goal Health Overview"
          subtitle="Active goals sorted by priority"
        >
          {activeGoalPerformance.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No health data"
              body="Goal health appears once goals have tracking data."
            />
          ) : (
            <div className="space-y-3">
              {activeGoalPerformance.slice(0, 8).map((goal) => (
                <div key={getGoalId(goal)} className="flex items-center gap-3 py-1.5">
                  <div className="w-32 flex-shrink-0 text-xs text-slate-400 truncate text-right">
                    {getGoalTitle(goal)}
                  </div>
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${goal.healthScore || 0}%`,
                        backgroundColor: getHealthColor(goal.healthScore),
                      }}
                    />
                  </div>
                  <div className="w-24 flex-shrink-0 text-xs">
                    <span
                      className="font-medium"
                      style={{ color: getHealthColor(goal.healthScore) }}
                    >
                      {formatHealthScore(goal.healthScore)}
                    </span>
                    <span className="ml-1 text-slate-600">
                      {getHealthStatus(goal.healthScore)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>

        <ChartCard title="Easy Improvements" subtitle="Small actions with high signal">
          <div className="space-y-3">
            {quickWins.map((insight) => (
              <div
                key={insight.title}
                className={`rounded-xl border px-4 py-3 ${getInsightClasses(
                  insight.tone
                )}`}
              >
                <div className="text-sm font-semibold">{insight.title}</div>
                <div className="mt-1 text-xs leading-5 text-slate-300">
                  {insight.body}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ChartCard title="Goal Status Mix" subtitle="Current lifecycle distribution">
          {goalsByStatus.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="No status data"
              body="Goal status distribution will appear after goals are loaded."
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={goalsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={86}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {goalsByStatus.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#080816',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs text-slate-400">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Top Performing Goals" subtitle="Highest active health scores">
          {activeGoalPerformance.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No performance data"
              body="Log activity against goals to build performance signals."
            />
          ) : (
            <div className="space-y-1">
              {[...activeGoalPerformance]
                .sort(
                  (a, b) =>
                    (toOptionalNumber(b.healthScore) ?? -1) -
                    (toOptionalNumber(a.healthScore) ?? -1)
                )
                .slice(0, 5)
                .map((goal, index, list) => (
                  <div
                    key={getGoalId(goal)}
                    className={`flex items-center gap-3 py-2.5 ${
                      index !== list.length - 1 ? 'border-b border-white/[0.05]' : ''
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0 text-xs text-slate-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {getGoalTitle(goal)}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {getPriorityLabel(goal.priority)} - {getGoalTypeLabel(goal.goalType)}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getHealthBadgeClass(
                        goal.healthScore
                      )}`}
                    >
                      {formatHealthScore(goal.healthScore)}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
