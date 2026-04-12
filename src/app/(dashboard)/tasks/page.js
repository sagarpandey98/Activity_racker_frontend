'use client';

import { Plus, Target } from 'lucide-react';
import SmartTodo from '@/components/todos/SmartTodo';

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <div className="animate-pulse">
        <div className="h-4 w-48 bg-white/5 rounded" />
        <div className="h-3 w-80 bg-white/5 rounded mt-3" />
        <div className="h-3 w-56 bg-white/5 rounded mt-2" />
      </div>
    </div>
  );
}

export default function TasksPage() {
  return (
    <div className="p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/20 flex items-center justify-center shadow-lg shadow-green-500/5">
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">My Tasks</h1>
            <p className="text-slate-400 text-sm">Intelligent task prioritization</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.href = '/goals'}
          className="inline-flex items-center gap-2 bg-white text-black font-semibold px-4 py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          New Goal
        </button>
      </div>

      {/* Main content */}
      <div className="mt-6">
        <SmartTodo />
      </div>
    </div>
  );
}
