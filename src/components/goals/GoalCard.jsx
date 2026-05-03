'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, MoreHorizontal, BarChart3 } from 'lucide-react';
import {
  CHILD_GOAL_DISABLED_EXPLANATION,
  getPriorityColor,
  getPriorityLabel,
  getStatusColor,
  isMilestoneGoal,
  isTrackedGoal,
} from '@/lib/utils/goalUtils';
import { getHealthBadgeClass, getHealthColor, getHealthStatus, formatScoreComponent, getScoreComponentColor } from '@/lib/utils/healthUtils';

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

function HealthScoreTooltip({ goal, children }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTooltip]);

  const hasScoreComponents = goal?.consistencyScore !== null || 
                           goal?.momentumScore !== null || 
                           goal?.progressScore !== null;

  if (!hasScoreComponents) {
    return children;
  }

  return (
    <div className="relative" ref={tooltipRef}>
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-[#0a0a1a] border border-white/10 rounded-lg p-3 shadow-xl z-50 whitespace-nowrap">
          <div className="text-xs space-y-1">
            <div className={getScoreComponentColor(goal?.consistencyScore)}>
              {formatScoreComponent(goal?.consistencyScore, 'Consistency')}
            </div>
            <div className={getScoreComponentColor(goal?.momentumScore)}>
              {formatScoreComponent(goal?.momentumScore, 'Momentum')}
            </div>
            <div className={getScoreComponentColor(goal?.progressScore)}>
              {formatScoreComponent(goal?.progressScore, 'Progress')}
            </div>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-[#0a0a1a] border-r border-t border-white/10 rotate-45"></div>
        </div>
      )}
    </div>
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
  onViewDetails,
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
  const effectivePriorityScore = goal?.effectivePriorityScore;
  const parentGoalTitle = goal?.parentGoalTitle;

  const isLeaf = goal?.isLeaf === true;
  const hasChildren = Array.isArray(goal?.childGoals) && goal.childGoals.length > 0;
  const milestone = isMilestoneGoal(goal);
  const isTracked = isTrackedGoal(goal);
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

          {effectivePriorityScore !== undefined && effectivePriorityScore !== null ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Score: {Number(effectivePriorityScore).toFixed(1)}
            </span>
          ) : null}

          {!milestone && healthScore !== null && healthScore !== undefined ? (
            <HealthScoreTooltip goal={goal}>
              <span className={['text-xs px-2 py-0.5 rounded-full border', getHealthBadgeClass(healthScore)].join(' ')}>
                {Math.round(Number(healthScore))} {healthStatus}
              </span>
            </HealthScoreTooltip>
          ) : null}

          {milestone ? (
            <span className="text-xs px-2 py-0.5 rounded-full border border-violet-500/30 bg-violet-500/15 text-violet-300">
              Milestone
            </span>
          ) : null}

          {isLeaf && !isTracked && !milestone ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
              Setup tracking
            </span>
          ) : null}

          {isLeaf && isTracked && !milestone ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Tracked
            </span>
          ) : null}

          {isLeaf && !milestone && currentStreak > 0 ? (
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
                <div className={milestone ? '' : 'border-b border-white/[0.06] pb-1'}>
                  <span
                    className="block"
                    title={!milestone ? CHILD_GOAL_DISABLED_EXPLANATION : undefined}
                  >
                    <button
                      type="button"
                      disabled={!milestone}
                      aria-label={
                        !milestone ? CHILD_GOAL_DISABLED_EXPLANATION : 'Add child goal'
                      }
                      className="w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(false);
                        if (milestone) onAddChild?.(goal);
                      }}
                    >
                      Add Child Goal
                    </button>
                  </span>
                </div>
                {isLeaf && isTracked && !milestone ? (
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm rounded-lg cursor-pointer text-blue-400 hover:bg-blue-500/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenu(false);
                      onViewDetails?.(goal);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      View Details
                    </div>
                  </button>
                ) : null}
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
      {parentGoalTitle ? (
        <div className="text-xs text-blue-400 mt-1 ml-6 truncate">
          📁 {parentGoalTitle}
        </div>
      ) : null}
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
      {isLeaf && !milestone ? (
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

