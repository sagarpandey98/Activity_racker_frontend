'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Eye,
  Pencil,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { goalsApi } from '@/lib/api/goalsApi';
import {
  CHILD_GOAL_DISABLED_EXPLANATION,
  getGoalCardTheme,
  getPriorityColor,
  getPriorityLabel,
  isMilestoneGoal,
  isTrackedGoal,
} from '@/lib/utils/goalUtils';
import {
  formatHealthScore,
  getHealthBadgeClass,
  getHealthColor,
  getHealthStatus,
} from '@/lib/utils/healthUtils';
import GoalDrawer from '@/components/goals/GoalDrawer';
import DeleteGoalDialog from '@/components/goals/DeleteGoalDialog';

// Child list viewport: about three MiniGoalCard rows; extra goals scroll inside the card.
const CHILD_GOALS_LIST_SCROLL_CLASS =
  'max-h-[24rem] overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1';

const GOAL_BOARD_BACKGROUND =
  'bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.09),transparent_30%),radial-gradient(circle_at_top_right,rgba(244,114,182,0.08),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))]';

function getGoalId(goal) {
  return goal?.id || goal?.uuid || goal?.goalId || goal?.goalUuid;
}

function getGoalTitle(goal) {
  return goal?.title || goal?.name || 'Untitled goal';
}

function getChildren(goal) {
  return Array.isArray(goal?.childGoals) ? goal.childGoals : [];
}

function isDirectTrackableGoal(goal) {
  return (
    !isMilestoneGoal(goal) &&
    getChildren(goal).length === 0 &&
    (goal?.isLeaf === true || isTrackedGoal(goal))
  );
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeDate(value) {
  if (!value) return 'No activity yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No activity yet';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const activityDay = new Date(date);
  activityDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - activityDay) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  return formatDate(value);
}

function getCreatedAt(goal) {
  return goal?.createdAt || goal?.created_at || goal?.createdDate || goal?.updatedAt;
}

function getLastActivityAt(goal) {
  return (
    goal?.lastActivityAt ||
    goal?.lastActivityTime ||
    goal?.lastLoggedAt ||
    goal?.recentActivityAt
  );
}

function getProgressPercent(goal) {
  const explicit = Number(goal?.progressPercentage ?? goal?.progressPercent);
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(100, explicit));

  const current = Number(goal?.currentValue ?? 0);
  const target = Number(goal?.targetValue ?? 0);
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.max(0, Math.min(100, (current / target) * 100));
}

function flattenGoals(goals) {
  const list = Array.isArray(goals) ? goals : [];
  return list.flatMap((goal) => [goal, ...flattenGoals(getChildren(goal))]);
}

function findGoalById(goals, goalId) {
  if (!goalId) return null;
  for (const goal of Array.isArray(goals) ? goals : []) {
    if (String(getGoalId(goal)) === String(goalId)) return goal;
    const childMatch = findGoalById(getChildren(goal), goalId);
    if (childMatch) return childMatch;
  }
  return null;
}

function findGoalPath(goals, goalId, path = []) {
  if (!goalId) return [];
  for (const goal of Array.isArray(goals) ? goals : []) {
    const nextPath = [...path, goal];
    if (String(getGoalId(goal)) === String(goalId)) return nextPath;
    const childPath = findGoalPath(getChildren(goal), goalId, nextPath);
    if (childPath.length > 0) return childPath;
  }
  return [];
}

