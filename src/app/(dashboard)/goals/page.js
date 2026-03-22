'use client';

import { useEffect, useMemo, useState } from 'react';
import { GitBranch, List, Plus, Target } from 'lucide-react';
import { goalsApi } from '@/lib/api/goalsApi';
import GoalTree from '@/components/goals/GoalTree';
import GoalList from '@/components/goals/GoalList';
import GoalDrawer from '@/components/goals/GoalDrawer';
import DeleteGoalDialog from '@/components/goals/DeleteGoalDialog';

function flattenGoals(goals, parentTitles = []) {
  const arr = [];
  const list = Array.isArray(goals) ? goals : [];
  for (const g of list) {
    const breadcrumb = parentTitles.length ? parentTitles.join(' / ') : '';
    arr.push({
      ...g,
      parentBreadcrumb: breadcrumb,
    });
    const children = Array.isArray(g?.childGoals) ? g.childGoals : [];
    if (children.length) {
      arr.push(...flattenGoals(children, [...parentTitles, g?.title || 'Untitled']));
    }
  }
  return arr;
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="animate-pulse">
        <div className="h-4 w-48 bg-white/5 rounded" />
        <div className="h-3 w-80 bg-white/5 rounded mt-3" />
        <div className="h-3 w-56 bg-white/5 rounded mt-2" />
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('tree');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [parentGoal, setParentGoal] = useState(null);
  const [editGoal, setEditGoal] = useState(null);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [conversionWarningGoal, setConversionWarningGoal] = useState(null);

  const flatGoals = useMemo(() => flattenGoals(goals), [goals]);

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
    // Check if this is a tracked leaf goal
    // that will become a parent
    const isTrackedLeaf = goal?.isLeaf === true
      && goal?.isTracked === true

    if (isTrackedLeaf) {
      setConversionWarningGoal(goal)
      return
    }
    setEditGoal(null)
    setParentGoal(goal)
    setIsDrawerOpen(true)
  };

  const handleDelete = (goal) => {
    setDeleteGoal(goal);
  };

  const isEmpty = !isLoading && !error && Array.isArray(goals) && goals.length === 0;

  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Goals</h1>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* View toggle */}
      <div className="mt-5 inline-flex gap-2">
        <button
          type="button"
          onClick={() => setViewMode('tree')}
          className={[
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
            viewMode === 'tree' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
          ].join(' ')}
        >
          <GitBranch className="w-4 h-4" />
          Tree View
        </button>
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={[
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
            viewMode === 'list' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white',
          ].join(' ')}
        >
          <List className="w-4 h-4" />
          List View
        </button>
      </div>

      {/* Main content */}
      <div className="mt-6">
        {isLoading ? (
          <div className="space-y-3">
            <div className="bg-white/5 animate-pulse rounded-xl h-16 mb-2" />
            <div className="bg-white/5 animate-pulse rounded-xl h-16 mb-2" />
            <div className="bg-white/5 animate-pulse rounded-xl h-16 mb-2" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-5">
            <div className="text-white font-semibold">Couldn’t load goals</div>
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
          <div className="flex flex-col items-center text-center mt-20">
            <Target className="w-16 h-16 text-slate-700" />
            <div className="mt-4 text-xl font-semibold text-white">No goals yet</div>
            <div className="text-slate-400 text-sm mt-2">
              Create your first goal to start tracking your progress
            </div>
            <button
              type="button"
              onClick={openNew}
              className="bg-white text-black rounded-xl px-6 py-3 mt-6 font-semibold hover:bg-gray-100 transition-colors"
            >
              Create your first goal
            </button>
          </div>
        ) : viewMode === 'tree' ? (
          <GoalTree
            goals={goals}
            onEdit={handleEdit}
            onAddChild={handleAddChild}
            onDelete={handleDelete}
          />
        ) : (
          <GoalList
            goals={flatGoals}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
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
        <div className="fixed inset-0 bg-black/60 z-50
          flex items-center justify-center p-4">
          <div className="bg-[#05051a] border border-white/10
            rounded-2xl p-6 max-w-sm w-full">
            <div className="text-white font-semibold text-lg mb-2">
              Convert to parent goal?
            </div>
            <div className="text-slate-400 text-sm mb-6">
              Adding a sub-goal will convert
              <span className="text-white font-medium">
                {' '}{conversionWarningGoal.title}{' '}
              </span>
              into a parent goal. Its health score will be
              calculated from its sub-goals going forward.
              Your existing activity history will be preserved.
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConversionWarningGoal(null)}
                className="px-4 py-2 rounded-xl text-slate-400
                  hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const goal = conversionWarningGoal
                  setConversionWarningGoal(null)
                  setEditGoal(null)
                  setParentGoal(goal)
                  setIsDrawerOpen(true)
                }}
                className="px-4 py-2 rounded-xl bg-white text-black
                  font-semibold hover:bg-gray-100 transition-colors"
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

