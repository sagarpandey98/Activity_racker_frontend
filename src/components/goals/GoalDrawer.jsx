'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Search,
  Settings,
  Sliders,
  X,
  Zap,
} from 'lucide-react';
import { goalsApi } from '@/lib/api/goalsApi';
import { Input } from '@/components/ui/input';

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════ */

const GOAL_TYPES = [
  { value: 'HABIT', label: 'Habit', icon: '🔁' },
  { value: 'PROJECT', label: 'Project', icon: '📐' },
  { value: 'SKILL', label: 'Skill', icon: '🧠' },
  { value: 'FITNESS', label: 'Fitness', icon: '💪' },
  { value: 'GENERAL', label: 'General', icon: '🎯' },
];

const PRIORITIES = [
  { value: 'CRITICAL', label: 'P1 — Critical', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'HIGH', label: 'P2 — High', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'MEDIUM', label: 'P3 — Medium', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'LOW', label: 'P4 — Low', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
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

const FREQUENCIES = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const WEEKDAYS = [
  { key: 'MONDAY', label: 'Mon' },
  { key: 'TUESDAY', label: 'Tue' },
  { key: 'WEDNESDAY', label: 'Wed' },
  { key: 'THURSDAY', label: 'Thu' },
  { key: 'FRIDAY', label: 'Fri' },
  { key: 'SATURDAY', label: 'Sat' },
  { key: 'SUNDAY', label: 'Sun' },
];

const MONTHS = [
  { key: 'JANUARY', label: 'Jan' }, { key: 'FEBRUARY', label: 'Feb' },
  { key: 'MARCH', label: 'Mar' }, { key: 'APRIL', label: 'Apr' },
  { key: 'MAY', label: 'May' }, { key: 'JUNE', label: 'Jun' },
  { key: 'JULY', label: 'Jul' }, { key: 'AUGUST', label: 'Aug' },
  { key: 'SEPTEMBER', label: 'Sep' }, { key: 'OCTOBER', label: 'Oct' },
  { key: 'NOVEMBER', label: 'Nov' }, { key: 'DECEMBER', label: 'Dec' },
];

const WEEKS_OF_MONTH = [
  { key: 'W1', label: 'Week 1' }, { key: 'W2', label: 'Week 2' },
  { key: 'W3', label: 'Week 3' }, { key: 'W4', label: 'Week 4' },
  { key: 'W5', label: 'Week 5' },
];

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => ({
  key: `D${i + 1}`, label: `${i + 1}`,
}));

const QUARTER_MONTHS = [
  { key: 'M1', label: 'Month 1' }, { key: 'M2', label: 'Month 2' }, { key: 'M3', label: 'Month 3' },
];

const GOAL_TYPE_WEIGHT_DEFAULTS = {
  HABIT: { c: 50, m: 30, p: 20 },
  FITNESS: { c: 40, m: 30, p: 30 },
  SKILL: { c: 30, m: 30, p: 40 },
  PROJECT: { c: 20, m: 20, p: 60 },
  GENERAL: { c: 34, m: 33, p: 33 },
};

/* ═══════════════════════════════════════════════════════════════════════
   UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */

function toDateInputValue(date) {
  if (!date) return '';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getChildFrequency(rootFreq, monthlyMode) {
  switch (rootFreq) {
    case 'WEEKLY': return 'DAILY';
    case 'MONTHLY': return monthlyMode === 'weeks' ? 'WEEKLY' : 'DAILY';
    case 'QUARTERLY': return 'MONTHLY';
    case 'YEARLY': return 'MONTHLY';
    case 'DAILY': return 'TIMING';
    default: return 'DAILY';
  }
}

function getSubChildFrequency(childFreq) {
  switch (childFreq) {
    case 'DAILY': return 'TIMING';
    case 'WEEKLY': return 'DAILY';
    default: return null;
  }
}

/** Build scheduleSpec JSON from visual form state */
function buildScheduleSpec(form) {
  if (!form.scheduleFrequency) return undefined;

  const spec = {
    frequency: form.scheduleFrequency,
    flexible: form.scheduleFlexible,
  };

  try { spec.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }

  // Map min/max search fields to scheduleSpec constraints
  const minC = parseInt(form.minimumSessionPeriod);
  const maxC = parseInt(form.maximumSessionPeriod);

  spec.constraints = {
    minCheckinsRequired: Number.isInteger(minC) ? minC : 1, // Default 1
  };
  if (Number.isInteger(maxC)) {
    spec.constraints.maxCheckinsAllowed = maxC;
  }

  // Segments only in specific mode
  if (!form.scheduleFlexible && form.scheduleSegments.length > 0) {
    const childFreq = getChildFrequency(form.scheduleFrequency, form.scheduleMonthlyMode);
    const subFreq = getSubChildFrequency(childFreq);

    const withChildren = form.scheduleSegments.filter((s) => s.children?.length > 0);
    const withoutChildren = form.scheduleSegments.filter((s) => !s.children?.length);

    const segments = [];

    // Group items without children into one segment
    if (withoutChildren.length > 0) {
      segments.push({
        frequency: childFreq,
        values: withoutChildren.map((s) => s.value),
        flexible: false,
      });
    }

    // Each item with children gets its own segment
    withChildren.forEach((seg) => {
      const segment = {
        frequency: childFreq,
        values: [seg.value],
        flexible: false,
      };
      if (subFreq) {
        segment.segments = [{
          frequency: subFreq,
          values: [...seg.children],
          flexible: false,
        }];
      }
      segments.push(segment);
    });

    if (segments.length > 0) spec.segments = segments;
  }

  return spec;
}

/** Parse existing scheduleSpec back into visual form state (for edit mode) */
function parseScheduleSpec(spec) {
  if (!spec || !spec.frequency) return {};

  const result = {
    scheduleFrequency: spec.frequency,
    scheduleFlexible: spec.flexible !== false,
    scheduleSegments: [],
    scheduleMonthlyMode: 'weeks',
  };

  if (Array.isArray(spec.segments)) {
    for (const seg of spec.segments) {
      const values = Array.isArray(seg.values) ? seg.values : [];
      const children = seg.segments?.[0]?.values || [];
      for (const val of values) {
        result.scheduleSegments.push({
          value: val,
          children: children.length > 0 ? [...children] : [],
        });
      }
    }
    if (spec.frequency === 'MONTHLY' && spec.segments.length > 0) {
      result.scheduleMonthlyMode = spec.segments[0].frequency === 'WEEKLY' ? 'weeks' : 'days';
    }
  }

  return result;
}

/** Build a human-readable summary of the configured schedule */
function getScheduleSummary(segments, frequency, monthlyMode) {
  if (!segments || segments.length === 0) return '';

  const findLabel = (key, list) => list.find((i) => i.key === key)?.label || key;

  return segments.map((seg) => {
    let label;
    if (frequency === 'WEEKLY') label = findLabel(seg.value, WEEKDAYS);
    else if (frequency === 'MONTHLY' && monthlyMode === 'weeks') label = findLabel(seg.value, WEEKS_OF_MONTH);
    else if (frequency === 'MONTHLY' && monthlyMode === 'days') label = findLabel(seg.value, DAYS_OF_MONTH);
    else if (frequency === 'QUARTERLY') label = findLabel(seg.value, QUARTER_MONTHS);
    else if (frequency === 'YEARLY') label = findLabel(seg.value, MONTHS);
    else label = seg.value;

    if (seg.children?.length > 0) {
      const childLabels = seg.children.map((c) => {
        if (frequency === 'WEEKLY') return c; // times like "09:00"
        if (frequency === 'MONTHLY' && monthlyMode === 'weeks') return findLabel(c, WEEKDAYS);
        return c;
      });
      return `${label} (${childLabels.join(', ')})`;
    }
    return label;
  }).join(' · ');
}

/* ═══════════════════════════════════════════════════════════════════════
   SMALL HELPER COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

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
        <option key={opt.value} value={opt.value}>{opt.label}</option>
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
      <div className={[
        'w-4 h-4 rounded-full bg-[#05051a] transition-transform',
        checked ? 'translate-x-5' : 'translate-x-1',
      ].join(' ')} />
    </button>
  );
}

function SectionHeader({ icon: Icon, title, children }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="w-4 h-4 text-slate-500" /> : null}
        <div className="text-sm font-semibold text-slate-300">{title}</div>
      </div>
      {children}
    </div>
  );
}

function ExpandableSection({ label, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
      >
        {Icon ? <Icon className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
        {label}
        <ChevronDown className={['w-3 h-3 transition-transform', open ? 'rotate-180' : ''].join(' ')} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CHIP GRID — multi-select pill buttons
   ═══════════════════════════════════════════════════════════════════════ */

function ChipButton({ label, selected, hasChildren, onClick, onDoubleClick, size = 'md' }) {
  const clickTimer = useRef(null);

  const handleClick = (e) => {
    e.preventDefault();
    if (onDoubleClick) {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        onDoubleClick();
        return;
      }
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onClick();
      }, 250);
    } else {
      onClick();
    }
  };

  useEffect(() => {
    return () => { if (clickTimer.current) clearTimeout(clickTimer.current); };
  }, []);

  const sizeClasses = size === 'sm' ? 'px-2 py-1.5 text-[11px]' : size === 'lg' ? 'px-4 py-2.5 text-sm' : 'px-3 py-2 text-xs';

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.93 }}
      onClick={handleClick}
      className={[
        `${sizeClasses} rounded-lg font-medium transition-all duration-150 text-center relative`,
        selected
          ? 'bg-white text-black shadow-lg shadow-white/10'
          : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 border border-white/[0.06]',
      ].join(' ')}
    >
      {label}
      {selected && hasChildren ? (
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
          <Settings className="w-2 h-2 text-white" />
        </span>
      ) : null}
      {selected && onDoubleClick && !hasChildren ? (
        <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-400 rounded-full" />
      ) : null}
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SCHEDULE SPEC MODAL — the interactive schedule configurator
   ═══════════════════════════════════════════════════════════════════════ */

