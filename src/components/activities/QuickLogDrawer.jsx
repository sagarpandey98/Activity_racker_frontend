'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Loader2, Target, Search, Plus } from 'lucide-react';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { goalsApi } from '@/lib/api/goalsApi';
import { getPriorityLabel, getPriorityColor } from '@/lib/utils/goalUtils';

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

export default function QuickLogDrawer({ isOpen, onClose, onSuccess }) {
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

      // Focus activity input
      setTimeout(() => {
        activityInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

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
    if (!activityName.trim()) {
      setError('Activity name is required');
      return;
    }

    const duration = getDuration();
    if (!duration) {
      setError('End time must be after start time');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      // Build today's date
      const today = new Date().toISOString().split('T')[0];
      // Get timezone offset
      const tzOffset = new Date().getTimezoneOffset();
      const tzHours = Math.abs(Math.floor(tzOffset / 60))
        .toString()
        .padStart(2, '0');
      const tzMins = Math.abs(tzOffset % 60)
        .toString()
        .padStart(2, '0');
      const tzSign = tzOffset <= 0 ? '+' : '-';
      const tz = `${tzSign}${tzHours}:${tzMins}`;

      const startISO = `${today}T${startTime}:00${tz}`;
      const endISO = `${today}T${endTime}:00${tz}`;

      // Step 1: Create activity
      await activitiesApi.create({
        data: {
          name: activityName.trim(),
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
          source: 'WEB_APP',
        },
      });

      // Step 2: Update goal progress if units > 0
      if (selectedGoal && parseFloat(units) > 0) {
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
                    Log Activity
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    What did you work on?
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
              {/* Activity Name */}
              <div>
                <input
                  ref={activityInputRef}
                  type="text"
                  placeholder="What did you work on?"
                  value={activityName}
                  onChange={(e) => setActivityName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-slate-600 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>

              {/* Goal Selector */}
              <div>
                <label className="text-sm text-slate-400 mb-2 block">
                  Goal (optional)
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

              {/* Time */}
              <div>
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

              {/* Units (only when goal selected) */}
              {selectedGoal && (
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