function HealthBadge({ goal }) {
  const score = goal?.healthScore;
  const status = getHealthStatus(score);

  if (score === null || score === undefined) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/70 px-2 py-0.5 text-xs text-slate-400">
        Untracked
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${getHealthBadgeClass(score)}`}>
      {formatHealthScore(score)} {status}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.02] to-cyan-500/[0.06] p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
      <div className="animate-pulse">
        <div className="h-4 w-2/3 rounded bg-gradient-to-r from-white/10 to-white/5" />
        <div className="mt-4 h-3 w-1/2 rounded bg-white/5" />
        <div className="mt-5 h-24 rounded-xl bg-gradient-to-br from-white/10 to-white/[0.02]" />
      </div>
    </div>
  );
}

function MiniGoalCard({ goal, onView, onEdit, onDelete }) {
  const t = getGoalCardTheme(getGoalId(goal));
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${t.miniWash} ${t.miniBorder} p-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-gradient-to-br ${t.wash} opacity-70 blur-xl`} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">
            {getGoalTitle(goal)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <CalendarDays className="h-3 w-3 text-slate-500" />
            {formatDate(getCreatedAt(goal))}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          {!isMilestoneGoal(goal) ? <HealthBadge goal={goal} /> : null}
          <button
            type="button"
            onClick={() => onEdit?.(goal)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Edit child goal"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(goal)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
            aria-label="Delete child goal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onView?.(goal)}
        className={`relative mt-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 -mx-1.5 text-xs font-medium transition-colors ${t.viewBtn}`}
      >
        View detail
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function DirectTrackingPanel({ goal, onView, cardTheme }) {
  const currentValue = Number(goal?.currentValue ?? 0);
  const targetValue = Number(goal?.targetValue ?? 0);
  const progress = getProgressPercent(goal);
  const healthColor = getHealthColor(goal?.healthScore);
  const t = cardTheme || getGoalCardTheme(getGoalId(goal));

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${t.miniBorder} bg-gradient-to-br ${t.panelWash} p-4 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.55)]`}
    >
      <div className={`pointer-events-none absolute -left-10 -bottom-12 h-32 w-32 rounded-full bg-gradient-to-tr ${t.wash} opacity-50 blur-2xl`} />
      <div className="relative grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/5">
          <div className="text-xs text-slate-400">Total target</div>
          <div className="mt-1 text-lg font-semibold text-white tabular-nums">
            {Number.isFinite(targetValue) && targetValue > 0 ? targetValue : '-'}
          </div>
        </div>
        <div className="rounded-lg bg-black/20 px-3 py-2 ring-1 ring-white/5">
          <div className="text-xs text-slate-400">Target completed</div>
          <div className="mt-1 text-lg font-semibold text-white tabular-nums">
            {Number.isFinite(currentValue) ? currentValue : 0}
          </div>
        </div>
      </div>

      <div className="relative mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-400">Progress</span>
          <span className="font-medium text-slate-200 tabular-nums">{Math.round(progress)}%</span>
        </div>
        <div className={`h-2 rounded-full ${t.progressTrack} overflow-hidden ring-1 ring-white/5`}>
          <div
            className="h-2 rounded-full transition-all shadow-[0_0_12px_rgba(255,255,255,0.15)]"
            style={{
              width: `${progress}%`,
              backgroundColor: healthColor,
            }}
          />
        </div>
      </div>

      <div className="relative mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-400">Last activity</div>
          <div className="mt-0.5 truncate text-sm text-slate-200">
            {formatRelativeDate(getLastActivityAt(goal))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onView?.(goal)}
          className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${t.viewBtn}`}
        >
          <Eye className="h-3.5 w-3.5" />
          Detail
        </button>
      </div>
    </div>
  );
}

