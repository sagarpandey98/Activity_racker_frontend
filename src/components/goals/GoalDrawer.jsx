'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { goalsApi } from '@/lib/api/goalsApi';
import { Input } from '@/components/ui/input';

const GOAL_TYPES = [
  { value: 'HABIT', label: 'Habit (Daily routine)' },
  { value: 'PROJECT', label: 'Project (Has an end date)' },
  { value: 'SKILL', label: 'Skill (Learning something)' },
  { value: 'FITNESS', label: 'Fitness (Health & exercise)' },
  { value: 'GENERAL', label: 'General' },
];

const PRIORITIES = [
  { value: 'CRITICAL', label: 'P1 — Critical' },
  { value: 'HIGH', label: 'P2 — High' },
  { value: 'MEDIUM', label: 'P3 — Medium' },
  { value: 'LOW', label: 'P4 — Low' },
];

const METRICS = [
  { value: 'COUNT', label: 'Sessions / Units (count things)' },
  { value: 'DURATION', label: 'Time (track minutes/hours)' },
  { value: 'CUSTOM', label: 'Custom value (weight, score, etc.)' },
];

const OPERATORS = [
  { value: 'GREATER_THAN', label: 'At least — reach or exceed target' },
  { value: 'EQUAL', label: 'Exactly — hit the exact number' },
  { value: 'LESS_THAN', label: 'At most — stay below target' },
];

