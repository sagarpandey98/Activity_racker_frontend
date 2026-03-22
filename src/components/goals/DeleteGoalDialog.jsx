'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { goalsApi } from '@/lib/api/goalsApi';

function countDescendants(goal) {
  const children = Array.isArray(goal?.childGoals) ? goal.childGoals : [];
  let count = children.length;
  for (const c of children) count += countDescendants(c);
  return count;
}

export default function DeleteGoalDialog({ goal, onClose, onSuccess }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!goal) return null;

  const title = goal?.title || 'this goal';
  const childCount = countDescendants(goal);

  const handleDelete = async () => {
    if (!goal?.id) return;
    setIsDeleting(true);
    setError('');
    try {
      await goalsApi.delete(goal.id);
      onSuccess?.();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-[#05051a] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <div className="mt-4 text-white text-lg font-semibold">
          Delete {title}?
        </div>
        <div className="text-sm text-slate-400 mt-2">
          This will permanently delete this goal and all its child goals. This cannot be undone.
        </div>
        {childCount > 0 ? (
          <div className="text-sm text-slate-400 mt-2">
            This goal has {childCount} child goals that will also be deleted.
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => (isDeleting ? null : onClose?.())}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-500 text-white hover:bg-red-600 rounded-xl px-4 py-2 disabled:opacity-60"
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