function ScheduleSpecModal({ frequency, segments, monthlyMode, onSegmentsChange, onMonthlyModeChange, onClose }) {
  const [expandedKey, setExpandedKey] = useState(null);
  const [timeInput, setTimeInput] = useState('');

  const isSelected = (key) => segments.some((s) => s.value === key);
  const getSegment = (key) => segments.find((s) => s.value === key);

  const toggleSegment = (key) => {
    if (isSelected(key)) {
      onSegmentsChange(segments.filter((s) => s.value !== key));
      if (expandedKey === key) setExpandedKey(null);
    } else {
      onSegmentsChange([...segments, { value: key, children: [] }]);
    }
  };

  const expandSegment = (key) => {
    // Must be selected first
    if (!isSelected(key)) {
      onSegmentsChange([...segments, { value: key, children: [] }]);
    }
    setExpandedKey(expandedKey === key ? null : key);
  };

  const toggleChild = (parentKey, childKey) => {
    onSegmentsChange(
      segments.map((s) => {
        if (s.value !== parentKey) return s;
        const has = s.children.includes(childKey);
        return {
          ...s,
          children: has
            ? s.children.filter((c) => c !== childKey)
            : [...s.children, childKey],
        };
      })
    );
  };

  const addTimeChild = (parentKey, time) => {
    if (!time) return;
    onSegmentsChange(
      segments.map((s) => {
        if (s.value !== parentKey) return s;
        if (s.children.includes(time)) return s;
        return { ...s, children: [...s.children, time] };
      })
    );
  };

  const removeTimeChild = (parentKey, time) => {
    onSegmentsChange(
      segments.map((s) => {
        if (s.value !== parentKey) return s;
        return { ...s, children: s.children.filter((c) => c !== time) };
      })
    );
  };

  // Which chips to show
  const getItems = () => {
    switch (frequency) {
      case 'WEEKLY': return WEEKDAYS;
      case 'MONTHLY': return monthlyMode === 'weeks' ? WEEKS_OF_MONTH : DAYS_OF_MONTH;
      case 'QUARTERLY': return QUARTER_MONTHS;
      case 'YEARLY': return MONTHS;
      default: return [];
    }
  };

  // Can this frequency's items be double-clicked for sub-config?
  const supportsSubConfig = () => {
    if (frequency === 'WEEKLY') return true;
    if (frequency === 'MONTHLY' && monthlyMode === 'weeks') return true;
    return false;
  };

  const items = getItems();
  const canExpand = supportsSubConfig();

  // Grid columns based on frequency
  const gridCols =
    frequency === 'MONTHLY' && monthlyMode === 'days'
      ? 'grid-cols-7'
      : frequency === 'YEARLY'
        ? 'grid-cols-4'
        : frequency === 'WEEKLY'
          ? 'grid-cols-7'
          : frequency === 'QUARTERLY'
            ? 'grid-cols-3'
            : 'grid-cols-5';

  // Render expanded sub-config
  const renderExpanded = () => {
    if (!expandedKey) return null;
    const seg = getSegment(expandedKey);
    if (!seg) return null;

    const expandedLabel = items.find((i) => i.key === expandedKey)?.label || expandedKey;

    // WEEKLY → show time picker for the day
    if (frequency === 'WEEKLY') {
      return (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <div className="text-xs text-blue-400 font-medium">
              Check-in times for {expandedLabel}
            </div>
          </div>

          {/* Existing times */}
          {seg.children.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {seg.children.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/15 text-blue-300 text-[11px] border border-blue-500/20">
                  {t}
                  <button type="button" onClick={() => removeTimeChild(expandedKey, t)} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[11px] text-slate-600">No specific times — any time of day</div>
          )}

          {/* Add time */}
          <div className="flex gap-2">
            <Input
              type="time"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="h-8 flex-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus-visible:border-white/25 focus-visible:ring-0"
            />
            <button
              type="button"
              onClick={() => {
                addTimeChild(expandedKey, timeInput);
                setTimeInput('');
              }}
              className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-300 text-xs hover:bg-blue-500/30 transition-colors"
            >
              Add
            </button>
          </div>
        </motion.div>
      );
    }

    // MONTHLY by week → show day chips for that week
    if (frequency === 'MONTHLY' && monthlyMode === 'weeks') {
      return (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 space-y-2"
        >
          <div className="text-xs text-purple-400 font-medium">
            Specific days in {expandedLabel}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => {
              const childSelected = seg.children.includes(d.key);
              return (
                <motion.button
                  key={d.key}
                  type="button"
                  whileTap={{ scale: 0.93 }}
                  onClick={() => toggleChild(expandedKey, d.key)}
                  className={[
                    'px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all text-center',
                    childSelected
                      ? 'bg-purple-500/30 text-purple-200 border border-purple-500/30'
                      : 'bg-white/[0.04] text-slate-500 hover:bg-white/[0.08] border border-white/[0.06]',
                  ].join(' ')}
                >
                  {d.label}
                </motion.button>
              );
            })}
          </div>
          {seg.children.length === 0 ? (
            <div className="text-[11px] text-slate-600">No days selected — entire week counts</div>
          ) : null}
        </motion.div>
      );
    }

    return null;
  };

  // DAILY frequency → just show time picker directly (no chip grid)
  if (frequency === 'DAILY') {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="relative bg-[#0a0a2e] border border-white/10 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-white font-semibold text-sm">Daily Check-in Times</div>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-3">
            {segments.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {segments.map((seg) => (
                  <span key={seg.value} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/15 text-blue-300 text-xs border border-blue-500/20">
                    <Clock className="w-3 h-3" /> {seg.value}
                    <button type="button" onClick={() => onSegmentsChange(segments.filter((s) => s.value !== seg.value))} className="hover:text-white ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500">Add specific times or leave empty for any time</div>
            )}
            <div className="flex gap-2">
              <Input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="h-9 flex-1 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus-visible:border-white/25 focus-visible:ring-0"
              />
              <button
                type="button"
                onClick={() => {
                  if (timeInput && !segments.some((s) => s.value === timeInput)) {
                    onSegmentsChange([...segments, { value: timeInput, children: [] }]);
                    setTimeInput('');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/15 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Done
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="relative bg-[#0a0a2e] border border-white/10 rounded-2xl p-5 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-white font-semibold text-sm">Configure Schedule</div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MONTHLY mode toggle */}
        {frequency === 'MONTHLY' ? (
          <div className="mb-4">
            <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => {
                  onMonthlyModeChange('weeks');
                  onSegmentsChange([]);
                  setExpandedKey(null);
                }}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  monthlyMode === 'weeks' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                By week
              </button>
              <button
                type="button"
                onClick={() => {
                  onMonthlyModeChange('days');
                  onSegmentsChange([]);
                  setExpandedKey(null);
                }}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  monthlyMode === 'days' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300',
                ].join(' ')}
              >
                By date
              </button>
            </div>
          </div>
        ) : null}

        {/* Hint */}
        <div className="text-[11px] text-slate-600 mb-3">
          Tap to select{canExpand ? ' · Double-tap to configure details' : ''}
        </div>

        {/* Chip grid */}
        <div className={`grid ${gridCols} gap-1.5`}>
          {items.map((item) => {
            const seg = getSegment(item.key);
            return (
              <ChipButton
                key={item.key}
                label={item.label}
                selected={!!seg}
                hasChildren={seg?.children?.length > 0}
                onClick={() => toggleSegment(item.key)}
                onDoubleClick={canExpand ? () => expandSegment(item.key) : null}
                size={frequency === 'MONTHLY' && monthlyMode === 'days' ? 'sm' : 'md'}
              />
            );
          })}
        </div>

        {/* Expanded sub-config */}
        <AnimatePresence>
          {expandedKey ? (
            <div className="mt-3">{renderExpanded()}</div>
          ) : null}
        </AnimatePresence>

        {/* Selection count */}
        <div className="mt-3 text-[11px] text-slate-600">
          {segments.length} selected
        </div>

        {/* Done button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          Done
        </button>
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   HEALTH WEIGHTS EDITOR
   ═══════════════════════════════════════════════════════════════════════ */

function HealthWeightsEditor({ form, update, goalType }) {
  const defaults = GOAL_TYPE_WEIGHT_DEFAULTS[goalType] || GOAL_TYPE_WEIGHT_DEFAULTS.GENERAL;
  const allEmpty = form.consistencyWeight === '' && form.momentumWeight === '' && form.progressWeight === '';
  const sum = (Number(form.consistencyWeight) || 0) + (Number(form.momentumWeight) || 0) + (Number(form.progressWeight) || 0);
  const isValid = allEmpty || sum === 100;

  const sliders = [
    { key: 'consistencyWeight', label: 'Consistency', desc: 'Meeting minimum effort', default: defaults.c, color: 'bg-emerald-500' },
    { key: 'momentumWeight', label: 'Momentum', desc: 'Streak longevity', default: defaults.m, color: 'bg-amber-500' },
    { key: 'progressWeight', label: 'Progress', desc: 'Volume vs max effort', default: defaults.p, color: 'bg-blue-500' },
  ];

  return (
    <div className="space-y-4">
      {sliders.map((s) => (
        <div key={s.key} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-300 font-medium">{s.label}</div>
              <div className="text-[10px] text-slate-600">{s.desc}</div>
            </div>
            <Input
              type="number" min={1} max={100}
              value={form[s.key]}
              onChange={(e) => update({ [s.key]: e.target.value })}
              placeholder={String(s.default)}
              className="w-16 h-8 rounded-lg bg-white/5 border border-white/10 text-white text-center text-xs placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0"
            />
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${s.color}`}
              initial={{ width: 0 }}
              animate={{ width: `${Number(form[s.key]) || 0}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      ))}
      <div className={[
        'flex items-center justify-between px-3 py-2 rounded-xl border text-xs',
        allEmpty ? 'border-white/10 bg-white/[0.02] text-slate-500'
          : isValid ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400'
            : 'border-red-500/20 bg-red-500/5 text-red-400',
      ].join(' ')}>
        <span>Total</span>
        <span className="font-mono font-semibold">
          {allEmpty ? `Using defaults (${defaults.c + defaults.m + defaults.p})` : `${sum} / 100`}
        </span>
      </div>
      {!isValid && !allEmpty ? <div className="text-[11px] text-red-400">Weights must sum to exactly 100</div> : null}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — GoalDrawer
   ═══════════════════════════════════════════════════════════════════════ */

export default function GoalDrawer({ isOpen, onClose, onSuccess, parentGoal, editGoal }) {
  const isEdit = Boolean(editGoal?.id);
  const titleText = isEdit ? 'Edit Goal' : parentGoal?.title ? `Add goal under ${parentGoal.title}` : 'New Goal';

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDescription, setShowDescription] = useState(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [allGoals, setAllGoals] = useState([]);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '',
    startDate: '', targetDate: '',
    goalType: '', priority: 'MEDIUM',
    isContainer: false, isMilestone: false,
    metric: 'COUNT', targetOperator: 'GREATER_THAN', targetValue: '', currentValue: 0,
    minimumSessionPeriod: '', maximumSessionPeriod: '', minimumTimeCommittedPeriod: '',
    scheduleFrequency: '', scheduleFlexible: true,
    scheduleSegments: [], scheduleMonthlyMode: 'weeks',
    missesAllowedPerPeriod: '', allowDoubleLogging: true,
    consistencyWeight: '', momentumWeight: '', progressWeight: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const g = editGoal || {};
    setError(''); setIsSaving(false);
    setShowDescription(false); setShowAdvancedOptions(false);
    setParentSearch(''); setSelectedParentGoal(null); setShowParentDropdown(false);
    setShowScheduleModal(false);

    (async () => {
      try {
        const res = await goalsApi.getAll();
        setAllGoals(
          (Array.isArray(res) ? res : null) ||
          (Array.isArray(res?.data) ? res.data : null) ||
          (Array.isArray(res?.data?.data) ? res.data.data : null) || []
        );
      } catch { /* silent */ }
    })();

    const parsed = parseScheduleSpec(g.scheduleSpec);

    setForm({
      title: g.title || '', description: g.description || '',
      startDate: toDateInputValue(g.startDate) || toDateInputValue(new Date()),
      targetDate: toDateInputValue(g.targetDate),
      goalType: g.goalType || '', priority: g.priority || 'MEDIUM',
      isContainer: g.isLeaf === false, isMilestone: Boolean(g.isMilestone),
      metric: g.metric || 'COUNT', targetOperator: g.targetOperator || 'GREATER_THAN',
      targetValue: g.targetValue ?? '', currentValue: g.currentValue ?? 0,
      minimumSessionPeriod: g.minimumSessionPeriod ?? '',
      maximumSessionPeriod: g.maximumSessionPeriod ?? '',
      minimumTimeCommittedPeriod: g.minimumTimeCommittedPeriod ?? '',
      scheduleFrequency: parsed.scheduleFrequency || '',
      scheduleFlexible: parsed.scheduleFlexible ?? true,
      scheduleSegments: parsed.scheduleSegments || [],
      scheduleMonthlyMode: parsed.scheduleMonthlyMode || 'weeks',
      missesAllowedPerPeriod: g.missesAllowedPerPeriod ?? '',
      allowDoubleLogging: g.allowDoubleLogging !== false,
      consistencyWeight: g.consistencyWeight ?? '',
      momentumWeight: g.momentumWeight ?? '',
      progressWeight: g.progressWeight ?? '',
    });

    if (g.description) setShowDescription(true);
  }, [isOpen, editGoal]);

  // Close parent dropdown on outside click
  useEffect(() => {
    if (!showParentDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('.parent-goal-dropdown')) setShowParentDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showParentDropdown]);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const periodLabel = useMemo(() => {
    switch (form.scheduleFrequency) {
      case 'DAILY': return 'per day';
      case 'WEEKLY': return 'per week';
      case 'MONTHLY': return 'per month';
      case 'QUARTERLY': return 'per quarter';
      case 'YEARLY': return 'per year';
      default: return 'per period';
    }
  }, [form.scheduleFrequency]);

  const scheduleSummary = useMemo(() =>
    getScheduleSummary(form.scheduleSegments, form.scheduleFrequency, form.scheduleMonthlyMode),
    [form.scheduleSegments, form.scheduleFrequency, form.scheduleMonthlyMode]
  );

  /* ─── Build payload ─── */
  const buildPayload = () => {
    const parentGoalId =
      selectedParentGoal?.uuid || selectedParentGoal?.id ||
      parentGoal?.uuid || parentGoal?.id || null;

    const payload = {
      title: form.title,
      description: form.description || undefined,
      goalType: form.goalType || undefined,
      priority: form.priority || undefined,
      isMilestone: form.isContainer ? true : Boolean(form.isMilestone),
      parentGoalId,
      isLeaf: !form.isContainer,
      metric: showAdvancedOptions ? form.metric || 'COUNT' : 'COUNT',
      targetOperator: showAdvancedOptions ? form.targetOperator || 'GREATER_THAN' : 'GREATER_THAN',
      targetValue: form.isContainer ? 1 : form.targetValue === '' ? undefined : parseFloat(form.targetValue),
    };

    if (!form.isContainer) {
      payload.currentValue = 0;
      payload.scheduleSpec = buildScheduleSpec(form) || undefined;
      payload.minimumSessionPeriod = form.minimumSessionPeriod !== '' ? parseInt(form.minimumSessionPeriod) : undefined;
      payload.maximumSessionPeriod = form.maximumSessionPeriod !== '' ? parseInt(form.maximumSessionPeriod) : undefined;
      payload.minimumTimeCommittedPeriod = form.minimumTimeCommittedPeriod !== '' ? parseInt(form.minimumTimeCommittedPeriod) : undefined;
      payload.missesAllowedPerPeriod = form.missesAllowedPerPeriod !== '' ? parseInt(form.missesAllowedPerPeriod) : undefined;
      payload.allowDoubleLogging = Boolean(form.allowDoubleLogging);

      if (form.consistencyWeight !== '' || form.momentumWeight !== '' || form.progressWeight !== '') {
        payload.consistencyWeight = form.consistencyWeight !== '' ? parseInt(form.consistencyWeight) : undefined;
        payload.momentumWeight = form.momentumWeight !== '' ? parseInt(form.momentumWeight) : undefined;
        payload.progressWeight = form.progressWeight !== '' ? parseInt(form.progressWeight) : undefined;
      }

      payload.startDate = form.startDate ? `${form.startDate}T00:00:00` : undefined;
      payload.targetDate = form.targetDate ? `${form.targetDate}T23:59:59` : null;
    }

    return payload;
  };

  /* ─── Save ─── */
  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.isContainer) {
      const tv = parseFloat(form.targetValue);
      if (!Number.isFinite(tv) || tv <= 0) { setError('Target Number must be greater than 0'); return; }
    }
    const wc = Number(form.consistencyWeight) || 0;
    const wm = Number(form.momentumWeight) || 0;
    const wp = Number(form.progressWeight) || 0;
    const anyW = form.consistencyWeight !== '' || form.momentumWeight !== '' || form.progressWeight !== '';
    if (anyW && wc + wm + wp !== 100) { setError('Health weights must sum to exactly 100'); return; }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) await goalsApi.update(editGoal.id, payload);
      else await goalsApi.create(payload);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Something went wrong.');
    } finally {
      setIsSaving(false);
    }
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 z-40"
            onClick={() => (isSaving ? null : onClose?.())}
          />
          <motion.aside
            initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full md:w-[480px] bg-[#05051a] border-l border-white/[0.08] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-white/[0.08]">
              <div className="text-white text-lg font-semibold truncate">{titleText}</div>
              <button type="button" onClick={() => (isSaving ? null : onClose?.())}
                className="w-9 h-9 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors flex items-center justify-center"
                aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {error ? (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </motion.div>
              ) : null}

              {/* ─── SECTION 1: Basic Info ─── */}
              <div>
                <SectionHeader title="Basic Info" />
                <div className="space-y-4">
                  <Field label="Goal Title *">
                    <Input value={form.title} onChange={(e) => update({ title: e.target.value })}
                      placeholder="e.g. Master Quantitative for CAT" required
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                  </Field>
                  {!showDescription ? (
                    <button type="button" onClick={() => setShowDescription(true)}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add description
                    </button>
                  ) : (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Field label="Description">
                        <Textarea rows={3} value={form.description} onChange={(e) => update({ description: e.target.value })}
                          placeholder="What does achieving this goal mean to you?" />
                      </Field>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* ─── SECTION 2: Timeline ─── */}
              <div>
                <SectionHeader icon={Calendar} title="Timeline" />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date">
                    <Input type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })}
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white focus-visible:border-white/25 focus-visible:ring-0" />
                  </Field>
                  <Field label="Target Date">
                    <Input type="date" value={form.targetDate} onChange={(e) => update({ targetDate: e.target.value })}
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white focus-visible:border-white/25 focus-visible:ring-0" />
                  </Field>
                </div>
              </div>

              {/* ─── SECTION 3: Goal Setup ─── */}
              <div>
                <SectionHeader title="Goal Setup" />
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Goal type</div>
                    <div className="flex flex-wrap gap-1.5">
                      {GOAL_TYPES.map((gt) => (
                        <motion.button key={gt.value} type="button" whileTap={{ scale: 0.95 }}
                          onClick={() => update({ goalType: gt.value })}
                          className={[
                            'px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5',
                            form.goalType === gt.value
                              ? 'bg-white text-black shadow-lg shadow-white/10'
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 border border-white/[0.06]',
                          ].join(' ')}>
                          <span>{gt.icon}</span> {gt.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-2">Priority</div>
                    <div className="flex flex-wrap gap-1.5">
                      {PRIORITIES.map((pr) => (
                        <motion.button key={pr.value} type="button" whileTap={{ scale: 0.95 }}
                          onClick={() => update({ priority: pr.value })}
                          className={[
                            'px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                            form.priority === pr.value ? pr.color
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] border border-white/[0.06]',
                          ].join(' ')}>
                          {pr.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                  {!isEdit && !parentGoal ? (
                    <Field label="Parent Goal (optional)">
                      <div className="relative parent-goal-dropdown">
                        {selectedParentGoal ? (
                          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-3 py-2.5">
                            <span className="text-sm text-white">{selectedParentGoal.title}</span>
                            <button type="button" onClick={() => { setSelectedParentGoal(null); setParentSearch(''); }}
                              className="text-slate-400 hover:text-white ml-2"><X className="w-3 h-3" /></button>
                          </div>
                        ) : (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input type="text" value={parentSearch}
                              onChange={(e) => { setParentSearch(e.target.value); setShowParentDropdown(true); }}
                              onFocus={() => setShowParentDropdown(true)}
                              onBlur={() => setTimeout(() => setShowParentDropdown(false), 150)}
                              placeholder="Search goals..."
                              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-white/25" />
                            {showParentDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-[#0a0a1a] border border-white/10 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                {allGoals.filter((g) => !parentSearch || g.title?.toLowerCase().includes(parentSearch.toLowerCase()))
                                  .slice(0, 8).map((g) => (
                                    <button key={g.id} type="button"
                                      className="w-full text-left px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between"
                                      onClick={() => { setSelectedParentGoal(g); setParentSearch(''); setShowParentDropdown(false); }}>
                                      <span>{g.title}</span>
                                      <span className="text-xs text-slate-500 ml-2">{g.goalType || ''}</span>
                                    </button>
                                  ))}
                                {allGoals.filter((g) => !parentSearch || g.title?.toLowerCase().includes(parentSearch.toLowerCase())).length === 0 && (
                                  <div className="px-3 py-3 text-sm text-slate-500">No goals found</div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Field>
                  ) : null}
                </div>
              </div>

              {/* ─── SECTION 4: Container toggle ─── */}
              <div>
                <SectionHeader title="How will you manage this goal?" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white text-sm">Break into sub-goals</div>
                    <div className="text-xs text-slate-500">I&apos;ll track this via smaller goals, not directly</div>
                  </div>
                  <SwitchToggle checked={form.isContainer} onChange={(v) => update({ isContainer: v })} />
                </div>
                {form.isContainer ? (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                    This goal&apos;s health will be calculated from its child goals automatically.
                  </motion.div>
                ) : null}
              </div>

              {/* ─── SECTION 5: Progress Tracking ─── */}
              {!form.isContainer ? (
                <div>
                  <SectionHeader title="Progress Tracking" />
                  <div className="space-y-4">
                    <Field label="Overall Target Number">
                      <Input type="number" value={form.targetValue} onChange={(e) => update({ targetValue: e.target.value })}
                        placeholder="e.g. 500"
                        className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                    </Field>

                    {!showAdvancedOptions ? (
                      <button type="button" onClick={() => setShowAdvancedOptions(true)}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Advanced options
                      </button>
                    ) : (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 border-l-2 border-white/10 pl-4">
                        <Field label="What are you tracking?">
                          <Select value={form.metric} onChange={(v) => update({ metric: v })} options={METRICS} />
                        </Field>
                        <Field label="Target Operator">
                          <Select value={form.targetOperator} onChange={(v) => update({ targetOperator: v })} options={OPERATORS} />
                        </Field>
                        <button type="button" onClick={() => setShowAdvancedOptions(false)}
                          className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Hide advanced options</button>
                      </motion.div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* ─── SECTION 6: Effort & Limits (VISIBLE — right after target) ─── */}
              {!form.isContainer ? (
                <div>
                  <SectionHeader icon={Zap} title="Effort & Commitment" />
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={`Min activities ${periodLabel}`} hint="Consistency target">
                        <Input type="number" min={0} value={form.minimumSessionPeriod}
                          onChange={(e) => update({ minimumSessionPeriod: e.target.value })}
                          placeholder="e.g. 3"
                          className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                      </Field>
                      <Field label={`Max activities ${periodLabel}`} hint="Progress cap">
                        <Input type="number" min={0} value={form.maximumSessionPeriod}
                          onChange={(e) => update({ maximumSessionPeriod: e.target.value })}
                          placeholder="e.g. 10"
                          className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                      </Field>
                    </div>
                    <Field label={`Time commitment ${periodLabel}`} hint="Minutes">
                      <Input type="number" min={0} value={form.minimumTimeCommittedPeriod}
                        onChange={(e) => update({ minimumTimeCommittedPeriod: e.target.value })}
                        placeholder="e.g. 120"
                        className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                    </Field>
                    <div className="text-[11px] text-slate-600">
                      Activities = count of goal-related actions. Time = total minutes you&apos;re committing {periodLabel}.
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ─── SECTION 7: Schedule ─── */}
              {!form.isContainer ? (
                <div>
                  <SectionHeader icon={Calendar} title="Schedule" />
                  <div className="space-y-4">
                    {/* Frequency pills */}
                    <div>
                      <div className="text-xs text-slate-400 mb-2">How often?</div>
                      <div className="flex flex-wrap gap-1.5">
                        {FREQUENCIES.map((f) => (
                          <motion.button key={f.value} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              const newFreq = f.value === form.scheduleFrequency ? '' : f.value;
                              update({
                                scheduleFrequency: newFreq,
                                scheduleFlexible: true,
                                scheduleSegments: [],
                                scheduleMonthlyMode: 'weeks',
                              });
                            }}
                            className={[
                              'px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                              form.scheduleFrequency === f.value
                                ? 'bg-white text-black shadow-lg shadow-white/10'
                                : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200 border border-white/[0.06]',
                            ].join(' ')}>
                            {f.label}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Flexible / Specific toggle */}
                    {form.scheduleFrequency ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
                          <button type="button"
                            onClick={() => update({ scheduleFlexible: true, scheduleSegments: [] })}
                            className={[
                              'px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                              form.scheduleFlexible
                                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300',
                            ].join(' ')}>
                            Flexible
                          </button>
                          <button type="button"
                            onClick={() => {
                              update({ scheduleFlexible: false });
                              setShowScheduleModal(true);
                            }}
                            className={[
                              'px-4 py-2 rounded-lg text-xs font-medium transition-all duration-150',
                              !form.scheduleFlexible
                                ? 'bg-amber-500/20 text-amber-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-300',
                            ].join(' ')}>
                            Specific
                          </button>
                        </div>

                        {/* Flexible mode description */}
                        {form.scheduleFlexible ? (
                          <div className="mt-2 text-[11px] text-slate-600">
                            Check in anytime within the {form.scheduleFrequency.toLowerCase()} period. No fixed days or times.
                          </div>
                        ) : null}

                        {/* Specific mode summary */}
                        {!form.scheduleFlexible ? (
                          <div className="mt-3">
                            {form.scheduleSegments.length > 0 ? (
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-white font-medium">
                                    {scheduleSummary}
                                  </div>
                                  <button type="button" onClick={() => setShowScheduleModal(true)}
                                    className="text-slate-400 hover:text-white transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" onClick={() => setShowScheduleModal(true)}
                                className="w-full py-3 rounded-xl border border-dashed border-white/10 text-xs text-slate-500 hover:text-slate-300 hover:border-white/20 transition-colors flex items-center justify-center gap-1.5">
                                <Plus className="w-3 h-3" /> Configure specific schedule
                              </button>
                            )}
                          </div>
                        ) : null}
                      </motion.div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* ─── SECTION 8: Fine-tuning (expandable) ─── */}
              {!form.isContainer ? (
                <div className="space-y-3">
                  <ExpandableSection label="Fine-tuning" icon={Sliders} defaultOpen={!!(form.missesAllowedPerPeriod)}>
                    <div className="space-y-4">
                      <Field label="Misses allowed per period" hint="Grace period before momentum breaks">
                        <Input type="number" min={0} value={form.missesAllowedPerPeriod}
                          onChange={(e) => update({ missesAllowedPerPeriod: e.target.value })}
                          placeholder="e.g. 2"
                          className="h-9 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                      </Field>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white text-sm">Allow multiple sessions per day</div>
                          <div className="text-xs text-slate-500">Allow double logging</div>
                        </div>
                        <SwitchToggle checked={form.allowDoubleLogging} onChange={(v) => update({ allowDoubleLogging: v })} />
                      </div>
                    </div>
                  </ExpandableSection>

                  <ExpandableSection label="Health Weights" icon={Sliders}
                    defaultOpen={!!(form.consistencyWeight || form.momentumWeight || form.progressWeight)}>
                    <HealthWeightsEditor form={form} update={update} goalType={form.goalType} />
                  </ExpandableSection>
                </div>
              ) : null}
            </form>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-white/[0.08]">
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => (isSaving ? null : onClose?.())}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-60"
                  disabled={isSaving}>Cancel</button>
                <button type="submit" onClick={handleSave}
                  className="bg-white text-black font-semibold px-6 py-2 rounded-xl hover:bg-gray-100 disabled:opacity-60 inline-flex items-center"
                  disabled={isSaving}>
                  {isSaving ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>) : 'Save'}
                </button>
              </div>
            </div>
          </motion.aside>

          {/* Schedule spec modal */}
          <AnimatePresence>
            {showScheduleModal && form.scheduleFrequency ? (
              <ScheduleSpecModal
                frequency={form.scheduleFrequency}
                segments={form.scheduleSegments}
                monthlyMode={form.scheduleMonthlyMode}
                onSegmentsChange={(segs) => update({ scheduleSegments: segs })}
                onMonthlyModeChange={(mode) => update({ scheduleMonthlyMode: mode })}
                onClose={() => setShowScheduleModal(false)}
              />
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
