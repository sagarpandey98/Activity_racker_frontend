'use client';

import { useEffect, useState } from 'react';
import { Loader2, Target, TrendingUp } from 'lucide-react';
import { priorityApi } from '@/lib/api/goalsApi';
import GoalCard from './GoalCard';

export default function TodayFocus({ limit = 10 }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTodayFocus = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await priorityApi.getTodayFocus(limit);
        setGoals(response.data || []);
      } catch (err) {
        const message = err.response?.data?.message || err.message || 'Failed to load today\'s focus';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayFocus();
  }, [limit]);

  const handleEdit = (goal) => {
    // TODO: Open goal edit drawer
    console.log('Edit goal:', goal);
  };

  const handleAddChild = (goal) => {
    // TODO: Open add child goal drawer
    console.log('Add child to goal:', goal);
  };

  const handleDelete = (goal) => {
    // TODO: Open delete confirmation dialog
    console.log('Delete goal:', goal);
  };

  if (loading) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
        <div className="text-center py-8">
          <div className="text-red-400 text-sm mb-2">Error</div>
          <div className="text-slate-400 text-xs">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Today's Focus</h3>
            <p className="text-slate-400 text-xs">Top priority goals across all areas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <TrendingUp className="w-4 h-4" />
          {goals.length} goals
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-slate-400 text-sm mb-2">No focus goals yet</div>
          <div className="text-slate-500 text-xs">
            Create some goals to see your priority-based recommendations
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map((goal) => (
            <GoalCard
              key={goal.uuid || goal.id}
              goal={goal}
              onEdit={handleEdit}
              onAddChild={handleAddChild}
              onDelete={handleDelete}
              level={0}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {goals.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/[0.08]">
          <div className="text-xs text-slate-500 text-center">
            These goals are ranked by effective priority score (parent + child influence)
          </div>
        </div>
      )}
    </div>
  );
}
