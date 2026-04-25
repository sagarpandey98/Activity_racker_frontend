'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Star, 
  TrendingUp, 
  Target, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  LayoutGrid,
  List as ListIcon,
  SortAsc,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip
} from 'recharts';
import { smartTodoApi } from '@/lib/api/goalsApi';
import useUIStore from '@/lib/store/uiStore';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const PRIORITY_COLORS = {
  'CRITICAL': '#ef4444',
  'HIGH': '#f59e0b',
  'MEDIUM': '#eab308',
  'LOW': '#64748b'
};

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
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ date: '', timezone: '', listType: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [groupBy, setGroupBy] = useState('status'); // 'status', 'goal', 'priority'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const { setIsQuickLogOpen, setPrefillGoal } = useUIStore();

  const fetchTodos = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await smartTodoApi.getTodosForDate(selectedDate);
      const items = Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response)
          ? response
          : [];
      setTodos(items);
      setSummary(response?.summary || null);
      setMeta({
        date: response?.date || selectedDate,
        timezone: response?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        listType: response?.listType || (selectedDate === new Date().toISOString().split('T')[0] ? 'TODAY' : 'DATE'),
      });
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
  }, [selectedDate]);

  const getProgressPercentage = (todo) => {
    if (typeof todo.periodProgressPercentage === 'number') return todo.periodProgressPercentage;
    if (typeof todo.progressPercentage === 'number') return todo.progressPercentage;
    const target = Number(todo.targetProgress);
    const current = Number(todo.currentProgress);
    if (target > 0 && Number.isFinite(current)) return (current / target) * 100;
    return 0;
  };

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

  // ─── Data Processing ───
  
  // 1. Time Commitment Chart Data
  const timeData = todos
    .filter(t => t.suggestedTimeMinutes > 0)
    .map(t => ({
      name: t.title,
      value: t.suggestedTimeMinutes,
      goalId: t.goalId
    }));

  const totalCommittedMinutes = timeData.reduce((sum, item) => sum + item.value, 0);

  // 2. Priority Distribution
  const priorityDist = Object.keys(PRIORITY_COLORS).map(p => ({
    name: p,
    count: todos.filter(t => t.priority === p).length,
    color: PRIORITY_COLORS[p]
  }));

  // 3. Grouping Logic
  const getGroupedTodos = () => {
    if (groupBy === 'goal') {
      const groups = {};
      todos.forEach(t => {
        const key = t.title; 
        if (!groups[key]) groups[key] = [];
        groups[key].push(t);
      });
      return Object.entries(groups).map(([name, items]) => ({ name, items, icon: Target }));
    }
    
    if (groupBy === 'priority') {
      const groups = { 'CRITICAL': [], 'HIGH': [], 'MEDIUM': [], 'LOW': [] };
      todos.forEach(t => {
        if (groups[t.priority]) groups[t.priority].push(t);
        else groups['LOW'].push(t);
      });
      return Object.entries(groups)
        .filter(([_, items]) => items.length > 0)
        .map(([name, items]) => ({ name, items, icon: Star }));
    }

    const BUCKET_META = {
      MUST_DO_TODAY: { label: 'Must Do Today', icon: AlertTriangle, completed: false },
      CATCH_UP_TODAY: { label: 'Catch Up Today', icon: TrendingUp, completed: false },
      GOOD_TO_DO_TODAY: { label: 'Good To Do Today', icon: Target, completed: false },
      COMPLETED_TODAY: { label: 'Completed Today', icon: CheckCircle2, completed: true },
    };
    const bucketOrder = ['MUST_DO_TODAY', 'CATCH_UP_TODAY', 'GOOD_TO_DO_TODAY', 'COMPLETED_TODAY'];
    const result = [];
    bucketOrder.forEach((bucketKey) => {
      const items = todos.filter((t) => t.todoStatus === bucketKey);
      if (items.length > 0) {
        result.push({
          name: BUCKET_META[bucketKey].label,
          items: [...items].sort((a, b) => (a.displayRank || 999) - (b.displayRank || 999)),
          icon: BUCKET_META[bucketKey].icon,
          isCompletedSection: BUCKET_META[bucketKey].completed,
        });
      }
    });
    return result;
  };

  const groupedData = getGroupedTodos();

  return (
    <div className="space-y-6">
      {/* ─── SUMMARY DASHBOARD ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Time Pie Chart */}
        <div className="lg:col-span-2 bg-[#0B0F19] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <PieChartIcon className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            <div className="w-full h-48 md:w-48 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={timeData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {timeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '12px', color: '#cbd5e1' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 md:left-24 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-2xl font-bold text-white leading-none">{totalCommittedMinutes}</div>
                <div className="text-[10px] text-slate-500 uppercase font-medium mt-1">Mins</div>
              </div>
            </div>
            
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-widest">Time Commitment</h4>
                <div className="text-xs text-slate-500">{timeData.length} tasks scheduled</div>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {timeData.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between group/item">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                      <span className="text-xs text-slate-400 truncate group-hover/item:text-slate-200 transition-colors">{item.name}</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{item.value}m</span>
                  </div>
                ))}
                {timeData.length > 4 && <div className="text-[10px] text-slate-600 pl-4">+ {timeData.length - 4} more tasks</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Priority Stats Card */}
        <div className="bg-[#0B0F19] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
          <h4 className="text-sm font-semibold text-slate-200 mb-6 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" />
            Priorities
          </h4>
          <div className="space-y-5">
            {priorityDist.map((p) => (
              <div key={p.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-slate-400">{p.name}</span>
                  <span style={{ color: p.color }}>{p.count}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.count / Math.max(...priorityDist.map(d => d.count), 1)) * 100}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN TODO SECTION ─── */}
      <div className="bg-[#0B0F19] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
        {/* Header with Grouping Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
              <Target className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                <h3 className="text-slate-100 font-semibold tracking-tight text-lg">
                  {selectedDate === new Date().toISOString().split('T')[0] ? "Today's Tasks" : `Tasks for ${new Date(selectedDate).toLocaleDateString()}`}
                </h3>
                <p className="text-slate-400 text-sm mt-0.5">
                  {(summary?.totalItems ?? todos.length)} tasks • {meta.timezone || 'UTC'} • {meta.listType || 'DATE'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-xl">
            {[
              { id: 'status', icon: ListIcon, label: 'Status' },
              { id: 'goal', icon: LayoutGrid, label: 'Goal' },
              { id: 'priority', icon: SortAsc, label: 'Rank' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setGroupBy(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  groupBy === mode.id
                    ? 'bg-white text-black shadow-md'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <mode.icon className="w-3.5 h-3.5" />
                {mode.label}
              </button>
            ))}
            <div className="w-px h-6 bg-white/10 mx-1" />
            <button
              onClick={refreshTodos}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {summary ? (
          <div className="mb-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: 'Must Do', value: summary.mustDoTodayCount || 0, tone: 'text-red-300 border-red-500/20 bg-red-500/10' },
                { label: 'Catch Up', value: summary.catchUpTodayCount || 0, tone: 'text-amber-300 border-amber-500/20 bg-amber-500/10' },
                { label: 'Good To Do', value: summary.goodToDoTodayCount || 0, tone: 'text-blue-300 border-blue-500/20 bg-blue-500/10' },
                { label: 'Completed', value: summary.completedTodayCount || 0, tone: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' },
              ].map((chip) => (
                <span key={chip.label} className={`text-[11px] px-2.5 py-1 rounded-md border font-semibold ${chip.tone}`}>
                  {chip.label}: {chip.value}
                </span>
              ))}
            </div>
            {Array.isArray(summary.recommendedFocusTitles) && summary.recommendedFocusTitles.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider">Top Focus</span>
                {summary.recommendedFocusTitles.slice(0, 3).map((title) => (
                  <span key={title} className="text-[11px] px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
                    {title}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Content */}
        {todos.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-xl bg-slate-900/50">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-slate-500" />
            </div>
            <div className="text-slate-300 text-sm font-medium mb-1">You're all caught up!</div>
            <div className="text-slate-500 text-xs max-w-xs mx-auto">
              Nothing urgent for this date. You can still plan ahead from this view.
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedData.map((group) => {
              const SectionIcon = group.icon;
              const isSectionCompleted = group.isCompletedSection;
              
              // Handle completed today section state
              const showThisSection = isSectionCompleted ? showCompleted : true;
              
              return (
                <div key={group.name} className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <div 
                    className={`flex items-center gap-2 mb-4 pb-2 border-b border-white/10 ${isSectionCompleted ? 'cursor-pointer hover:border-white/20' : ''}`}
                    onClick={() => isSectionCompleted && setShowCompleted(!showCompleted)}
                  >
                    <SectionIcon className={`w-4 h-4 ${isSectionCompleted ? 'text-emerald-500' : 'text-emerald-400'}`} />
                    <h4 className="text-sm font-semibold text-slate-200 capitalize">{group.name}</h4>
                    <span className="text-[11px] font-medium text-slate-400 bg-slate-800 px-2 py-1 rounded ml-auto">
                      {group.items.length}
                    </span>
                  </div>
                  
                  {showThisSection && (
                    <div className="space-y-4">
                      {group.items.map((todo) => (
                        <div
                          key={todo.goalId}
                          className={`group bg-slate-900/40 border rounded-xl p-4 transition-all duration-200 hover:bg-slate-800/60 ${
                            todo.todoStatus === 'COMPLETED_TODAY' 
                              ? 'border-emerald-500/20 bg-emerald-500/5' 
                              : 'border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            {/* Checkbox */}
                            <button
                              onClick={() => handleTodoClick(todo)}
                              className={`mt-1 w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                                todo.todoStatus === 'COMPLETED_TODAY' 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                  : 'border-slate-600 hover:border-slate-400 text-transparent hover:text-slate-400 bg-slate-800/50'
                              }`}
                            >
                              {todo.todoStatus === 'COMPLETED_TODAY' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-semibold text-base mb-1.5 truncate transition-colors ${
                                    todo.todoStatus === 'COMPLETED_TODAY' ? 'text-slate-400 line-through' : 'text-slate-100 group-hover:text-white'
                                  }`}>
                                    {todo.title}
                                  </h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <PriorityBadge priority={todo.priority} display={todo.priorityDisplay} />
                                    <span className="text-[10px] text-slate-300 font-medium px-2.5 py-1 rounded-md bg-slate-800 border border-white/5 uppercase tracking-wide">
                                      {todo.goalType}
                                    </span>
                                    {todo.recommendedFocus && (
                                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest ${
                                        'bg-emerald-500/20 text-emerald-300'
                                      }`}>
                                        Focus
                                      </span>
                                    )}
                                    {Array.isArray(todo.reasonCodes) && todo.reasonCodes.slice(0, 2).map((code) => (
                                      <span key={code} className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-widest bg-slate-800 text-slate-400">
                                        {code.replaceAll('_', ' ')}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                
                                {/* Time Estimate Badge */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 border border-white/5">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs text-slate-300 font-medium">{todo.suggestedTimeMinutes || 0}m</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Budget</div>
                                </div>
                              </div>

                              {/* Footer Action items */}
                              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                  <ProgressRing percentage={getProgressPercentage(todo)} size={36} />
                                  <div>
                                    <div className="text-xs text-slate-200 font-bold leading-tight">
                                      {todo.progressDisplay || `${todo.currentProgress ?? 0} / ${todo.targetProgress ?? 0}`}
                                    </div>
                                    <div className="text-[9px] text-slate-500 uppercase font-medium">Progress</div>
                                  </div>
                                </div>

                                {(todo.reasonMessages?.[0] || todo.recommendedAction) && (
                                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 ml-auto">
                                    <span className="text-xs text-slate-300 font-medium">
                                      {todo.reasonMessages?.[0] || todo.recommendedAction}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-8 pt-5 border-t border-white/[0.08]">
          <p className="text-[11px] text-slate-500 text-center font-medium uppercase tracking-wider">
            Prioritization grouped by {groupBy} • Updates live from Northstar Engine
          </p>
        </div>
      </div>
    </div>
  );
}