'use client';

import { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { getPriorityColor, getPriorityLabel, getStatusColor } from '@/lib/utils/goalUtils';
import { formatHealthScore, getHealthBadgeClass } from '@/lib/utils/healthUtils';

function Badge({ className, children }) {
  return (
    <span className={['inline-flex items-center border px-2 py-0.5 rounded-full text-xs', className].join(' ')}>
      {children}
    </span>
  );
}

function formatDate(date) {
  if (!date) return '–';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '–';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GoalList({ goals, onEdit, onDelete }) {
  const rows = useMemo(() => (Array.isArray(goals) ? goals : []), [goals]);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
      <div className="px-4 py-3 text-xs text-slate-400 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex-1">Title</div>
          <div className="w-24">Priority</div>
          <div className="w-28">Status</div>
          <div className="w-40">Health</div>
          <div className="w-32">Progress</div>
          <div className="w-32">Target date</div>
          <div className="w-24 text-right">Actions</div>
        </div>
      </div>

      {rows.map((g) => {
        const healthScore = g?.healthScore;
        const progressText =
          g?.targetValue !== null && g?.targetValue !== undefined
            ? `${g?.currentValue ?? 0}/${g?.targetValue}`
            : '—';

        return (
          <div
            key={g?.id || g?.title}
            className="border-b border-white/5 py-3 px-4 hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-medium truncate">
                  {g?.title || 'Untitled'}
                </div>
              </div>

              <div className="w-24">
                <Badge className={getPriorityColor(g?.priority)}>
                  {getPriorityLabel(g?.priority)}
                </Badge>
              </div>

              <div className="w-28">
                <Badge className={getStatusColor(g?.status)}>{g?.status || '–'}</Badge>
              </div>

              <div className="w-40">
                {healthScore !== null && healthScore !== undefined ? (
                  <Badge className={getHealthBadgeClass(healthScore)}>
                    {formatHealthScore(healthScore)}
                  </Badge>
                ) : (
                  <span className="text-xs text-slate-500">—</span>
                )}
              </div>

              <div className="w-32 text-xs text-slate-400">{progressText}</div>

              <div className="w-32 text-xs text-slate-400">{formatDate(g?.targetDate)}</div>

              <div className="w-24 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => onEdit?.(g)}
                  className="w-9 h-9 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                  aria-label="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete?.(g)}
                  className="w-9 h-9 rounded-lg hover:bg-white/5 text-slate-400 hover:text-red-300 transition-colors flex items-center justify-center"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