const PERIODS = [
  { value: '', label: 'No schedule' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom period' },
];

const DAYS = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

function toDateInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function Field({ label, children, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        {hint ? <span className="text-[11px] text-slate-500">{hint}</span> : null}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={[
        'w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-600',
        'focus:outline-none focus:border-white/25',
        props.className || '',
      ].join(' ')}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function SwitchToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      className={[
        'w-10 h-6 rounded-full transition-colors flex items-center',
        checked ? 'bg-white' : 'bg-white/20',
      ].join(' ')}
      aria-label="Toggle"
    >
      <div
        className={[
          'w-4 h-4 rounded-full bg-[#05051a] transition-transform',
          checked ? 'translate-x-5' : 'translate-x-1',
        ].join(' ')}
      />
    </button>
  );
}

export default function GoalDrawer({
  isOpen,
  onClose,
  onSuccess,
  parentGoal,
  editGoal,
}) {
  const isEdit = Boolean(editGoal?.id);
  const titleText = isEdit
    ? 'Edit Goal'
    : parentGoal?.title
      ? `Add goal under ${parentGoal.title}`
      : 'New Goal';

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showScheduleAdvanced, setShowScheduleAdvanced] = useState(false);
  const [showDescription, setShowDescription] = useState(false);
  const [allGoals, setAllGoals] = useState([]);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    goalType: '',
    priority: 'MEDIUM',
    isContainer: false,
    isMilestone: false,
    metric: 'COUNT',
    targetOperator: 'GREATER_THAN',
    targetValue: '',
    currentValue: 0,
    evaluationPeriod: '',
    targetPerPeriod: '',
    customPeriodDays: '',
    scheduleType: 'FLEXIBLE',
    scheduleDays: [],
    minimumSessionMinutes: '',
    allowDoubleLogging: true,
    startDate: '',
    targetDate: '',
  });

  useEffect(() => {
    if (!isOpen) return;

    const g = editGoal || {};
    setError('');
    setIsSaving(false);
    setShowScheduleAdvanced(false);
    setShowDescription(false);
    setParentSearch('');
    setSelectedParentGoal(null);

    // Fetch all goals for parent selector
    (async () => {
      try {
        const res = await goalsApi.getAll();
        const data =
          (Array.isArray(res) ? res : null) ||
          (Array.isArray(res?.data) ? res.data : null) ||
          (Array.isArray(res?.data?.data) ? res.data.data : null) ||
          [];
        setAllGoals(data);
      } catch (e) {
        // silently fail, parent selector just won't work
      }
    })();

    setForm({
      title: g.title || '',
      description: g.description || '',
      goalType: g.goalType || '',
      priority: g.priority || 'MEDIUM',
      isContainer: g.isLeaf === false,
      isMilestone: Boolean(g.isMilestone),
      metric: g.metric || 'COUNT',
      targetOperator: g.targetOperator || 'GREATER_THAN',
      targetValue: g.targetValue ?? '',
      currentValue: g.currentValue ?? 0,
      evaluationPeriod: g.evaluationPeriod || '',
      targetPerPeriod: g.targetPerPeriod ?? '',
      customPeriodDays: g.customPeriodDays ?? '',
      scheduleType: g.scheduleType || 'FLEXIBLE',
      scheduleDays: Array.isArray(g.scheduleDays) ? g.scheduleDays : [],
      minimumSessionMinutes: g.minimumSessionMinutes ?? '',
      allowDoubleLogging: Boolean(g.allowDoubleLogging),
      startDate: toDateInputValue(g.startDate) || toDateInputValue(new Date()),
      targetDate: toDateInputValue(g.targetDate),
    });
  }, [isOpen, editGoal]);

  const periodLabel = useMemo(() => {
    switch (form.evaluationPeriod) {
      case 'DAILY': return 'Times per day';
      case 'WEEKLY': return 'Times per week';
      case 'MONTHLY': return 'Times per month';
      case 'QUARTERLY': return 'Times per quarter';
      case 'YEARLY': return 'Times per year';
      case 'CUSTOM': return 'Times per period';
      default: return 'Target per period';
    }
  }, [form.evaluationPeriod]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleDay = (dayKey) => {
    update({
      scheduleDays: form.scheduleDays.includes(dayKey)
        ? form.scheduleDays.filter((d) => d !== dayKey)
        : [...form.scheduleDays, dayKey],
    });
  };

  const buildPayload = () => {
    const parentGoalId =
      selectedParentGoal?.uuid ||
      selectedParentGoal?.id ||
      parentGoal?.uuid ||
      parentGoal?.id ||
      null;
    const payload = {
      title: form.title,
      description: form.description || undefined,
      goalType: form.goalType || undefined,
      priority: form.priority || undefined,
      isMilestone: Boolean(form.isMilestone),
      parentGoalId,
      isLeaf: form.isContainer ? false : true,
      metric: 'COUNT',
      targetOperator: 'GREATER_THAN',
      targetValue: form.isContainer
        ? 1
        : (form.targetValue === '' ? undefined : parseFloat(form.targetValue)),
    };

    if (!form.isContainer) {
      payload.currentValue = 0;

      payload.evaluationPeriod = form.evaluationPeriod || null;
      payload.targetPerPeriod =
        form.evaluationPeriod && form.targetPerPeriod !== '' ? parseFloat(form.targetPerPeriod) : null;
      payload.customPeriodDays =
        form.evaluationPeriod === 'CUSTOM' && form.customPeriodDays !== ''
          ? parseFloat(form.customPeriodDays)
          : null;
      payload.scheduleType = form.evaluationPeriod ? form.scheduleType : null;
      payload.scheduleDays =
        form.evaluationPeriod && form.scheduleType === 'SPECIFIC_DAYS'
          ? form.scheduleDays
          : null;
      payload.minimumSessionMinutes =
        form.evaluationPeriod && form.minimumSessionMinutes !== '' ? parseFloat(form.minimumSessionMinutes) : null;
      payload.allowDoubleLogging = Boolean(form.allowDoubleLogging);
      payload.startDate = form.startDate ? `${form.startDate}T00:00:00` : undefined;
      payload.targetDate = form.targetDate ? `${form.targetDate}T23:59:59` : null;
    }

    return payload;
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!form.isContainer) {
      const tv = parseFloat(form.targetValue);
      if (!Number.isFinite(tv) || tv <= 0) {
        setError('Target Number must be greater than 0');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) {
        await goalsApi.update(editGoal.id, payload);
      } else {
        await goalsApi.create(payload);
      }
      onSuccess?.();
      onClose?.();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-40"
            onClick={() => (isSaving ? null : onClose?.())}
          />

          <motion.aside
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-[#05051a] border-l border-white/[0.08] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/[0.08]">
              <div className="text-white text-lg font-semibold truncate">{titleText}</div>
              <button
                type="button"
                onClick={() => (isSaving ? null : onClose?.())}
                className="w-9 h-9 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {/* SECTION: Basic Info */}
              <div>
                <div className="text-sm font-medium text-slate-300 mb-3">Basic Info</div>
                <div className="space-y-4">
                  <Field label="Goal Title *">
                    <Input
                      value={form.title}
                      onChange={(e) => update({ title: e.target.value })}
                      placeholder="e.g. Master Quantitative for CAT"
                      required
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                    />
                  </Field>
                  {!showDescription ? (
                    <button
                      type="button"
                      onClick={() => setShowDescription(true)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add description
                    </button>
                  ) : (
                    <Field label="Description">
                      <Textarea
                        rows={3}
                        value={form.description}
                        onChange={(e) => update({ description: e.target.value })}
                        placeholder="What does achieving this goal mean to you?"
                      />
                    </Field>
                  )}
                </div>
              </div>

              {/* SECTION: Goal Setup */}
              <div>
                <div className="text-sm font-medium text-slate-300 mb-3">Goal Setup</div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Goal Type">
                    <Select
                      value={form.goalType}
                      onChange={(v) => {
                        const nextScheduleType =
                          v === 'HABIT' || v === 'FITNESS' ? 'SPECIFIC_DAYS' : 'FLEXIBLE';
                        update({ goalType: v, scheduleType: nextScheduleType });
                      }}
                      options={GOAL_TYPES}
                    />
                  </Field>
                  <Field label="Priority">
                    <Select
                      value={form.priority}
                      onChange={(v) => update({ priority: v })}
                      options={PRIORITIES}
                    />
                  </Field>
                </div>
                {!isEdit && !parentGoal ? (
                  <div className="col-span-2 mt-4">
                    <Field label="Parent Goal (optional)">
                      <div className="relative">
                        {selectedParentGoal ? (
                          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                            <span className="text-sm text-white">
                              {selectedParentGoal.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedParentGoal(null);
                                setParentSearch('');
                              }}
                              className="text-slate-400 hover:text-white ml-2"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              value={parentSearch}
                              onChange={(e) => {
                                setParentSearch(e.target.value);
                                setShowParentDropdown(true);
                              }}
                              onFocus={() => setShowParentDropdown(true)}
                              placeholder="Search goals..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25"
                            />
                            {showParentDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a1a] border border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                {allGoals
                                  .filter((g) =>
                                    !parentSearch ||
                                    g.title?.toLowerCase().includes(parentSearch.toLowerCase())
                                  )
                                  .slice(0, 8)
                                  .map((g) => (
                                    <button
                                      key={g.id}
                                      type="button"
                                      className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between"
                                      onClick={() => {
                                        setSelectedParentGoal(g);
                                        setParentSearch('');
                                        setShowParentDropdown(false);
                                      }}
                                    >
                                      <span>{g.title}</span>
                                      <span className="text-xs text-slate-500 ml-2">
                                        {g.goalType || ''}
                                      </span>
                                    </button>
                                  ))}
                                {allGoals.filter((g) =>
                                  !parentSearch ||
                                  g.title?.toLowerCase().includes(parentSearch.toLowerCase())
                                ).length === 0 && (
                                  <div className="px-3 py-3 text-sm text-slate-500">
                                    No goals found
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Field>
                  </div>
                ) : null}
              </div>

              {/* SECTION: Container or Trackable */}
              <div>
                <div className="text-sm font-medium text-slate-300 mb-3">How will you manage this goal?</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm">
                      Break into sub-goals
                    </div>
                    <div className="text-xs text-slate-500">
                      I'll track this via smaller goals, not directly
                    </div>
                  </div>
                  <SwitchToggle
                    checked={form.isContainer}
                    onChange={(v) => update({ isContainer: v })}
                  />
                </div>

                {form.isContainer ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                    This goal&apos;s health will be calculated from its child goals automatically.
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm">Mark as Milestone</div>
                    <div className="text-xs text-slate-500">
                      Flag this as a key achievement
                    </div>
                  </div>
                  <SwitchToggle
                    checked={form.isMilestone}
                    onChange={(v) => update({ isMilestone: v })}
                  />
                </div>
              </div>

              {/* SECTION: Progress Tracking */}
              {!form.isContainer ? (
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-3">Progress Tracking</div>
                  <div className="space-y-4">
                    <Field label="What are you tracking?">
                      <Select
                        value={form.metric}
                        onChange={(v) => update({ metric: v })}
                        options={METRICS}
                      />
                    </Field>
                    <Field label="Target Number">
                      <Input
                        type="number"
                        value={form.targetValue}
                        onChange={(e) => update({ targetValue: e.target.value })}
                        placeholder="e.g. 500"
                        className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                      />
                    </Field>
                  </div>
                </div>
              ) : null}

              {/* SECTION: Schedule */}
              {!form.isContainer ? (
                <div>
                  <div className="text-sm font-medium text-slate-300 mb-3">Schedule</div>
                  <div className="space-y-4">
                    <Field label="Check-in frequency">
                      <Select
                        value={form.evaluationPeriod}
                        onChange={(v) => update({ evaluationPeriod: v })}
                        options={PERIODS}
                      />
                    </Field>

                    {form.evaluationPeriod ? (
                      <>
                        <Field label={periodLabel}>
                          <Input
                            type="number"
                            value={form.targetPerPeriod}
                            onChange={(e) => update({ targetPerPeriod: e.target.value })}
                            className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                          />
                        </Field>

                        {form.evaluationPeriod === 'CUSTOM' ? (
                          <Field label="Period length (days)">
                            <Input
                              type="number"
                              value={form.customPeriodDays}
                              onChange={(e) => update({ customPeriodDays: e.target.value })}
                              className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                            />
                          </Field>
                        ) : null}

                        <div>
                          <div className="text-sm font-medium text-slate-300 mb-2">Schedule type</div>
                          <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
                            <button
                              type="button"
                              onClick={() => update({ scheduleType: 'FLEXIBLE' })}
                              className={[
                                'px-3 py-2 rounded-lg text-sm transition-colors',
                                form.scheduleType === 'FLEXIBLE'
                                  ? 'bg-white text-black'
                                  : 'text-slate-400 hover:text-white',
                              ].join(' ')}
                            >
                              FLEXIBLE
                            </button>
                            <button
                              type="button"
                              onClick={() => update({ scheduleType: 'SPECIFIC_DAYS' })}
                              className={[
                                'px-3 py-2 rounded-lg text-sm transition-colors',
                                form.scheduleType === 'SPECIFIC_DAYS'
                                  ? 'bg-white text-black'
                                  : 'text-slate-400 hover:text-white',
                              ].join(' ')}
                            >
                              SPECIFIC DAYS
                            </button>
                          </div>
                        </div>

                        {form.scheduleType === 'SPECIFIC_DAYS' ? (
                          <div>
                            <div className="text-sm font-medium text-slate-300 mb-2">Days</div>
                            <div className="flex flex-wrap gap-2">
                              {DAYS.map((d) => {
                                const selected = form.scheduleDays.includes(d.key);
                                return (
                                  <button
                                    key={d.key}
                                    type="button"
                                    onClick={() => toggleDay(d.key)}
                                    className={[
                                      'px-3 py-2 rounded-xl text-xs transition-colors',
                                      selected
                                        ? 'bg-white text-black'
                                        : 'bg-white/5 text-slate-400 hover:text-white',
                                    ].join(' ')}
                                  >
                                    {d.key}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => setShowScheduleAdvanced((v) => !v)}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          {showScheduleAdvanced ? 'Hide advanced options' : 'Advanced options'}
                        </button>

                        {showScheduleAdvanced ? (
                          <div className="space-y-4">
                            <Field
                              label="Minimum session duration (minutes)"
                              hint="Sessions shorter than this won't count"
                            >
                              <Input
                                type="number"
                                value={form.minimumSessionMinutes}
                                onChange={(e) => update({ minimumSessionMinutes: e.target.value })}
                                className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                              />
                            </Field>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white text-sm">Allow multiple sessions per day</div>
                                <div className="text-xs text-slate-500">Allow Double Logging</div>
                              </div>
                              <SwitchToggle
                                checked={form.allowDoubleLogging}
                                onChange={(v) => update({ allowDoubleLogging: v })}
                              />
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* SECTION: Dates */}
              <div>
                <div className="text-sm font-medium text-slate-300 mb-3">Dates</div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date">
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => update({ startDate: e.target.value })}
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                    />
                  </Field>
                  <Field label="Target Date">
                    <Input
                      type="date"
                      value={form.targetDate}
                      onChange={(e) => update({ targetDate: e.target.value })}
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
                    />
                  </Field>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.08]">
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => (isSaving ? null : onClose?.())}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-60"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSave}
                  className="bg-white text-black font-semibold px-6 py-2 rounded-xl hover:bg-gray-100 disabled:opacity-60 inline-flex items-center"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

