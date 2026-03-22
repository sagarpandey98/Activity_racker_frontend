'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
} from '@/lib/utils/goalUtils';
import { getHealthBadgeClass, getHealthColor, getHealthStatus } from '@/lib/utils/healthUtils';

function Badge({ className, children }) {
  return (
    <span
      className={[
        'inline-flex items-center border px-2 py-0.5 rounded-full text-xs whitespace-nowrap',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function Dot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />;
}

export default function GoalCard({
  goal,
  onEdit,
  onAddChild,
  onDelete,
  isExpanded = false,
  onToggleExpand,
  level = 0,
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef(null);

  const title = goal?.title || 'Untitled';
  const description = goal?.description || '';

  const priority = goal?.priority;
  const status = goal?.status;
  const healthScore = goal?.healthScore;

  const isLeaf = goal?.isLeaf === true;
  const hasChildren = Array.isArray(goal?.childGoals) && goal.childGoals.length > 0;
  const isTracked = goal?.isTracked === true;
  const currentStreak = Number(goal?.currentStreak || 0);
  const progressPercentage = Number(goal?.progressPercentage ?? 0);

  const parentInsights = goal?.parentInsights;

  const showInsights = !isLeaf && parentInsights && typeof parentInsights === 'object';

  const healthStatus = useMemo(() => getHealthStatus(healthScore), [healthScore]);
  const progressColor = useMemo(() => getHealthColor(healthScore), [healthScore]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    };
    if (openMenu) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenu]);

  return (
    <div
      className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 mb-2 hover:bg-white/[0.05] transition-all cursor-pointer"
      style={{ paddingLeft: 16 + level * 24 }}
      onClick={() => {}}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' ? onEdit?.(goal) : null)}
    >
      {/* ROW 1 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center min-w-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand?.();
            }}
            className={hasChildren ? 'text-slate-400 hover:text-white transition-colors' : 'text-slate-400'}
            aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'Leaf'}
            disabled={!hasChildren}
          >
            {hasChildren ? (
              <ChevronRight
                className={[
                  'w-4 h-4 transition-transform',
                  isExpanded ? 'rotate-90' : '',
                ].join(' ')}
              />
            ) : (
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-1" />
            )}
          </button>

          <div className="ml-2 flex items-center min-w-0">
            <div className="font-medium text-white text-sm truncate">{title}</div>
            {!isLeaf && hasChildren ? (
              <div className="text-xs text-slate-600 ml-2">
                {goal.childGoals.length} sub-goal
                {goal.childGoals.length !== 1 ? 's' : ''}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <span className={['text-xs px-2 py-0.5 rounded-full border', getPriorityColor(priority)].join(' ')}>
            {getPriorityLabel(priority)}
          </span>

          {healthScore !== null && healthScore !== undefined ? (
            <span className={['text-xs px-2 py-0.5 rounded-full border', getHealthBadgeClass(healthScore)].join(' ')}>
              {Math.round(Number(healthScore))} {healthStatus}
            </span>
          ) : null}

          {isLeaf && !isTracked ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
              Setup tracking
            </span>
          ) : null}

          {isLeaf && currentStreak > 0 ? (
            <span className="text-xs text-orange-400">🔥 {currentStreak}</span>
          ) : null}

          <span className={['text-xs px-2 py-0.5 rounded-full border', getStatusColor(status)].join(' ')}>
            {status || '–'}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenu((v) => !v);
              }}
              className="w-8 h-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
              aria-label="Menu"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {openMenu ? (
              <div className="absolute right-0 top-10 bg-[#0a0a1a] border border-white/10 rounded-xl p-1 shadow-xl z-10 min-w-44">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 cursor-pointer text-slate-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(false);
                    onEdit?.(goal);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 cursor-pointer text-slate-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(false);
                    onAddChild?.(goal);
                  }}
                >
                  Add Child Goal
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm rounded-lg cursor-pointer text-red-400 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenu(false);
                    onDelete?.(goal);
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      {description ? (
        <div className="text-xs text-slate-500 mt-1 ml-6 truncate">
          {description}
        </div>
      ) : null}

      {/* ROW 3 */}
      {!isLeaf && hasChildren && goal?.parentInsights?.childrenSummary ? (
        <div className="mt-2 ml-6 text-xs text-slate-500">
          {goal.parentInsights.childrenSummary.total ?? 0} sub-goals
          {(goal.parentInsights.childrenSummary.critical ?? 0) > 0 ? (
            <span className="text-red-400 ml-1">
              · {goal.parentInsights.childrenSummary.critical} critical
            </span>
          ) : null}
          {goal.parentInsights.weakestChild?.title ? (
            <span className="ml-1">
              · Weakest: {goal.parentInsights.weakestChild.title}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* ROW 4 */}
      {isLeaf ? (
        <div className="mt-2 ml-6 mr-2">
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-1 rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, progressPercentage))}%`,
                backgroundColor: progressColor,
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

