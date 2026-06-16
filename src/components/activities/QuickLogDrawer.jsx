'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, Target, Search, Plus, CheckCircle2, Ban } from 'lucide-react';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { goalsApi } from '@/lib/api/goalsApi';
import { getPriorityLabel, getPriorityColor } from '@/lib/utils/goalUtils';
import { SKIP_REASON_CATEGORIES, getSkipReasonSubcategories } from '@/lib/constants/skipReasons';

const MOODS = [
  { value: 1, emoji: '😫', label: 'Very hard' },
  { value: 2, emoji: '😕', label: 'Hard' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];

const formatTime = (date) => {
  return date.toTimeString().slice(0, 5);
};

const toTimeInput = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) return value;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return formatTime(date);
};

export default function QuickLogDrawer({ isOpen, onClose, onSuccess, prefillGoal }) {
  const [activityName, setActivityName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goalSearch, setGoalSearch] = useState('');
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);
  const [allGoals, setAllGoals] = useState([]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [units, setUnits] = useState('1');
  const [mood, setMood] = useState(null);
  const [showMood, setShowMood] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // "No activity" / skip log state
  const [isSkipLog, setIsSkipLog] = useState(false);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonSubcategory, setReasonSubcategory] = useState('');
  const [note, setNote] = useState('');

  const activityInputRef = useRef(null);

  // Initialize on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const res = await goalsApi.getAll();
        const leafGoals = (res?.data || res || []).filter(
          (g) => g?.isLeaf === true
        );
        setAllGoals(leafGoals);
      } catch (err) {
        console.error('Failed to fetch goals:', err);
      }
    };

    if (isOpen) {
      initializeAuth();
      // Set default times
      const now = new Date();
      const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      setEndTime(formatTime(now));
      setStartTime(formatTime(hourAgo));
      // Reset fields
      setActivityName('');
      setSelectedGoal(null);
      setGoalSearch('');
      setUnits('1');
      setMood(null);
      setShowMood(false);
      setError('');
      setShowGoalDropdown(false);
      setIsSkipLog(Boolean(prefillGoal?.isSkipLog));
      setReasonCategory('');
      setReasonSubcategory('');
      setNote('');

      // Pre-fill goal if provided
      if (prefillGoal) {
        // Map SmartTodo goal structure to regular goal structure
        const goalId = prefillGoal.goalId || prefillGoal.id;

        setActivityName(
          prefillGoal.activityName ||
          prefillGoal.title ||
          prefillGoal.name ||
          ''
        );

        const prefilledStart = toTimeInput(prefillGoal.startTime || prefillGoal.scheduledStartTime);
        const prefilledEnd = toTimeInput(prefillGoal.endTime || prefillGoal.scheduledEndTime);
        if (prefilledStart) setStartTime(prefilledStart);
        if (prefilledEnd) setEndTime(prefilledEnd);

        if (goalId && !prefillGoal.isAdhoc && !prefillGoal.isActivityLog) {
          const mappedGoal = {
            id: goalId,
            title: prefillGoal.title || prefillGoal.name,
            name: prefillGoal.title || prefillGoal.name,
            domainId: prefillGoal.domainId,
            domainName: prefillGoal.domainName,
            subdomainId: prefillGoal.subdomainId,
            subdomainName: prefillGoal.subdomainName,
            specificId: prefillGoal.specificId,
            specificName: prefillGoal.specificName,
            metric: prefillGoal.metric || 'COUNT',
            currentValue: prefillGoal.currentProgress || 0,
            targetValue: prefillGoal.targetProgress || 0,
            priority: prefillGoal.priority,
            isLeaf: true,
          };
          setSelectedGoal(mappedGoal);
        }
      }

      // Focus activity input
      setTimeout(() => {
        activityInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, prefillGoal]);

  const getDuration = () => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = endMins - startMins;
    if (diff <= 0) return null;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const getUnitsLabel = () => {
    if (!selectedGoal) return 'Units';
    switch (selectedGoal.metric) {
      case 'COUNT':
        return 'Units completed';
      case 'DURATION':
        return 'Duration (minutes)';
      case 'CUSTOM':
        return 'Value';
      default:
        return 'Units completed';
    }
  };

  const filteredGoals = allGoals.filter(
    (g) =>
      g?.title?.toLowerCase().includes(goalSearch.toLowerCase()) ||
      g?.name?.toLowerCase().includes(goalSearch.toLowerCase())
  );

  const handleSubmit = async () => {
    if (isSkipLog) {
      // "No activity" record: must be tied to a goal and carry a reason for later analysis.
      if (!selectedGoal) {
        setError('Select the goal you did not do.');
        return;
      }
      if (!reasonCategory) {
        setError('Pick a reason for not doing it.');
        return;
      }
    } else {
      if (!activityName.trim()) {
        setError('Activity name is required');
        return;
      }
      const duration = getDuration();
      if (!duration) {
        setError('End time must be after start time');
        return;
      }
    }

    setIsSaving(true);
    setError('');

    try {
      // Convert local time strings to proper ISO datetime with timezone
      const today = prefillGoal?.activityDate
        ? new Date(`${prefillGoal.activityDate}T00:00:00`)
        : new Date();

      // Parse start and end times and combine with today's date.
      // (Skip logs keep the default times; the moment is informational, not counted.)
      const [startHours, startMins] = startTime.split(':').map(Number);
      const [endHours, endMins] = endTime.split(':').map(Number);

      const startDate = new Date(today);
      startDate.setHours(startHours, startMins, 0, 0);

      const endDate = new Date(today);
      endDate.setHours(endHours, endMins, 0, 0);
      // Skip logs may not have a positive duration; ensure end is never before start.
      if (isSkipLog && endDate <= startDate) {
        endDate.setTime(startDate.getTime() + 60 * 1000);
      }

      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();

      // Step 1: Create the entry (activity OR skip).
      await activitiesApi.create({
        data: {
          name: isSkipLog
            ? (activityName.trim() || `No activity${selectedGoal ? ` — ${selectedGoal.title || selectedGoal.name}` : ''}`)
            : activityName.trim(),
          startTime: startISO,
          endTime: endISO,
          domainId:
            selectedGoal?.domainId || '00000000-0000-0000-0000-000000000001',
          domainName: selectedGoal?.domainName || 'General',
          subdomainId:
            selectedGoal?.subdomainId ||
            '00000000-0000-0000-0000-000000000002',
          subdomainName: selectedGoal?.subdomainName || 'General',
          specificId:
            selectedGoal?.specificId ||
            '00000000-0000-0000-0000-000000000003',
          specificName: selectedGoal?.specificName || 'General',
          goalId: selectedGoal?.id || null,
          mood: mood || null,
          rating: mood || null,
          source: isSkipLog ? 'WEB_APP_SKIP' : 'WEB_APP',
          // Skip metadata — backend stores it but never counts it.
          entryType: isSkipLog ? 'SKIP' : 'ACTIVITY',
          notDoneReasonCategory: isSkipLog ? reasonCategory : null,
          notDoneReasonSubcategory: isSkipLog ? (reasonSubcategory || null) : null,
          description: isSkipLog ? (note.trim() || null) : null,
        },
      });

      // Step 2: Update goal progress — ONLY for real activities. A skip must never
      // bump currentValue (this is a separate write the backend can't infer).
      if (!isSkipLog && selectedGoal && parseFloat(units) > 0) {
        const newValue = (selectedGoal.currentValue || 0) + parseFloat(units);
        await goalsApi.updateProgress(selectedGoal.id, newValue);
      }

      // Success
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Failed to log activity. Please try again.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-40"
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="drawer"
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full md:w-[440px] bg-[#05051a] border-l border-white/[0.08] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-white/[0.08]">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {isSkipLog ? 'No Activity' : 'Log Activity'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {isSkipLog ? 'Why was it not done?' : 'What did you work on?'}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  type="button"
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Did it / Didn't do it toggle */}
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setIsSkipLog(false)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    !isSkipLog
                      ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  I did it
                </button>
                <button
                  type="button"
                  onClick={() => setIsSkipLog(true)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isSkipLog
                      ? 'bg-rose-500/20 text-rose-300 shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Ban className="h-4 w-4" />
                  Didn&apos;t do it
                </button>
              </div>

              {/* Activity Name (optional for a skip) */}
              <div>
                <input
                  ref={activityInputRef}
                  type="text"
                  placeholder={isSkipLog ? 'Short title (optional)' : 'What did you work on?'}
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>

              {/* Goal Selector */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  {isSkipLog ? 'Goal (required)' : 'Goal (optional)'}
                </label>

                {selectedGoal ? (
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-white">
                        {selectedGoal.title || selectedGoal.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGoal(null);
                        setUnits('1');
                      }}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search leaf goals..."
                      value={goalSearch}
                      onChange={(e) => {
                        setGoalSearch(e.target.value);
                        setShowGoalDropdown(true);
                      }}
                      onFocus={() => setShowGoalDropdown(true)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors"
                    />

                    {/* Dropdown */}
                    {showGoalDropdown && !selectedGoal && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a1a] border border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                        {/* No goal option */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGoal(null);
                            setGoalSearch('');
                            setShowGoalDropdown(false);
                            setUnits('1');
                          }}
                          className="w-full text-left px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5 border-b border-white/[0.05] transition-colors"
                        >
                          No goal / General activity
                        </button>

                        {/* Filtered goals */}
                        {filteredGoals.slice(0, 8).map((goal) => (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => {
                              setSelectedGoal(goal);
                              setGoalSearch('');
                              setShowGoalDropdown(false);
                              setUnits('1');
                            }}
                            className="w-full text-left px-3 py-2.5 flex items-center justify-between text-sm text-slate-200 hover:bg-white/5 border-b border-white/[0.05] last:border-b-0 transition-colors"
                          >
                            <span>{goal.title || goal.name}</span>
                            <span
                              className={`text-xs px-2 py-1 rounded border ${getPriorityColor(goal.priority)}`}
                            >
                              {getPriorityLabel(goal.priority)}
                            </span>
                          </button>
                        ))}

                        {filteredGoals.length === 0 && (
                          <div className="px-3 py-4 text-center text-sm text-slate-500">
                            No goals found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Not-done reason (skip only) */}
              {isSkipLog && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">Reason</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SKIP_REASON_CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => {
                            setReasonCategory(cat.value);
                            setReasonSubcategory('');
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                            reasonCategory === cat.value
                              ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                              : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {reasonCategory && getSkipReasonSubcategories(reasonCategory).length > 0 && (
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">
                        More specifically (optional)
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {getSkipReasonSubcategories(reasonCategory).map((sub) => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() =>
                              setReasonSubcategory(reasonSubcategory === sub ? '' : sub)
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                              reasonSubcategory === sub
                                ? 'border-rose-400/40 bg-rose-500/15 text-rose-200'
                                : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Notes (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="What got in the way?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Time */}
              <div className={isSkipLog ? 'hidden' : undefined}>
                <label className="text-sm text-slate-400 mb-2 block">
                  When
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">
                      Start
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">
                      End
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/25 transition-colors"
                    />
                  </div>
                </div>

                {/* Duration display */}
                <div className="mt-1">
                  {getDuration() ? (
                    <div className="text-xs text-slate-500">
                      Duration:{' '}
                      <span className="text-slate-300">{getDuration()}</span>
                    </div>
                  ) : endTime && startTime ? (
                    <div className="text-xs text-red-400">
                      End time must be after start time
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Units (only when goal selected, and not a skip) */}
              {!isSkipLog && selectedGoal && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <label className="text-sm text-slate-400 mb-2 block">
                    {getUnitsLabel()}
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="1"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors"
                  />

                  {/* Progress preview */}
                  {selectedGoal && units && parseFloat(units) > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      Progress: {selectedGoal.currentValue || 0} →{' '}
                      <span className="text-white">
                        {(selectedGoal.currentValue || 0) + parseFloat(units)}
                      </span>{' '}
                      / {selectedGoal.targetValue || 0}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Mood */}
              <div>
                {!showMood ? (
                  <button
                    type="button"
                    onClick={() => setShowMood(true)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add mood
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <label className="text-sm text-slate-400 mb-2 block">
                      How did it feel?
                    </label>
                    <div className="flex gap-2 justify-between">
                      {MOODS.map((m) => (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() =>
                            setMood(mood === m.value ? null : m.value)
                          }
                          title={m.label}
                          className={`w-10 h-10 rounded-xl text-xl transition-all ${
                            mood === m.value
                              ? 'bg-white/20 scale-110'
                              : 'opacity-40 hover:opacity-70'
                          }`}
                        >
                          {m.emoji}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.08] flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="text-slate-400 hover:text-white hover:bg-white/5 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="bg-white text-black font-semibold px-6 py-2 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : isSkipLog ? (
                  'Record no activity'
                ) : (
                  'Log Activity'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
