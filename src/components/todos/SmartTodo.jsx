'use client';

import { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Star, 
  TrendingUp, 
  Target, 
  Calendar,
  RefreshCw,
  AlertTriangle 
} from 'lucide-react';
import { smartTodoApi } from '@/lib/api/goalsApi';
import useUIStore from '@/lib/store/uiStore';

function PriorityBadge({ priority, display }) {
  const styles = {
    'CRITICAL': 'bg-red-500/10 text-red-400 border-red-500/20',
    'HIGH': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    'MEDIUM': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    'LOW': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };

  return (
    <span className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold tracking-wide uppercase ${styles[priority] || styles.LOW}`}>
      {display}
    </span>
  );
}

function ProgressRing({ percentage, size = 48 }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Cap the visual stroke at 100% for proper circle display, but use actual value for text
  const visualPercentage = Math.min(percentage, 100);
  const strokeDasharray = `${(visualPercentage / 100) * circumference} ${circumference}`;
  const isOverachieved = percentage > 100;

  return (
    // Added shrink-0 to prevent flexbox from squishing the circle and causing overlaps
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-700/50"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          className={`transition-all duration-500 ease-out ${isOverachieved ? 'text-emerald-400' : 'text-blue-500'}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center">
          <span className={`text-xs font-bold tracking-tight ${isOverachieved ? 'text-emerald-400' : 'text-white'}`}>
            {Math.round(percentage)}%
          </span>
          {isOverachieved && (
            <span className="text-[9px] text-emerald-300 font-semibold leading-tight">+{Math.round(percentage - 100)}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SmartTodo() {
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const { setIsQuickLogOpen, setPrefillGoal } = useUIStore();

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await smartTodoApi.getTodayTodos();
      setTodos(response.data || response || []);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to load todos';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const refreshTodos = async () => {
    try {
      setIsRefreshing(true);
      await smartTodoApi.refreshTodos();
      await fetchTodos();
    } catch (err) {
      console.error('Failed to refresh todos:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTodoClick = (todo) => {
    setPrefillGoal(todo);
    setIsQuickLogOpen(true);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const getUrgencyIcon = (todo) => {
    if (todo.streakAtRisk) return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    if (todo.behindSchedule) return <TrendingUp className="w-4 h-4 text-yellow-400" />;
    if (todo.scheduledForToday) return <Calendar className="w-4 h-4 text-blue-400" />;
    return <Circle className="w-4 h-4 text-slate-500" />;
  };

  // Separate todos into pending and completed based on progress percentage
  const pendingTodos = todos.filter(todo => todo.progressPercentage < 100);
  const completedTodos = todos.filter(todo => todo.progressPercentage >= 100);

  if (loading) {
    return (
      <div className="bg-[#0B0F19] border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#0B0F19] border border-red-500/10 rounded-2xl p-6 shadow-xl">
        <div className="text-center py-12">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="text-slate-200 text-sm font-semibold mb-1">Error loading tasks</div>
          <div className="text-slate-400 text-xs mb-6 max-w-xs mx-auto">{error}</div>
          <button
            onClick={fetchTodos}
            className="px-5 py-2.5 rounded-lg bg-white text-slate-900 text-sm font-semibold hover:bg-slate-100 transition-colors shadow-md"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0B0F19] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-slate-100 font-semibold tracking-tight text-lg">Today's Tasks</h3>
            <p className="text-slate-400 text-sm mt-0.5">Intelligent task prioritization</p>
          </div>
        </div>
        <button
          onClick={refreshTodos}
          disabled={isRefreshing}
          className="w-10 h-10 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-transparent hover:border-white/10 transition-all flex items-center justify-center disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Todo List */}
      {pendingTodos.length === 0 && completedTodos.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-xl bg-slate-900/50">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-slate-500" />
          </div>
          <div className="text-slate-300 text-sm font-medium mb-1">You're all caught up!</div>
          <div className="text-slate-500 text-xs max-w-xs mx-auto">
            All your goals are on track or scheduled for other days.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Todos Section */}
          {pendingTodos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/10">
                <Target className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-200">Pending Tasks</h4>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded ml-auto">
                  {pendingTodos.length} {pendingTodos.length === 1 ? 'task' : 'tasks'}
                </span>
              </div>
              <div className="space-y-4">
                {pendingTodos.map((todo) => (
                  <div
                    key={todo.goalId}
                    className={`group bg-slate-900/40 border rounded-xl p-5 transition-all duration-200 hover:bg-slate-800/60 ${
                      todo.isCompletedToday 
                        ? 'border-emerald-500/20 bg-emerald-500/5' 
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleTodoClick(todo)}
                        disabled={todo.isCompletedToday}
                        className={`mt-1 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                          todo.isCompletedToday 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                            : 'border-slate-600 hover:border-slate-400 text-transparent hover:text-slate-400 bg-slate-800/50'
                        }`}
                      >
                        {todo.isCompletedToday ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-base mb-2.5 truncate transition-colors ${
                              todo.isCompletedToday ? 'text-slate-400 line-through' : 'text-slate-100 group-hover:text-white'
                            }`}>
                              {todo.title}
                            </h4>
                            <div className="flex items-center gap-2 flex-wrap">
                              <PriorityBadge priority={todo.priority} display={todo.priorityDisplay} />
                              <span className="text-[10px] text-slate-300 font-medium px-2.5 py-1 rounded-md bg-slate-800 border border-white/5 uppercase tracking-wide">
                                {todo.goalType}
                              </span>
                              <span className="text-[10px] text-slate-300 font-medium px-2.5 py-1 rounded-md bg-slate-800 border border-white/5 uppercase tracking-wide">
                                {todo.scheduleDetails}
                              </span>
                            </div>
                          </div>
                          
                          {/* Time Estimate Badge */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-white/5 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-xs text-slate-300 font-medium">{todo.suggestedTimeMinutes}m</span>
                          </div>
                        </div>

                        {/* Progress and Details Footer */}
                        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                          
                          {/* Progress Stats */}
                          <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-2 border border-white/[0.03]">
                            <ProgressRing percentage={todo.progressPercentage} />
                            <div className="pr-2">
                              <div className="text-sm text-slate-200 font-semibold leading-tight">
                                {todo.currentProgress} <span className="text-slate-500 font-normal">/ {todo.targetProgress}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                                {todo.isCompletedToday ? 'Completed' : 'In progress'}
                              </div>
                            </div>
                          </div>

                          {/* Streak Info */}
                          {todo.currentStreak > 0 && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                              <Star className="w-4 h-4 text-orange-400" />
                              <span className="text-xs text-orange-400 font-semibold">{todo.currentStreak} day streak</span>
                            </div>
                          )}

                          {/* Urgency Icon & Message */}
                          {todo.urgencyReason && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-white/5 ml-auto">
                              {getUrgencyIcon(todo)}
                              <span className="text-xs text-slate-300 font-medium">
                                {todo.urgencyReason}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Todos Section */}
          {completedTodos.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 w-full py-3 px-4 rounded-lg hover:bg-slate-900/30 transition-colors border border-white/5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold text-slate-300">Completed Today</h4>
                <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded ml-auto">
                  {completedTodos.length}
                </span>
              </button>
              
              {showCompleted && (
                <div className="space-y-3 mt-3">
                  {completedTodos.map((todo) => (
                    <div
                      key={todo.goalId}
                      className="group bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 transition-all duration-200 hover:bg-emerald-500/10"
                    >
                      <div className="flex items-start gap-4">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleTodoClick(todo)}
                          className="mt-1 w-6 h-6 shrink-0 rounded-full border-2 bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm text-slate-400 line-through truncate">
                                {todo.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wide border ${
                                  todo.progressPercentage > 100 
                                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                    : 'text-slate-400 bg-slate-800/50 border-white/5'
                                }`}>
                                  {Math.round(todo.progressPercentage)}%
                                </span>
                              </div>
                            </div>
                            
                            {/* Quick log button */}
                            <button
                              onClick={() => handleTodoClick(todo)}
                              className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded-md hover:bg-emerald-500/5 transition-colors shrink-0"
                            >
                              + Log
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer Note */}
      <div className="mt-8 pt-5 border-t border-white/[0.08]">
        <p className="text-[11px] text-slate-500 text-center font-medium uppercase tracking-wider">
          Tasks prioritized by goal priority, streak status & adherence
        </p>
      </div>
    </div>
  );
}