function GoalBoardCard({
  goal,
  onView,
  onEdit,
  onAddChild,
  onDelete,
  isFocused,
}) {
  const children = getChildren(goal);
  const hasChildren = children.length > 0;
  const milestone = isMilestoneGoal(goal);
  const trackedDirectly =
    !milestone && !hasChildren && (goal?.isLeaf === true || isTrackedGoal(goal));
  const t = getGoalCardTheme(getGoalId(goal));

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-br from-white/[0.08] via-white/[0.035] to-white/[0.015] p-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_56px_-20px_rgba(0,0,0,0.55)] ${t.border}`}
    >
      <div
        className={`pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-gradient-to-br ${t.wash} opacity-80 blur-3xl transition-opacity duration-300 group-hover:opacity-100`}
      />
      <div
        className={`pointer-events-none absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-gradient-to-tr ${t.wash} opacity-40 blur-3xl`}
      />
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${t.ribbon} opacity-90`} />
      <section className="relative border-b border-white/[0.08] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.wash} ring-1 ring-white/10`}
                aria-hidden
              >
                <Target className="h-4 w-4 text-white/90 drop-shadow-sm" />
              </span>
              <h3 className="truncate text-base font-semibold text-white tracking-tight">
                {getGoalTitle(goal)}
              </h3>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${getPriorityColor(goal?.priority)}`}>
                {getPriorityLabel(goal?.priority)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 text-slate-500" />
                Created {formatDate(getCreatedAt(goal))}
              </span>
              <span className="text-slate-500">
                {milestone
                  ? (hasChildren ? 'Milestone · child goals only' : 'Milestone')
                  : hasChildren
                    ? 'Tracked by child goals'
                    : 'Tracked directly'}
              </span>
            </div>
          </div>
          {!milestone ? <HealthBadge goal={goal} /> : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onView?.(goal)}
            disabled={isFocused && !hasChildren}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-default disabled:opacity-50 transition-colors ${t.viewBtn}`}
          >
            <Eye className="h-3.5 w-3.5" />
            View detail
          </button>

          <div className="flex items-center gap-1">
            <span
              className="inline-flex"
              title={!milestone ? CHILD_GOAL_DISABLED_EXPLANATION : undefined}
            >
              <button
                type="button"
                onClick={() => onAddChild?.(goal)}
                disabled={!milestone}
                aria-label={!milestone ? CHILD_GOAL_DISABLED_EXPLANATION : 'Add child goal'}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Plus className="h-3.5 w-3.5" />
                Child
              </button>
            </span>
              <button
                type="button"
                onClick={() => onEdit?.(goal)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Edit goal"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete?.(goal)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                aria-label="Delete goal"
              >
                <Trash2 className="h-4 w-4" />
              </button>
          </div>
        </div>
      </section>

      <section className="relative pt-4">
        {hasChildren ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className={`text-xs font-semibold uppercase tracking-wider bg-gradient-to-r ${t.ribbon} bg-clip-text text-transparent`}>
                Child goals
              </div>
              <div className="text-xs text-slate-500">
                {children.length} total
              </div>
            </div>
            <div className={`grid grid-cols-1 gap-2 ${CHILD_GOALS_LIST_SCROLL_CLASS}`}>
              {children.map((child) => (
                <MiniGoalCard
                  key={getGoalId(child) || getGoalTitle(child)}
                  goal={child}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        ) : milestone ? (
          <div
            className={`rounded-xl border border-dashed p-4 text-sm text-slate-400 bg-gradient-to-br ${t.panelWash} ${t.miniBorder}`}
          >
            No child goals yet. Milestones only organize sub-goals — add children to see targets and progress there.
          </div>
        ) : trackedDirectly ? (
          <DirectTrackingPanel goal={goal} onView={onView} cardTheme={t} />
        ) : (
          <div
            className={`rounded-xl border border-dashed p-4 text-sm text-slate-400 bg-gradient-to-br ${t.panelWash} ${t.miniBorder}`}
          >
            No child goals yet. Add a child goal or track this goal directly.
          </div>
        )}
      </section>
    </article>
  );
}

export default function GoalsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [focusedGoalId, setFocusedGoalId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [parentGoal, setParentGoal] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [addChildBlockedOpen, setAddChildBlockedOpen] = useState(false);

  const allGoals = useMemo(() => flattenGoals(goals), [goals]);
  const focusedGoal = useMemo(
    () => findGoalById(goals, focusedGoalId),
    [goals, focusedGoalId]
  );
  const focusedPath = useMemo(
    () => findGoalPath(goals, focusedGoalId),
    [goals, focusedGoalId]
  );
  const visibleGoals = focusedGoal ? getChildren(focusedGoal) : goals;
  const focusedHasChildren = focusedGoal && getChildren(focusedGoal).length > 0;
  /** When drilling into a goal with no sub-goals, show an empty list — not the parent card again. */
  const boardGoals = focusedGoal && !focusedHasChildren ? [] : visibleGoals;

  const fetchGoals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await goalsApi.getTree();
      const data =
        (Array.isArray(res) ? res : null) ||
        (Array.isArray(res?.data) ? res.data : null) ||
        (Array.isArray(res?.data?.data) ? res.data.data : null) ||
        [];
      setGoals(data);
    } catch (e) {
      setError(e?.message || 'Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    if (!focusedGoalId) return;
    if (!isLoading && !findGoalById(goals, focusedGoalId)) {
      setFocusedGoalId(null);
    }
  }, [focusedGoalId, goals, isLoading]);

  const openNew = () => {
    setEditGoal(null);
    setParentGoal(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (goal) => {
    setEditGoal(goal);
    setParentGoal(null);
    setIsDrawerOpen(true);
  };

  const handleAddChild = (goal) => {
    if (isMilestoneGoal(goal)) {
      setEditGoal(null);
      setParentGoal(goal);
      setIsDrawerOpen(true);
      return;
    }

    setAddChildBlockedOpen(true);
  };

  const handleDelete = (goal) => {
    setDeleteGoal({ ...goal, id: getGoalId(goal) });
  };

  const handleViewDetails = (goal) => {
    const id = getGoalId(goal);
    if (!id) return;

    if (isDirectTrackableGoal(goal)) {
      router.push(`/goals/${encodeURIComponent(id)}`);
      return;
    }

    setFocusedGoalId(id);
  };

  const isEmpty = !isLoading && !error && Array.isArray(goals) && goals.length === 0;
  const sectionTitle = focusedGoal
    ? focusedHasChildren
      ? `Goals inside ${getGoalTitle(focusedGoal)}`
      : `Child goals under ${getGoalTitle(focusedGoal)}`
    : 'Parent Goals';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            {focusedGoal ? (
              <button
                type="button"
                onClick={() => {
                  const parent = focusedPath[focusedPath.length - 2];
                  setFocusedGoalId(parent ? getGoalId(parent) : null);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div>
              <h1 className="text-2xl font-bold text-white">Goals</h1>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
                {focusedPath.length > 0 ? (
                  focusedPath.map((goal, index) => (
                    <span key={getGoalId(goal) || index} className="inline-flex items-center gap-1.5">
                      {index > 0 ? <ChevronRight className="h-3 w-3" /> : null}
                      <button
                        type="button"
                        onClick={() => setFocusedGoalId(getGoalId(goal))}
                        className="hover:text-slate-300 transition-colors"
                      >
                        {getGoalTitle(goal)}
                      </button>
                    </span>
                  ))
                ) : (
                  <span>{goals.length} parent goals, {allGoals.length} total goals</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {focusedGoal ? (
            <div className="flex max-w-lg flex-col items-stretch sm:items-end">
              <span
                className="inline-flex sm:self-end"
                title={
                  !isMilestoneGoal(focusedGoal) ? CHILD_GOAL_DISABLED_EXPLANATION : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => handleAddChild(focusedGoal)}
                  disabled={!isMilestoneGoal(focusedGoal)}
                  aria-label={
                    !isMilestoneGoal(focusedGoal)
                      ? CHILD_GOAL_DISABLED_EXPLANATION
                      : 'Create child goal'
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-white"
                >
                  <Plus className="h-4 w-4" />
                  Create child goal
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={openNew}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              New Goal
            </button>
          )}
        </div>
      </div>

      <div className={`mt-6 rounded-2xl border border-white/[0.08] p-4 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.7)] ${GOAL_BOARD_BACKGROUND}`}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{sectionTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {focusedGoal
                ? focusedHasChildren
                  ? 'Each card below belongs to the selected parent goal.'
                  : isMilestoneGoal(focusedGoal)
                    ? 'Sub-goals roll up into this parent. None are defined yet — add one when you are ready.'
                    : 'This goal has no sub-goals. It is tracked directly; adding children is not available for this type of goal.'
                : 'Each card is a top-level parent goal.'}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-400">
            <Activity className="h-3.5 w-3.5" />
            {boardGoals.length} shown
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {[0, 1, 2, 3].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="text-white font-semibold">Could not load goals</div>
            <div className="text-sm text-red-200 mt-1">{error}</div>
            <button
              type="button"
              onClick={fetchGoals}
              className="mt-4 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-colors"
            >
              Try again
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center text-center py-20">
            <Target className="w-16 h-16 text-slate-700" />
            <div className="mt-4 text-xl font-semibold text-white">No goals yet</div>
            <div className="text-slate-400 text-sm mt-2">
              Create your first parent goal to start organizing progress.
            </div>
            <button
              type="button"
              onClick={openNew}
              className="bg-white text-black rounded-xl px-6 py-3 mt-6 font-semibold hover:bg-gray-100 transition-colors"
            >
              Create your first goal
            </button>
          </div>
        ) : boardGoals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-8 text-center">
            <div className="text-white font-semibold">
              {focusedGoal
                ? `No child goals under “${getGoalTitle(focusedGoal)}”`
                : 'No child goals here yet'}
            </div>
            <div className="mt-2 text-sm text-slate-500">
              {focusedGoal
                ? isMilestoneGoal(focusedGoal)
                  ? 'You opened this parent from View detail. Create sub-goals below to organize work; nothing is listed here yet.'
                  : 'This goal does not use sub-goals. Go back to see the goal card, or edit it from the parent list.'
                : 'Add a child goal to start tracking this parent goal.'}
            </div>
            <div className="mt-5 flex justify-center">
              <span
                title={
                  focusedGoal && !isMilestoneGoal(focusedGoal)
                    ? CHILD_GOAL_DISABLED_EXPLANATION
                    : undefined
                }
                className="inline-flex"
              >
                <button
                  type="button"
                  onClick={() => focusedGoal && handleAddChild(focusedGoal)}
                  disabled={!focusedGoal || !isMilestoneGoal(focusedGoal)}
                  aria-label={
                    focusedGoal && !isMilestoneGoal(focusedGoal)
                      ? CHILD_GOAL_DISABLED_EXPLANATION
                      : 'Create child goal'
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
                >
                  <Plus className="h-4 w-4" />
                  Create child goal
                </button>
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {boardGoals.map((goal) => (
              <GoalBoardCard
                key={getGoalId(goal) || getGoalTitle(goal)}
                goal={goal}
                onView={handleViewDetails}
                onEdit={handleEdit}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                isFocused={focusedGoal && String(getGoalId(focusedGoal)) === String(getGoalId(goal))}
              />
            ))}
          </div>
        )}
      </div>

      <GoalDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditGoal(null);
          setParentGoal(null);
        }}
        onSuccess={() => {
          fetchGoals();
          setIsDrawerOpen(false);
          setEditGoal(null);
          setParentGoal(null);
        }}
        parentGoal={parentGoal}
        editGoal={editGoal}
      />

      <DeleteGoalDialog
        goal={deleteGoal}
        onClose={() => setDeleteGoal(null)}
        onSuccess={() => {
          setDeleteGoal(null);
          fetchGoals();
        }}
      />

      {addChildBlockedOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#05051a] p-6">
            <div className="mb-2 text-lg font-semibold text-white">Sub-goals not available</div>
            <p className="mb-6 text-sm leading-relaxed text-slate-400">
              {CHILD_GOAL_DISABLED_EXPLANATION}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setAddChildBlockedOpen(false)}
                className="rounded-xl bg-white px-4 py-2 font-semibold text-black hover:bg-gray-100 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
