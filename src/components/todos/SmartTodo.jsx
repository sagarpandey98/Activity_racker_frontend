'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  Flame,
  Focus,
  Hourglass,
  Layers2,
  ListPlus,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TimerReset,
  Zap,
  X,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { smartTodoApi } from '@/lib/api/goalsApi';
import useUIStore from '@/lib/store/uiStore';

const CHART_COLORS = ['#60a5fa', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#22d3ee', '#fb7185'];
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 23;
const HOUR_HEIGHT = 86;
const SHOW_UP_STORAGE_PREFIX = 'northstar_show_up_tasks';

const PRIORITY_META = {
  CRITICAL: {
    label: 'Critical',
    rank: 0,
    color: '#fb7185',
    dot: 'bg-rose-400',
    badge: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
    block: 'border-rose-400/30 bg-gradient-to-r from-rose-500/25 via-fuchsia-500/10 to-slate-950/80 shadow-rose-500/10',
    rail: 'from-rose-400 to-fuchsia-400',
  },
  HIGH: {
    label: 'High',
    rank: 1,
    color: '#f59e0b',
    dot: 'bg-amber-400',
    badge: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    block: 'border-amber-400/30 bg-gradient-to-r from-amber-500/25 via-orange-500/10 to-slate-950/80 shadow-amber-500/10',
    rail: 'from-amber-300 to-orange-400',
  },
  MEDIUM: {
    label: 'Medium',
    rank: 2,
    color: '#38bdf8',
    dot: 'bg-sky-400',
    badge: 'border-sky-400/25 bg-sky-500/15 text-sky-200',
    block: 'border-sky-400/25 bg-gradient-to-r from-sky-500/20 via-cyan-500/10 to-slate-950/80 shadow-sky-500/10',
    rail: 'from-sky-300 to-cyan-400',
  },
  LOW: {
    label: 'Low',
    rank: 3,
    color: '#94a3b8',
    dot: 'bg-slate-400',
    badge: 'border-slate-400/20 bg-slate-500/15 text-slate-300',
    block: 'border-slate-400/15 bg-gradient-to-r from-slate-500/18 via-slate-700/30 to-slate-950/80 shadow-slate-500/5',
    rail: 'from-slate-400 to-slate-500',
  },
};

const STATUS_META = {
  MUST_DO_TODAY: {
    label: 'Must do',
    rank: 0,
    Icon: Flame,
    badge: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
  },
  CATCH_UP_TODAY: {
    label: 'Catch up',
    rank: 1,
    Icon: Zap,
    badge: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  },
  GOOD_TO_DO_TODAY: {
    label: 'Good to do',
    rank: 2,
    Icon: Target,
    badge: 'border-blue-400/25 bg-blue-500/15 text-blue-200',
  },
  COMPLETED_TODAY: {
    label: 'Completed',
    rank: 3,
    Icon: CheckCircle2,
    badge: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200',
  },
  SHOW_UP_TASK: {
    label: 'Show-up',
    rank: 1.5,
    Icon: ListPlus,
    badge: 'border-violet-400/25 bg-violet-500/15 text-violet-200',
  },
  ACTIVITY_DONE: {
    label: 'Logged',
    rank: 3,
    Icon: CheckCircle2,
    badge: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200',
  },
};

function getTodayKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  if (!dateKey || typeof dateKey !== 'string') return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

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

function getDateRangeFilter(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return {};

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return {
    startTime: date.toISOString(),
    endTime: end.toISOString(),
  };
}

function formatDateLabel(dateKey) {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatClock(totalMinutes) {
  const normalized = Math.max(0, Math.round(totalMinutes)) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function minutesToTimeInput(totalMinutes) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundUpToQuarter(minutes) {
  return Math.ceil(minutes / 15) * 15;
}

function getDefaultPlanStart(selectedDate) {
  if (selectedDate === getTodayKey()) {
    const now = new Date();
    const minutesNow = now.getHours() * 60 + now.getMinutes();
    if (minutesNow >= DAY_START_HOUR * 60 && minutesNow < 20 * 60) {
      return roundUpToQuarter(minutesNow + 10);
    }
  }

  return 8 * 60;
}

function getPriorityMeta(priority) {
  return PRIORITY_META[String(priority || '').toUpperCase()] || PRIORITY_META.LOW;
}

function getStatusMeta(status) {
  return STATUS_META[status] || {
    label: 'Planned',
    rank: 4,
    Icon: Route,
    badge: 'border-white/10 bg-white/5 text-slate-300',
  };
}

function getTodoKey(todo, index) {
  return `${todo.goalId || todo.goalUuid || todo.id || todo.title || 'task'}-${todo.todoStatus || 'todo'}-${index}`;
}

function getTodoTitle(todo) {
  return todo.title || todo.goalTitle || todo.goalName || 'Untitled task';
}

function getTodoType(todo) {
  return todo.goalTypeDisplay || todo.goalType || todo.type || 'General';
}

function getTodoDuration(todo) {
  const candidates = [
    todo.actualDurationMinutes,
    todo.suggestedTimeMinutes,
    todo.timeCommitmentMinutes,
    todo.estimatedMinutes,
    todo.minimumTimeCommittedPerActivity,
    todo.minimumTimeCommittedDaily,
  ];
  const value = candidates.map(Number).find((item) => Number.isFinite(item) && item > 0);
  return Math.max(30, Math.round(value || 45));
}

function isCompleted(todo) {
  return (
    todo.todoStatus === 'COMPLETED_TODAY' ||
    todo.todoStatus === 'ACTIVITY_DONE' ||
    todo.completed === true ||
    (Array.isArray(todo.mergedActivities) && todo.mergedActivities.length > 0)
  );
}

function getActivityGoalId(activity) {
  return (
    activity?.goalId ||
    activity?.goalUuid ||
    activity?.goal?.id ||
    activity?.goal?.uuid
  );
}

function getActivityTitle(activity) {
  return activity?.name || activity?.title || activity?.activityName || 'Logged activity';
}

function getDurationMinutesFromActivity(activity) {
  const explicit = Number(
    activity?.durationMinutes ??
    activity?.durationInMinutes ??
    activity?.minutes
  );
  if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);

  const start = new Date(activity?.startTime || activity?.startedAt || '');
  const end = new Date(activity?.endTime || activity?.endedAt || '');
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 30;

  const diff = (end - start) / 60000;
  return diff > 0 ? Math.round(diff) : 30;
}

function getActivityStart(activity) {
  return activity?.startTime || activity?.startedAt || activity?.createdAt || activity?.created_at;
}

function getActivityEnd(activity) {
  return activity?.endTime || activity?.endedAt || activity?.lastUpdatedAt || activity?.updatedAt;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  if ([aStart, aEnd, bStart, bEnd].some((value) => value === null || value === undefined)) {
    return false;
  }
  return aStart < bEnd && bStart < aEnd;
}

function buildActivityTodo(activity, selectedDate) {
  const duration = getDurationMinutesFromActivity(activity);
  const startValue = getActivityStart(activity);
  const endValue = getActivityEnd(activity);
  const goalId = getActivityGoalId(activity);

  return {
    id: `activity-${activity?.uuid || activity?.id || startValue || getActivityTitle(activity)}`,
    goalId,
    title: getActivityTitle(activity),
    priority: 'LOW',
    priorityDisplay: 'Logged',
    goalType: goalId
      ? (activity?.goalTitle || activity?.goalName || activity?.goal?.title || 'Goal activity')
      : 'General activity',
    todoStatus: 'ACTIVITY_DONE',
    actualDurationMinutes: duration,
    suggestedTimeMinutes: duration,
    startTime: startValue,
    endTime: endValue,
    progressDisplay: 'Logged today',
    completed: true,
    isActivityLog: true,
    activityDate: selectedDate,
    activity,
  };
}

function buildShowUpTodo(task, selectedDate) {
  const startMinutes = extractMinutesFromValue(task.startTime, selectedDate);
  const duration = Math.max(15, Number(task.durationMinutes) || 45);
  const endMinutes = startMinutes === null ? null : Math.min(startMinutes + duration, 24 * 60);

  return {
    id: `show-up-${task.id}`,
    title: task.title,
    priority: task.priority || 'MEDIUM',
    priorityDisplay: getPriorityMeta(task.priority || 'MEDIUM').label,
    goalType: task.type || 'Show-up',
    todoStatus: 'SHOW_UP_TASK',
    suggestedTimeMinutes: duration,
    scheduledStartTime: task.startTime || null,
    scheduledEndTime: endMinutes === null ? null : minutesToTimeInput(endMinutes),
    progressDisplay: 'Ready to log',
    isAdhoc: true,
    showUpId: task.id,
    activityDate: selectedDate,
    createdAt: task.createdAt,
  };
}

function mergeActivitiesWithPlannedTasks(plannedItems, activityItems, selectedDate) {
  const merged = plannedItems.map((item) => ({
    ...item,
    mergedActivities: Array.isArray(item.mergedActivities) ? item.mergedActivities : [],
  }));
  const unmatchedActivities = [];

  activityItems.forEach((activityItem) => {
    const activityGoalId = getActivityGoalId(activityItem.activity);
    const activityTitle = normalizeText(getTodoTitle(activityItem));
    const activityStart = getExplicitStartMinutes(activityItem, selectedDate);
    const activityEnd = activityStart === null ? null : activityStart + getTodoDuration(activityItem);

    let bestIndex = -1;
    let bestScore = 0;

    merged.forEach((candidate, index) => {
      const candidateGoalId = candidate.goalId || candidate.goalUuid || candidate.id;
      const candidateTitle = normalizeText(getTodoTitle(candidate));
      const titleMatches =
        activityTitle &&
        candidateTitle &&
        (activityTitle === candidateTitle ||
          activityTitle.includes(candidateTitle) ||
          candidateTitle.includes(activityTitle));
      const goalMatches = activityGoalId && candidateGoalId && String(activityGoalId) === String(candidateGoalId);

      if (!goalMatches && !titleMatches) return;

      const candidateStart = getExplicitStartMinutes(candidate, selectedDate);
      const candidateEnd = candidateStart === null ? null : candidateStart + getTodoDuration(candidate);
      const timeMatches =
        candidateStart === null ||
        activityStart === null ||
        rangesOverlap(candidateStart, candidateEnd, activityStart, activityEnd);

      if (!timeMatches) return;

      const score = (goalMatches ? 4 : 0) + (titleMatches ? 2 : 0) + (candidateStart !== null ? 1 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      unmatchedActivities.push(activityItem);
      return;
    }

    const target = merged[bestIndex];
    const nextMergedActivities = [...target.mergedActivities, activityItem.activity];
    const actualDurationMinutes = nextMergedActivities.reduce(
      (sum, activity) => sum + getDurationMinutesFromActivity(activity),
      0
    );
    const firstActivity = nextMergedActivities
      .map((activity) => getActivityStart(activity))
      .filter(Boolean)
      .sort((a, b) => new Date(a) - new Date(b))[0];
    const lastActivity = nextMergedActivities
      .map((activity) => getActivityEnd(activity) || getActivityStart(activity))
      .filter(Boolean)
      .sort((a, b) => new Date(b) - new Date(a))[0];

    merged[bestIndex] = {
      ...target,
      mergedActivities: nextMergedActivities,
      actualDurationMinutes,
      loggedStartTime: target.scheduledStartTime || target.startTime ? target.loggedStartTime : firstActivity,
      loggedEndTime: lastActivity,
      progressDisplay: target.progressDisplay || 'Logged today',
    };
  });

  return [...merged, ...unmatchedActivities];
}

function getProgressPercentage(todo) {
  if (typeof todo.periodProgressPercentage === 'number') return todo.periodProgressPercentage;
  if (typeof todo.progressPercentage === 'number') return todo.progressPercentage;
  const target = Number(todo.targetProgress);
  const current = Number(todo.currentProgress);
  if (target > 0 && Number.isFinite(current)) return (current / target) * 100;
  return 0;
}

function formatTimeCommitment(minutes, unit = 'hours') {
  const safeMinutes = Math.max(0, Number(minutes) || 0);

  if (unit === 'minutes') {
    return `${Math.round(safeMinutes)}m`;
  }

  const hours = safeMinutes / 60;
  if (hours === 0) return '0h';
  if (hours < 1) return `${hours.toFixed(2)}h`;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

function splitTimeCommitment(minutes, unit = 'hours') {
  const formatted = formatTimeCommitment(minutes, unit);
  const match = formatted.match(/^([0-9.]+)([a-z]+)$/i);
  return {
    value: match?.[1] || formatted,
    label: match?.[2] || '',
  };
}

function extractMinutesFromValue(value, selectedDate) {
  if (!value) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 0 && value <= 24 * 60) return value;
    const asDate = new Date(value);
    if (!Number.isNaN(asDate.getTime())) return asDate.getHours() * 60 + asDate.getMinutes();
  }

  if (typeof value !== 'string') return null;

  const clockMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (clockMatch) {
    const hours = Number(clockMatch[1]);
    const minutes = Number(clockMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  const valueDateKey = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  if (selectedDate && valueDateKey !== selectedDate && /T/.test(value)) return null;

  return parsed.getHours() * 60 + parsed.getMinutes();
}

function getExplicitStartMinutes(todo, selectedDate) {
  const candidates = [
    todo.scheduledStartTime,
    todo.scheduledTime,
    todo.recommendedStartTime,
    todo.loggedStartTime,
    todo.startTime,
    todo.startedAt,
    todo.startAt,
    todo.dueTime,
    todo.dueAt,
    todo.targetTime,
  ];

  for (const value of candidates) {
    const minutes = extractMinutesFromValue(value, selectedDate);
    if (minutes !== null) return minutes;
  }

  return null;
}

function compareTodos(a, b) {
  const statusA = getStatusMeta(a.todoStatus).rank;
  const statusB = getStatusMeta(b.todoStatus).rank;
  if (statusA !== statusB) return statusA - statusB;

  if (Boolean(a.recommendedFocus) !== Boolean(b.recommendedFocus)) {
    return a.recommendedFocus ? -1 : 1;
  }

  const priorityA = getPriorityMeta(a.priority).rank;
  const priorityB = getPriorityMeta(b.priority).rank;
  if (priorityA !== priorityB) return priorityA - priorityB;

  return (a.displayRank || 999) - (b.displayRank || 999);
}

function buildTimelineBlocks(todos, selectedDate) {
  let cursor = getDefaultPlanStart(selectedDate);
  const blocks = [...todos].sort(compareTodos).map((todo, index) => {
    const duration = getTodoDuration(todo);
    const explicitStart = getExplicitStartMinutes(todo, selectedDate);
    const start = Math.min(explicitStart ?? cursor, 23 * 60 + 30);
    const end = Math.min(start + duration, 24 * 60);

    if (explicitStart === null) {
      cursor = Math.min(end + 10, 23 * 60 + 30);
    }

    return {
      todo,
      key: getTodoKey(todo, index),
      start,
      end: Math.min(24 * 60, Math.max(end, start + 30)),
      duration,
      hasExplicitTime: explicitStart !== null,
    };
  });

  const laneEnds = [];
  return blocks
    .sort((a, b) => a.start - b.start || compareTodos(a.todo, b.todo))
    .map((block) => {
      const lane = laneEnds.findIndex((end) => end <= block.start);
      const laneIndex = lane === -1 ? laneEnds.length : lane;
      laneEnds[laneIndex] = block.end;
      return { ...block, lane: laneIndex, laneCount: 1 };
    })
    .map((block, _, allBlocks) => {
      const overlapping = allBlocks.filter(
        (candidate) => candidate.start < block.end && candidate.end > block.start
      );
      return {
        ...block,
        laneCount: Math.max(...overlapping.map((candidate) => candidate.lane)) + 1,
      };
    });
}

function PriorityBadge({ priority, display }) {
  const meta = getPriorityMeta(priority);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {display || meta.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const meta = getStatusMeta(status);
  const Icon = meta.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function ProgressPill({ todo }) {
  const percentage = getProgressPercentage(todo);
  const visualPercentage = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className="min-w-[7.5rem] rounded-lg border border-white/10 bg-black/20 px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wide">
        <span className="text-slate-500">Progress</span>
        <span className="font-semibold text-slate-200">{Math.round(percentage)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400"
          style={{ width: `${visualPercentage}%` }}
        />
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 px-6 py-12 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
        <CheckCircle2 className="h-6 w-6 text-slate-500" />
      </div>
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <div className="mx-auto mt-1 max-w-sm text-xs text-slate-500">{body}</div>
    </div>
  );
}

function getShowUpStorageKey(dateKey) {
  return `${SHOW_UP_STORAGE_PREFIX}_${dateKey}`;
}

function loadShowUpTasks(dateKey) {
  if (typeof window === 'undefined') return [];

  try {
    const stored = window.localStorage.getItem(getShowUpStorageKey(dateKey));
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to load show-up tasks:', error);
    return [];
  }
}

function saveShowUpTasks(dateKey, tasks) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getShowUpStorageKey(dateKey), JSON.stringify(tasks));
}

export default function SmartTodo() {
  const [todos, setTodos] = useState([]);
  const [activities, setActivities] = useState([]);
  const [showUpTasks, setShowUpTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ date: '', timezone: '', listType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeUnit, setTimeUnit] = useState('hours');
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [focusOnly, setFocusOnly] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShowUpForm, setShowShowUpForm] = useState(false);
  const [showUpDraft, setShowUpDraft] = useState({
    title: '',
    startTime: '',
    durationMinutes: '45',
    priority: 'MEDIUM',
    type: 'Show-up',
  });
  const { setIsQuickLogOpen, setPrefillGoal, activityLogVersion } = useUIStore();

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [response, activityResponse] = await Promise.all([
        smartTodoApi.getTodosForDate(selectedDate),
        activitiesApi.search(getDateRangeFilter(selectedDate), {
          page: 0,
          size: 300,
          sortBy: 'startTime',
          sortDirection: 'ASC',
        }).catch((activityError) => {
          console.warn('Failed to load activities for My Tasks:', activityError);
          return null;
        }),
      ]);
      const items = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
          ? response
          : [];
      setTodos(items);
      setActivities(asArray(activityResponse, [
        'activities',
        'content',
        'items',
        'data.activities',
      ]));
      setSummary(response?.summary || null);
      setMeta({
        date: response?.date || selectedDate,
        timezone: response?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        listType: response?.listType || (selectedDate === getTodayKey() ? 'TODAY' : 'DATE'),
      });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load todos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const refreshTodos = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await smartTodoApi.refreshTodos();
      await fetchTodos();
    } catch (err) {
      console.error('Failed to refresh todos:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTodos]);

  const handleTodoClick = useCallback((todo) => {
    const startMinutes = getExplicitStartMinutes(todo, selectedDate);
    const duration = getTodoDuration(todo);
    const prefill = {
      ...todo,
      activityName: getTodoTitle(todo),
      activityDate: selectedDate,
      startTime: startMinutes === null ? todo.startTime : minutesToTimeInput(startMinutes),
      endTime: startMinutes === null
        ? todo.endTime
        : minutesToTimeInput(Math.min(startMinutes + duration, 23 * 60 + 59)),
      isAdhoc: todo.isAdhoc || todo.isActivityLog || !todo.goalId,
    };
    setPrefillGoal(prefill);
    setIsQuickLogOpen(true);
  }, [selectedDate, setIsQuickLogOpen, setPrefillGoal]);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos, activityLogVersion]);

  useEffect(() => {
    setShowUpTasks(loadShowUpTasks(selectedDate));
  }, [selectedDate]);

  const allTaskItems = useMemo(() => {
    const plannedItems = [
      ...todos,
      ...showUpTasks.map((task) => buildShowUpTodo(task, selectedDate)),
    ];
    const activityItems = activities.map((activity) => buildActivityTodo(activity, selectedDate));
    return mergeActivitiesWithPlannedTasks(plannedItems, activityItems, selectedDate);
  }, [activities, selectedDate, showUpTasks, todos]);

  const typeOptions = useMemo(() => (
    Array.from(new Set(allTaskItems.map(getTodoType).filter(Boolean))).sort()
  ), [allTaskItems]);

  const filteredTodos = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return allTaskItems
      .filter((todo) => (
        showCompleted ||
        !isCompleted(todo) ||
        todo.isActivityLog ||
        (Array.isArray(todo.mergedActivities) && todo.mergedActivities.length > 0)
      ))
      .filter((todo) => priorityFilter === 'ALL' || String(todo.priority || '').toUpperCase() === priorityFilter)
      .filter((todo) => typeFilter === 'ALL' || getTodoType(todo) === typeFilter)
      .filter((todo) => statusFilter === 'ALL' || todo.todoStatus === statusFilter)
      .filter((todo) => !focusOnly || todo.recommendedFocus)
      .filter((todo) => {
        if (!search) return true;
        const haystack = [
          getTodoTitle(todo),
          getTodoType(todo),
          todo.priorityDisplay,
          todo.priority,
          todo.recommendedAction,
          ...(Array.isArray(todo.reasonMessages) ? todo.reasonMessages : []),
        ].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(search);
      })
      .sort(compareTodos);
  }, [allTaskItems, focusOnly, priorityFilter, searchTerm, showCompleted, statusFilter, typeFilter]);

  const timelineBlocks = useMemo(() => buildTimelineBlocks(filteredTodos, selectedDate), [filteredTodos, selectedDate]);

  const timelineBounds = useMemo(() => {
    const minStart = Math.min(...timelineBlocks.map((block) => block.start), DAY_START_HOUR * 60);
    const maxEnd = Math.max(...timelineBlocks.map((block) => block.end), DAY_END_HOUR * 60);
    const start = Math.max(0, Math.floor(minStart / 60) * 60);
    const end = Math.min(24 * 60, Math.max((DAY_END_HOUR + 1) * 60, Math.ceil(maxEnd / 60) * 60));
    return { start, end };
  }, [timelineBlocks]);

  const timelineHours = useMemo(() => {
    const count = Math.max(1, (timelineBounds.end - timelineBounds.start) / 60);
    return Array.from({ length: count + 1 }, (_, index) => timelineBounds.start + index * 60);
  }, [timelineBounds]);

  const totalTimelineHeight = ((timelineBounds.end - timelineBounds.start) / 60) * HOUR_HEIGHT;
  const totalCommittedMinutes = filteredTodos.reduce((sum, todo) => sum + getTodoDuration(todo), 0);
  const totalCommittedDisplay = splitTimeCommitment(totalCommittedMinutes, timeUnit);
  const completedCount = allTaskItems.filter(isCompleted).length;
  const totalTaskCount = allTaskItems.length;
  const loggedActivityCount = activities.length;
  const showUpCount = showUpTasks.length;
  const activeFilterCount = [
    priorityFilter !== 'ALL',
    typeFilter !== 'ALL',
    statusFilter !== 'ALL',
    focusOnly,
    showCompleted,
    searchTerm.trim(),
  ].filter(Boolean).length;

  const timeData = filteredTodos
    .filter((todo) => getTodoDuration(todo) > 0)
    .map((todo) => ({
      name: getTodoTitle(todo),
      value: getTodoDuration(todo),
      goalId: todo.goalId,
    }));

  const priorityDist = Object.entries(PRIORITY_META).map(([name, priority]) => ({
    name,
    count: filteredTodos.filter((todo) => getPriorityMeta(todo.priority).label === priority.label).length,
    color: priority.color,
  }));

  const shouldShowNow = selectedDate === getTodayKey();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowWithinTimeline = shouldShowNow && nowMinutes >= timelineBounds.start && nowMinutes <= timelineBounds.end;

  const resetFilters = () => {
    setPriorityFilter('ALL');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setFocusOnly(false);
    setShowCompleted(false);
    setSearchTerm('');
  };

  const handleAddShowUpTask = () => {
    const title = showUpDraft.title.trim();
    if (!title) return;

    const nextTask = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      startTime: showUpDraft.startTime || '',
      durationMinutes: Math.max(15, Number(showUpDraft.durationMinutes) || 45),
      priority: showUpDraft.priority,
      type: showUpDraft.type.trim() || 'Show-up',
      createdAt: new Date().toISOString(),
    };
    const nextTasks = [...showUpTasks, nextTask];
    setShowUpTasks(nextTasks);
    saveShowUpTasks(selectedDate, nextTasks);
    setShowUpDraft({
      title: '',
      startTime: '',
      durationMinutes: '45',
      priority: 'MEDIUM',
      type: 'Show-up',
    });
    setShowShowUpForm(false);
  };

  const handleRemoveShowUpTask = (showUpId) => {
    const nextTasks = showUpTasks.filter((task) => task.id !== showUpId);
    setShowUpTasks(nextTasks);
    saveShowUpTasks(selectedDate, nextTasks);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0B0F19] p-6 shadow-xl">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/10 bg-[#0B0F19] p-6 shadow-xl">
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div className="mb-1 text-sm font-semibold text-slate-200">Error loading tasks</div>
          <div className="mx-auto mb-6 max-w-xs text-xs text-slate-400">{error}</div>
          <button
            type="button"
            onClick={fetchTodos}
            className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-md transition-colors hover:bg-slate-100"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5 shadow-2xl">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-400/0 via-emerald-300/50 to-sky-400/0" />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-500/10 shadow-lg shadow-emerald-500/10">
                <Route className="h-6 w-6 text-emerald-300" />
              </div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight text-white">
                    {selectedDate === getTodayKey() ? "Today's Timetable" : formatDateLabel(selectedDate)}
                  </h3>
                  <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {meta.listType || 'DATE'}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {totalTaskCount} tasks • {meta.timezone || 'UTC'} • {completedCount} done/logged
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:min-w-[25rem]">
              {[
                { label: 'Focus time', value: `${totalCommittedDisplay.value}${totalCommittedDisplay.label}`, tone: 'from-emerald-400 to-cyan-300' },
                { label: 'Logged', value: loggedActivityCount, tone: 'from-emerald-300 to-lime-300' },
                { label: 'Show-ups', value: showUpCount, tone: 'from-violet-300 to-fuchsia-300' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3">
                  <div className={`mb-1 bg-gradient-to-r ${item.tone} bg-clip-text text-lg font-bold leading-none text-transparent`}>
                    {item.value}
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-200">
              <PieChartIcon className="h-4 w-4 text-cyan-300" />
              Day Mix
            </h4>
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {[
                { value: 'hours', label: 'Hrs' },
                { value: 'minutes', label: 'Min' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTimeUnit(option.value)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                    timeUnit === option.value
                      ? 'bg-white text-slate-950'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-4">
            <div className="relative h-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={timeData} innerRadius={34} outerRadius={52} paddingAngle={4} dataKey="value">
                    {timeData.map((entry, index) => (
                      <Cell key={`cell-${entry.goalId || entry.name}-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px' }}
                    itemStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                    formatter={(value) => [formatTimeCommitment(value, timeUnit), 'Time']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold leading-none text-white">{totalCommittedDisplay.value}</span>
                <span className="mt-0.5 text-[9px] font-semibold uppercase text-slate-500">{totalCommittedDisplay.label}</span>
              </div>
            </div>

            <div className="space-y-3">
              {priorityDist.map((priority) => (
                <div key={priority.name}>
                  <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide">
                    <span className="text-slate-500">{PRIORITY_META[priority.name].label}</span>
                    <span style={{ color: priority.color }}>{priority.count}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(priority.count / Math.max(...priorityDist.map((item) => item.count), 1)) * 100}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: priority.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5 shadow-2xl">
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="bg-transparent text-sm font-semibold text-white outline-none [color-scheme:dark]"
              />
            </label>

            <div className="relative min-w-[16rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search tasks"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/40"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-400">
              <Filter className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{activeFilterCount} filters</span>
            </div>

            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#101624] px-3 py-2 text-sm font-medium text-slate-200 outline-none focus:border-emerald-400/40"
            >
              <option value="ALL">All priorities</option>
              {Object.entries(PRIORITY_META).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#101624] px-3 py-2 text-sm font-medium text-slate-200 outline-none focus:border-emerald-400/40"
            >
              <option value="ALL">All types</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-white/10 bg-[#101624] px-3 py-2 text-sm font-medium text-slate-200 outline-none focus:border-emerald-400/40"
            >
              <option value="ALL">All buckets</option>
              {Object.entries(STATUS_META).map(([key, value]) => (
                <option key={key} value={key}>{value.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setFocusOnly((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                focusOnly
                  ? 'border-amber-400/30 bg-amber-500/15 text-amber-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Focus className="h-4 w-4" />
              Focus
            </button>

            <button
              type="button"
              onClick={() => setShowCompleted((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                showCompleted
                  ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Done
            </button>

            <button
              type="button"
              onClick={() => setShowShowUpForm((value) => !value)}
              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                showShowUpForm
                  ? 'border-violet-400/30 bg-violet-500/15 text-violet-200'
                  : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plus className="h-4 w-4" />
              Show-up
            </button>

            <button
              type="button"
              onClick={refreshTodos}
              disabled={isRefreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:text-slate-200 disabled:opacity-50"
              title="Refresh tasks"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:text-slate-200"
                title="Clear filters"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {showShowUpForm ? (
          <div className="mb-5 rounded-2xl border border-violet-400/20 bg-violet-500/[0.08] p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_9rem_8rem_9rem_9rem_auto] lg:items-end">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-200/80">
                  Task
                </span>
                <input
                  type="text"
                  value={showUpDraft.title}
                  onChange={(event) => setShowUpDraft((draft) => ({ ...draft, title: event.target.value }))}
                  placeholder="Unexpected task"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-300/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-200/80">
                  Start
                </span>
                <input
                  type="time"
                  value={showUpDraft.startTime}
                  onChange={(event) => setShowUpDraft((draft) => ({ ...draft, startTime: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-violet-300/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-200/80">
                  Minutes
                </span>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={showUpDraft.durationMinutes}
                  onChange={(event) => setShowUpDraft((draft) => ({ ...draft, durationMinutes: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/50"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-200/80">
                  Priority
                </span>
                <select
                  value={showUpDraft.priority}
                  onChange={(event) => setShowUpDraft((draft) => ({ ...draft, priority: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-[#101624] px-3 py-2 text-sm text-white outline-none focus:border-violet-300/50"
                >
                  {Object.entries(PRIORITY_META).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-violet-200/80">
                  Type
                </span>
                <input
                  type="text"
                  value={showUpDraft.type}
                  onChange={(event) => setShowUpDraft((draft) => ({ ...draft, type: event.target.value }))}
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:border-violet-300/50"
                />
              </label>

              <button
                type="button"
                onClick={handleAddShowUpTask}
                disabled={!showUpDraft.title.trim()}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
        ) : null}

        {summary ? (
          <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
              {[
                { label: 'Must do', value: summary.mustDoTodayCount || 0, tone: 'border-rose-500/20 bg-rose-500/10 text-rose-200' },
                { label: 'Catch up', value: summary.catchUpTodayCount || 0, tone: 'border-amber-500/20 bg-amber-500/10 text-amber-200' },
                { label: 'Good to do', value: summary.goodToDoTodayCount || 0, tone: 'border-blue-500/20 bg-blue-500/10 text-blue-200' },
                { label: 'Completed', value: summary.completedTodayCount || 0, tone: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' },
                { label: 'Show-ups', value: showUpCount, tone: 'border-violet-500/20 bg-violet-500/10 text-violet-200' },
                { label: 'Logged', value: loggedActivityCount, tone: 'border-lime-500/20 bg-lime-500/10 text-lime-200' },
              ].map((chip) => (
              <div key={chip.label} className={`rounded-xl border px-3 py-2 ${chip.tone}`}>
                <div className="text-lg font-bold leading-none">{chip.value}</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">{chip.label}</div>
              </div>
            ))}
          </div>
        ) : null}

        {allTaskItems.length === 0 ? (
          <EmptyState
            title="You are all caught up"
            body="Nothing urgent for this date. You can still plan ahead from this view."
          />
        ) : filteredTodos.length === 0 ? (
          <EmptyState
            title="No tasks match these filters"
            body="Clear one or two filters to bring your timetable back."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
              <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-200">
                    <Clock className="h-4 w-4 text-emerald-300" />
                    Time Table
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">{formatDateLabel(selectedDate)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                    {timelineBlocks.length} blocks
                  </span>
                  <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1">
                    {formatClock(timelineBounds.start)} - {formatClock(timelineBounds.end)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div
                  className="relative min-w-[760px]"
                  style={{ height: totalTimelineHeight + 24 }}
                >
                  {timelineHours.map((hour) => {
                    const top = ((hour - timelineBounds.start) / 60) * HOUR_HEIGHT;
                    return (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 border-t border-white/[0.06]"
                        style={{ top: top + 12 }}
                      >
                        <div className="absolute -top-2 left-4 w-16 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                          {formatClock(hour)}
                        </div>
                      </div>
                    );
                  })}

                  <div className="absolute bottom-3 left-[6.5rem] top-3 w-px bg-gradient-to-b from-emerald-400/30 via-white/10 to-sky-400/20" />

                  {nowWithinTimeline ? (
                    <div
                      className="absolute left-[5.5rem] right-4 z-20 flex items-center gap-2"
                      style={{ top: ((nowMinutes - timelineBounds.start) / 60) * HOUR_HEIGHT + 12 }}
                    >
                      <span className="rounded-full bg-rose-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white shadow-lg shadow-rose-500/30">
                        Now
                      </span>
                      <span className="h-px flex-1 bg-gradient-to-r from-rose-400 to-rose-400/0" />
                    </div>
                  ) : null}

                  <div className="absolute bottom-3 left-[7.5rem] right-4 top-3">
                    {timelineBlocks.map((block) => {
                      const metaPriority = getPriorityMeta(block.todo.priority);
                      const top = ((block.start - timelineBounds.start) / 60) * HOUR_HEIGHT;
                      const height = Math.max(((block.end - block.start) / 60) * HOUR_HEIGHT - 8, 58);
                      const laneGap = 10;
                      const laneWidth = 100 / block.laneCount;
                      const width = `calc(${laneWidth}% - ${(laneGap * (block.laneCount - 1)) / block.laneCount}px)`;
                      const left = `calc(${laneWidth * block.lane}% + ${(block.lane * laneGap) / block.laneCount}px)`;
                      const done = isCompleted(block.todo);
                      const loggedCount =
                        (Array.isArray(block.todo.mergedActivities) ? block.todo.mergedActivities.length : 0) +
                        (block.todo.isActivityLog ? 1 : 0);
                      const isRoomy = height >= 108;
                      const isSpacious = height >= 154;
                      const StatusIcon = getStatusMeta(block.todo.todoStatus).Icon;

                      return (
                        <motion.button
                          key={block.key}
                          type="button"
                          layout
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => handleTodoClick(block.todo)}
                          title={`${getTodoTitle(block.todo)} • ${formatClock(block.start)} - ${formatClock(block.end)}`}
                          className={`absolute overflow-hidden rounded-xl border p-3 text-left shadow-xl transition-all hover:-translate-y-0.5 hover:border-white/30 ${
                            metaPriority.block
                          } ${block.todo.todoStatus === 'COMPLETED_TODAY' ? 'opacity-65' : ''}`}
                          style={{ top, height, left, width }}
                        >
                          <div className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${metaPriority.rail}`} />
                          <div className="flex h-full min-w-0 flex-col justify-between gap-2 pl-1">
                            <div className="min-w-0">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                                  <Clock className="h-3 w-3" />
                                  {formatClock(block.start)}
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {block.hasExplicitTime ? <TimerReset className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
                                  {formatTimeCommitment(block.duration, timeUnit)}
                                </span>
                              </div>
                              <div
                                className={`text-sm font-semibold leading-snug ${done ? 'text-slate-300' : 'text-white'}`}
                                style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: isSpacious ? 3 : isRoomy ? 2 : 1,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {getTodoTitle(block.todo)}
                              </div>
                              {isRoomy ? (
                                <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1.5">
                                  <span className="truncate rounded-md bg-black/20 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                                    {getTodoType(block.todo)}
                                  </span>
                                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${metaPriority.badge}`}>
                                    {metaPriority.label}
                                  </span>
                                  {block.todo.recommendedFocus ? (
                                    <span className="rounded-md bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                                      Focus
                                    </span>
                                  ) : null}
                                  {loggedCount > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                                      <Layers2 className="h-3 w-3" />
                                      {loggedCount} logged
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              {isSpacious && (block.todo.reasonMessages?.[0] || block.todo.recommendedAction || block.todo.progressDisplay) ? (
                                <div
                                  className="mt-2 text-[11px] leading-snug text-slate-400"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  }}
                                >
                                  {block.todo.reasonMessages?.[0] || block.todo.recommendedAction || block.todo.progressDisplay}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                <StatusIcon className="h-3 w-3 shrink-0" />
                                <span className="truncate">{getStatusMeta(block.todo.todoStatus).label}</span>
                              </span>
                              <span className="text-xs font-semibold text-white">
                                {Math.round(getProgressPercentage(block.todo))}%
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-slate-200">
                    <SlidersHorizontal className="h-4 w-4 text-amber-300" />
                    Focus Queue
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">{formatTimeCommitment(totalCommittedMinutes, timeUnit)} planned</p>
                </div>
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold text-slate-400">
                  {filteredTodos.length}
                </span>
              </div>

              <div className="max-h-[48rem] space-y-3 overflow-y-auto pr-1">
                {filteredTodos.map((todo, index) => {
                  const priorityMeta = getPriorityMeta(todo.priority);
                  const done = isCompleted(todo);
                  const loggedCount =
                    (Array.isArray(todo.mergedActivities) ? todo.mergedActivities.length : 0) +
                    (todo.isActivityLog ? 1 : 0);

                  return (
                    <motion.div
                      key={getTodoKey(todo, index)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`group rounded-xl border bg-white/[0.035] p-3 transition-colors hover:border-white/20 ${done ? 'border-emerald-400/20 opacity-70' : 'border-white/10'}`}
                    >
                      <div className="mb-3 flex items-start gap-3">
                        <button
                          type="button"
                          onClick={() => handleTodoClick(todo)}
                          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                            done
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                              : 'border-slate-600 bg-slate-900 text-transparent hover:border-slate-400 hover:text-slate-300'
                          }`}
                          title="Log activity"
                        >
                          {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h5 className={`text-sm font-semibold leading-snug ${done ? 'text-slate-300' : 'text-slate-100 group-hover:text-white'}`}>
                              {getTodoTitle(todo)}
                            </h5>
                            {todo.isAdhoc ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveShowUpTask(todo.showUpId)}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
                                title="Remove show-up"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <PriorityBadge priority={todo.priority} display={todo.priorityDisplay} />
                            <StatusBadge status={todo.todoStatus} />
                            {loggedCount > 0 ? (
                              <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                                <Layers2 className="h-3 w-3" />
                                {loggedCount} log{loggedCount > 1 ? 's' : ''}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1">
                          <Hourglass className="h-3 w-3" />
                          {formatTimeCommitment(getTodoDuration(todo), timeUnit)}
                        </span>
                        <span className="truncate rounded-md border border-white/10 bg-black/20 px-2 py-1">
                          {getTodoType(todo)}
                        </span>
                        {todo.recommendedFocus ? (
                          <span className="rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-amber-200">
                            Focus
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-3">
                        <ProgressPill todo={todo} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold text-slate-200">
                            {todo.progressDisplay || `${todo.currentProgress ?? 0} / ${todo.targetProgress ?? 0}`}
                          </div>
                          <div className="mt-0.5 truncate text-[11px] text-slate-500">
                            {todo.reasonMessages?.[0] || todo.recommendedAction || `${priorityMeta.label} priority task`}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </aside>
          </div>
        )}

        <div className="mt-6 border-t border-white/[0.08]" />
      </div>
    </div>
  );
}
