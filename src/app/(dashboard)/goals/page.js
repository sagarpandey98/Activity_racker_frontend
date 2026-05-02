'use client';

import { useEffect, useMemo, useState } from 'react';
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
  getPriorityColor,
  getPriorityLabel,
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

const CHILD_PREVIEW_LIMIT = 4;

function getGoalId(goal) {
  return goal?.id || goal?.uuid || goal?.goalId || goal?.goalUuid;
}

function getGoalTitle(goal) {
  return goal?.title || goal?.name || 'Untitled goal';
}

function getChildren(goal) {
  return Array.isArray(goal?.childGoals) ? goal.childGoals : [];
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="animate-pulse">
        <div className="h-4 w-2/3 rounded bg-white/5" />
        <div className="mt-4 h-3 w-1/2 rounded bg-white/5" />
        <div className="mt-5 h-24 rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

function MiniGoalCard({ goal, onView }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">
            {getGoalTitle(goal)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
            <CalendarDays className="h-3 w-3" />
            {formatDate(getCreatedAt(goal))}
          </div>
        </div>
        <HealthBadge goal={goal} />
      </div>
      <button
        type="button"
        onClick={() => onView?.(goal)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors"
      >
        View detail
        <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

function DirectTrackingPanel({ goal, onView }) {
  const currentValue = Number(goal?.currentValue ?? 0);
  const targetValue = Number(goal?.targetValue ?? 0);
  const progress = getProgressPercent(goal);
  const healthColor = getHealthColor(goal?.healthScore);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-slate-500">Total target</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {Number.isFinite(targetValue) && targetValue > 0 ? targetValue : '-'}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500">Target completed</div>
          <div className="mt-1 text-lg font-semibold text-white">
            {Number.isFinite(currentValue) ? currentValue : 0}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500">Progress</span>
          <span className="font-medium text-slate-300">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${progress}%`,
              backgroundColor: healthColor,
            }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">Last activity</div>
          <div className="mt-0.5 truncate text-sm text-slate-300">
            {formatRelativeDate(getLastActivityAt(goal))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onView?.(goal)}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
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
  const trackedDirectly = !hasChildren && (goal?.isLeaf === true || isTrackedGoal(goal));
  const previewChildren = children.slice(0, CHILD_PREVIEW_LIMIT);
  const hiddenChildren = Math.max(0, children.length - previewChildren.length);

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 hover:border-white/[0.14] hover:bg-white/[0.045] transition-colors">
      <section className="border-b border-white/[0.06] pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">
                {getGoalTitle(goal)}
              </h3>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${getPriorityColor(goal?.priority)}`}>
                {getPriorityLabel(goal?.priority)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3" />
                Created {formatDate(getCreatedAt(goal))}
              </span>
              <span>{hasChildren ? 'Tracked by child goals' : 'Tracked directly'}</span>
            </div>
          </div>
          <HealthBadge goal={goal} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onView?.(goal)}
            disabled={isFocused && !hasChildren}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/15 hover:text-blue-200 disabled:cursor-default disabled:opacity-50 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            View detail
          </button>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAddChild?.(goal)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Child
            </button>
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

      <section className="pt-4">
        {hasChildren ? (
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Child goals
              </div>
              <div className="text-xs text-slate-500">
                {children.length} total
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {previewChildren.map((child) => (
                <MiniGoalCard
                  key={getGoalId(child) || getGoalTitle(child)}
                  goal={child}
                  onView={onView}
                />
              ))}
            </div>
            {hiddenChildren > 0 ? (
              <button
                type="button"
                onClick={() => onView?.(goal)}
                className="mt-3 w-full rounded-xl border border-dashed border-white/10 px-3 py-2 text-xs font-medium text-slate-400 hover:border-white/20 hover:text-white transition-colors"
              >
                View {hiddenChildren} more child goals
              </button>
            ) : null}
          </div>
        ) : trackedDirectly ? (
          <DirectTrackingPanel goal={goal} onView={onView} />
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
            No child goals yet. Add a child goal or track this goal directly.
          </div>
        )}
      </section>
    </article>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [focusedGoalId, setFocusedGoalId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [parentGoal, setParentGoal] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [conversionWarningGoal, setConversionWarningGoal] = useState(null);

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
  const boardGoals = focusedGoal && !focusedHasChildren ? [focusedGoal] : visibleGoals;

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
    const isTrackedLeaf = goal?.isLeaf === true && isTrackedGoal(goal);

    if (isTrackedLeaf) {
      setConversionWarningGoal(goal);
      return;
    }

    setEditGoal(null);
    setParentGoal(goal);
    setIsDrawerOpen(true);
  };

  const handleDelete = (goal) => {
    setDeleteGoal(goal);
  };

  const handleViewDetails = (goal) => {
    const id = getGoalId(goal);
    if (id) setFocusedGoalId(id);
  };

  const isEmpty = !isLoading && !error && Array.isArray(goals) && goals.length === 0;
  const sectionTitle = focusedGoal
    ? focusedHasChildren
      ? `Goals inside ${getGoalTitle(focusedGoal)}`
      : getGoalTitle(focusedGoal)
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
            <button
              type="button"
              onClick={() => handleAddChild(focusedGoal)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Child
            </button>
          ) : null}
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{sectionTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {focusedGoal
                ? focusedHasChildren
                  ? 'Each card below belongs to the selected parent goal.'
                  : 'This goal is tracked directly.'
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
            <div className="text-white font-semibold">No child goals here yet</div>
            <div className="mt-2 text-sm text-slate-500">
              Add a child goal to start tracking this parent goal.
            </div>
            <button
              type="button"
              onClick={() => focusedGoal && handleAddChild(focusedGoal)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Child Goal
            </button>
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

      {conversionWarningGoal ? (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#05051a] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="text-white font-semibold text-lg mb-2">
              Convert to parent goal?
            </div>
            <div className="text-slate-400 text-sm mb-6">
              Adding a sub-goal will convert
              <span className="text-white font-medium">
                {' '}{conversionWarningGoal.title}{' '}
              </span>
              into a parent goal. Its health score will be calculated from child goals going forward.
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConversionWarningGoal(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const goal = conversionWarningGoal;
                  setConversionWarningGoal(null);
                  setEditGoal(null);
                  setParentGoal(goal);
                  setIsDrawerOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-gray-100 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
