'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  Clock,
  Info,
  Loader2,
  Pencil,
  Plus,
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

function parseDateInput(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysInclusive(start, end) {
  const startDay = new Date(start);
  const endDay = new Date(end);
  startDay.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);
  return Math.floor((endDay - startDay) / 86400000) + 1;
}

function startOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  const distanceFromMonday = day === 0 ? 6 : day - 1;
  result.setDate(result.getDate() - distanceFromMonday);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfPeriod(date, frequency) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  switch (frequency) {
    case 'WEEKLY':
      return startOfWeek(result);
    case 'MONTHLY':
      return new Date(result.getFullYear(), result.getMonth(), 1);
    case 'QUARTERLY': {
      const quarterStartMonth = Math.floor(result.getMonth() / 3) * 3;
      return new Date(result.getFullYear(), quarterStartMonth, 1);
    }
    case 'YEARLY':
      return new Date(result.getFullYear(), 0, 1);
    default:
      return result;
  }
}

function addPeriod(date, frequency) {
  const next = new Date(date);
  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      return next;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      return next;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      return next;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      next.setDate(next.getDate() + 1);
      return next;
  }
}

function periodLabelFor(frequency) {
  switch (frequency) {
    case 'DAILY': return 'days';
    case 'WEEKLY': return 'weeks';
    case 'MONTHLY': return 'months';
    case 'QUARTERLY': return 'quarters';
    case 'YEARLY': return 'years';
    default: return 'periods';
  }
}

/** Parse min/max activity fields from form or API (string, number, null). Empty → null. */
function parseOptionalActivityBound(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Required Goal Info + Goal Setup fields before switching to direct tracking (toggle off). Description optional. */
function validateRequiredBeforeDisablingChildTracking(form, totalPeriodsResult) {
  if (!form.title?.trim()) {
    return 'Add a goal title under Goal Info before enabling direct tracking.';
  }
  if (!form.startDate || !form.targetDate) {
    return 'Set a start date and an end date under Goal Info before enabling direct tracking.';
  }
  if (!form.goalType) {
    return 'Select a goal type under Goal Setup before enabling direct tracking.';
  }
  if (!form.priority) {
    return 'Select a priority under Goal Setup before enabling direct tracking.';
  }
  if (!totalPeriodsResult?.value) {
    return totalPeriodsResult?.detail || 'Update the date range under Goal Info so the evaluation period is valid, then try again.';
  }
  return null;
}

function calculateTotalPeriods(startValue, endValue, frequency) {
  const start = parseDateInput(startValue);
  const end = parseDateInput(endValue);

  if (!frequency) {
    return { value: null, display: '', detail: 'Choose a schedule type first.' };
  }
  if (!start || !end) {
    return { value: null, display: '', detail: 'Select start and end dates.' };
  }
  if (end < start) {
    return { value: null, display: '', detail: 'End date must be after start date.' };
  }

  if (frequency === 'DAILY') {
    const totalDays = daysInclusive(start, end);
    return {
      value: totalDays,
      display: `${totalDays} ${periodLabelFor(frequency)}`,
      detail: `Daily periods use inclusive calendar days: end date - start date + 1 = ${totalDays}.`,
    };
  }

  let cursor = new Date(start);
  let total = 0;
  const segments = [];

  while (cursor <= end) {
    const periodStart = startOfPeriod(cursor, frequency);
    const nextPeriodStart = addPeriod(periodStart, frequency);
    const periodEnd = addDays(nextPeriodStart, -1);
    const segmentEnd = periodEnd < end ? periodEnd : end;
    const daysInSegment = daysInclusive(cursor, segmentEnd);
    const daysInWholePeriod = daysInclusive(periodStart, periodEnd);
    const fraction = daysInSegment / daysInWholePeriod;

    total += fraction;
    segments.push(`${daysInSegment}/${daysInWholePeriod}`);
    cursor = addDays(segmentEnd, 1);
  }

  const fractional = Math.round(total * 100) / 100;
  const periodCount = Math.ceil(total);
  return {
    value: periodCount,
    display: `${periodCount} ${periodLabelFor(frequency)}`,
    detail: `${frequency.toLowerCase()} periods use calendar boundaries. Partial periods are days in range ÷ days in that calendar period: ${segments.join(' + ')} ≈ ${fractional}; total periods for this goal uses ${periodCount} (rounded up).`,
  };
}

function formatNumberValue(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function formatCommittedTime(minutes) {
  const number = Number(minutes);
  if (!Number.isFinite(number) || number <= 0) return '';
  const rounded = Math.round(number);
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours === 0) return `${rounded} min`;
  return mins === 0 ? `${hours}h (${rounded} min)` : `${hours}h ${mins}m (${rounded} min)`;
}

/** Look up a human label for an enum value from a {value,label} list. */
function labelOf(list, value) {
  if (value === null || value === undefined || value === '') return '';
  const found = list.find((item) => item.value === value);
  return found ? found.label : String(value);
}

/** Round a numeric score to a whole number for display, '' when absent. */
function formatScoreValue(value) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number)) : '';
}

/** Format an ISO date/datetime for read-only display, '' when absent. */
function formatDateDisplay(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

function toInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function mapWeekKeyToValue(weekKey) {
  const numeric = toInt(String(weekKey || '').replace('W', ''));
  return numeric && numeric >= 1 && numeric <= 5 ? numeric : null;
}

function mapDayKeyToValue(dayKey) {
  const numeric = toInt(String(dayKey || '').replace('D', ''));
  return numeric && numeric >= 1 && numeric <= 31 ? numeric : null;
}

function mapQuarterMonthKeyToValue(monthKey) {
  const numeric = toInt(String(monthKey || '').replace('M', ''));
  return numeric && numeric >= 1 && numeric <= 3 ? numeric : null;
}

function mapMonthNameToValue(monthName) {
  const idx = MONTHS.findIndex((m) => m.key === monthName);
  return idx >= 0 ? idx + 1 : null;
}

function mapMonthValueToName(monthValue) {
  const idx = toInt(monthValue);
  return idx && idx >= 1 && idx <= 12 ? MONTHS[idx - 1].key : null;
}

function createRequirements(minValue, maxValue) {
  const minCheckins = toInt(minValue);
  const maxCheckins = toInt(maxValue);
  if (minCheckins == null && maxCheckins == null) return undefined;
  if (minCheckins != null && maxCheckins != null && maxCheckins < minCheckins) return undefined;
  return {
    minCheckins: minCheckins ?? 0,
    maxCheckins: maxCheckins ?? null,
  };
}

/** Build scheduleSpec JSON from visual form state */
function buildScheduleSpec(form) {
  if (!form.scheduleFrequency) return undefined;

  const spec = {
    version: 2,
    scheduleType: form.scheduleFrequency,
    weekStartsOn: 'MONDAY',
    weekOfMonthModel: 'DAY_BUCKETS',
    rules: [],
    exclusions: [],
  };

  try { spec.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }
  if (!spec.timezone) spec.timezone = 'UTC';

  const requirements = createRequirements(form.minimumSessionPeriod, form.maximumSessionPeriod);
  if (requirements) spec.requirements = requirements;

  if (form.scheduleFlexible || form.scheduleSegments.length === 0) {
    return spec;
  }

  if (form.scheduleFrequency === 'DAILY') {
    const timeValues = form.scheduleSegments
      .map((s) => s.value)
      .filter(Boolean);
    if (timeValues.length > 0) {
      spec.rules.push({ scope: 'TIME_OF_DAY', values: timeValues, mode: 'STRICT' });
    }
    return spec;
  }

  if (form.scheduleFrequency === 'WEEKLY') {
    form.scheduleSegments.forEach((seg) => {
      if (!seg?.value) return;
      const rule = {
        scope: 'DAY_OF_WEEK',
        values: [seg.value],
        mode: 'STRICT',
      };
      if (Array.isArray(seg.children) && seg.children.length > 0) {
        rule.rules = [{
          scope: 'TIME_OF_DAY',
          values: [...seg.children],
          mode: 'STRICT',
        }];
      }
      spec.rules.push(rule);
    });
    return spec;
  }

  if (form.scheduleFrequency === 'MONTHLY') {
    if (form.scheduleMonthlyMode === 'days') {
      const dayValues = form.scheduleSegments
        .map((s) => mapDayKeyToValue(s.value))
        .filter((v) => v != null);
      if (dayValues.length > 0) {
        spec.rules.push({ scope: 'DAY_OF_MONTH', values: dayValues, mode: 'STRICT' });
      }
      return spec;
    }

    form.scheduleSegments.forEach((seg) => {
      const weekValue = mapWeekKeyToValue(seg?.value);
      if (!weekValue) return;
      if (Array.isArray(seg.children) && seg.children.length > 0) {
        spec.rules.push({
          scope: 'WEEK_OF_MONTH',
          values: [weekValue],
          mode: 'STRICT',
          rules: [{
            scope: 'DAY_OF_WEEK',
            values: [...seg.children],
            mode: 'STRICT',
          }],
        });
      } else {
        spec.rules.push({
          scope: 'WEEK_OF_MONTH',
          values: [weekValue],
          mode: 'FLEXIBLE',
        });
      }
    });
    return spec;
  }

  if (form.scheduleFrequency === 'QUARTERLY') {
    const values = form.scheduleSegments
      .map((s) => mapQuarterMonthKeyToValue(s.value))
      .filter((v) => v != null);
    if (values.length > 0) {
      spec.rules.push({ scope: 'MONTH_OF_QUARTER', values, mode: 'STRICT' });
    }
    return spec;
  }

  if (form.scheduleFrequency === 'YEARLY') {
    const values = form.scheduleSegments
      .map((s) => mapMonthNameToValue(s.value))
      .filter((v) => v != null);
    if (values.length > 0) {
      spec.rules.push({ scope: 'MONTH_OF_YEAR', values, mode: 'STRICT' });
    }
    return spec;
  }

  return spec;
}

/** Parse existing scheduleSpec back into visual form state (for edit mode) */
function parseScheduleSpec(spec) {
  if (!spec) return {};
  // Backward compatibility with legacy schedule format.
  if (spec.frequency) {
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
  if (!spec.scheduleType) return {};

  const result = {
    scheduleFrequency: spec.scheduleType,
    scheduleFlexible: true,
    scheduleSegments: [],
    scheduleMonthlyMode: 'weeks',
  };

  const rules = Array.isArray(spec.rules) ? spec.rules : [];
  if (rules.length === 0) return result;
  result.scheduleFlexible = false;

  if (result.scheduleFrequency === 'DAILY') {
    const rule = rules.find((r) => r.scope === 'TIME_OF_DAY');
    const values = Array.isArray(rule?.values) ? rule.values : [];
    result.scheduleSegments = values.map((time) => ({ value: time, children: [] }));
    return result;
  }

  if (result.scheduleFrequency === 'WEEKLY') {
    result.scheduleSegments = rules
      .filter((r) => r.scope === 'DAY_OF_WEEK')
      .flatMap((r) => {
        const dayValues = Array.isArray(r.values) ? r.values : [];
        const timeRule = Array.isArray(r.rules) ? r.rules.find((child) => child.scope === 'TIME_OF_DAY') : null;
        const timeValues = Array.isArray(timeRule?.values) ? timeRule.values : [];
        return dayValues.map((day) => ({ value: day, children: [...timeValues] }));
      });
    return result;
  }

  if (result.scheduleFrequency === 'MONTHLY') {
    const dayRule = rules.find((r) => r.scope === 'DAY_OF_MONTH');
    if (dayRule) {
      result.scheduleMonthlyMode = 'days';
      result.scheduleSegments = (Array.isArray(dayRule.values) ? dayRule.values : [])
        .map((day) => toInt(day))
        .filter((day) => day != null)
        .map((day) => ({ value: `D${day}`, children: [] }));
      return result;
    }

    result.scheduleMonthlyMode = 'weeks';
    result.scheduleSegments = rules
      .filter((r) => r.scope === 'WEEK_OF_MONTH')
      .flatMap((r) => {
        const weekValues = Array.isArray(r.values) ? r.values : [];
        const dayRuleChild = Array.isArray(r.rules) ? r.rules.find((child) => child.scope === 'DAY_OF_WEEK') : null;
        const dayValues = Array.isArray(dayRuleChild?.values) ? dayRuleChild.values : [];
        return weekValues
          .map((week) => toInt(week))
          .filter((week) => week != null)
          .map((week) => ({ value: `W${week}`, children: [...dayValues] }));
      });
    return result;
  }

  if (result.scheduleFrequency === 'QUARTERLY') {
    const monthRule = rules.find((r) => r.scope === 'MONTH_OF_QUARTER');
    result.scheduleSegments = (Array.isArray(monthRule?.values) ? monthRule.values : [])
      .map((month) => toInt(month))
      .filter((month) => month != null)
      .map((month) => ({ value: `M${month}`, children: [] }));
    return result;
  }

  if (result.scheduleFrequency === 'YEARLY') {
    const monthRule = rules.find((r) => r.scope === 'MONTH_OF_YEAR');
    result.scheduleSegments = (Array.isArray(monthRule?.values) ? monthRule.values : [])
      .map((month) => mapMonthValueToName(month))
      .filter(Boolean)
      .map((monthKey) => ({ value: monthKey, children: [] }));
    return result;
  }

  result.scheduleFlexible = true;
  result.scheduleSegments = [];
  return result;
}

function getRequirementsFromScheduleSpec(spec) {
  if (!spec || typeof spec !== 'object') return {};
  if (spec.version === 2 && spec.requirements) {
    const min = toInt(spec.requirements.minCheckins);
    const max = toInt(spec.requirements.maxCheckins);
    return {
      minimumSessionPeriod: min ?? '',
      maximumSessionPeriod: max ?? '',
    };
  }
  if (spec.constraints) {
    const min = toInt(spec.constraints.minCheckinsRequired);
    const max = toInt(spec.constraints.maxCheckinsAllowed);
    return {
      minimumSessionPeriod: min ?? '',
      maximumSessionPeriod: max ?? '',
    };
  }
  return {};
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

function Field({ label, children, hint, stackedHint }) {
  if (hint && stackedHint) {
    return (
      <div className="min-w-0">
        <label className="block text-sm font-medium text-slate-300">{label}</label>
        <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span>
        <div className="mt-1">{children}</div>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        {hint ? <span className="shrink-0 text-[11px] text-slate-500">{hint}</span> : null}
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
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={[
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200',
        checked
          ? 'border-white/45 bg-white'
          : 'border-white/30 bg-white/[0.14] shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]',
      ].join(' ')}
      aria-label="Toggle"
    >
      <span
        className={[
          'pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full shadow-sm ring-1 ring-black/10 transition-transform duration-200 ease-out',
          checked ? 'translate-x-5 bg-[#0a0a2e]' : 'translate-x-0 bg-white',
        ].join(' ')}
      />
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

function FormSection({ icon, title, children, tone = 'blue' }) {
  const toneClasses = {
    blue: 'from-blue-500/10 via-white/[0.03] to-white/[0.02] border-blue-500/15',
    green: 'from-emerald-500/10 via-white/[0.03] to-white/[0.02] border-emerald-500/15',
    amber: 'from-amber-500/10 via-white/[0.03] to-white/[0.02] border-amber-500/15',
    slate: 'from-white/[0.06] via-white/[0.03] to-white/[0.02] border-white/[0.08]',
  };

  return (
    <section className={`rounded-2xl border bg-gradient-to-br p-4 ${toneClasses[tone] || toneClasses.slate}`}>
      <SectionHeader icon={icon} title={title} />
      {children}
    </section>
  );
}

function InfoTooltip({ title, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
        aria-label={title}
      >
        <Info className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-white/10 bg-[#080820] p-3 text-xs text-slate-300 shadow-2xl"
          >
            <div className="mb-1 font-semibold text-white">{title}</div>
            <div className="leading-5 text-slate-400">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ReadOnlyInfoField({ label, value, placeholder = 'Auto calculated', tooltipTitle, tooltip }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          value={value || ''}
          placeholder={placeholder}
          disabled
          readOnly
          className="w-full h-10 rounded-xl bg-white/[0.03] border border-white/10 px-3 pr-11 text-sm text-slate-300 placeholder:text-slate-600 disabled:opacity-100"
        />
        {tooltip ? (
          <div className="absolute right-1 top-1">
            <InfoTooltip title={tooltipTitle}>{tooltip}</InfoTooltip>
          </div>
        ) : null}
      </div>
    </Field>
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
  const editGoalId =
    editGoal?.id || editGoal?.uuid || editGoal?.goalId || editGoal?.goalUuid;
  const isEdit = Boolean(editGoalId);
  const titleText = isEdit ? 'Edit Goal' : parentGoal?.title ? `Add goal under ${parentGoal.title}` : 'New Goal';
  const parentTitleForDisplay =
    !isEdit && parentGoal ? (parentGoal.title || parentGoal.name || '') : '';

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '',
    startDate: '', targetDate: '',
    goalType: '', priority: 'MEDIUM',
    isContainer: true, isMilestone: false,
    metric: 'COUNT', targetOperator: 'GREATER_THAN', targetValue: '', currentValue: 0,
    minimumSessionPeriod: '', maximumSessionPeriod: '', minimumTimeCommittedPerActivity: '',
    scheduleFrequency: 'DAILY', scheduleFlexible: true,
    scheduleSegments: [], scheduleMonthlyMode: 'weeks',
    missesAllowedPerPeriod: '', allowDoubleLogging: true,
    consistencyWeight: '', momentumWeight: '', progressWeight: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    const g = editGoal || {};
    setError(''); setIsSaving(false);
    setShowAdvancedOptions(false);
    setShowScheduleModal(false);
    setShowDescription(Boolean(String(g.description || '').trim()));

    const parsed = parseScheduleSpec(g.scheduleSpec);
    const scheduleRequirements = getRequirementsFromScheduleSpec(g.scheduleSpec);
    setForm({
      title: g.title || '', description: g.description || '',
      startDate: isEdit ? toDateInputValue(g.startDate) : toDateInputValue(g.startDate) || toDateInputValue(new Date()),
      targetDate: toDateInputValue(g.targetDate),
      goalType: g.goalType || '', priority: g.priority || 'MEDIUM',
      isContainer: isEdit ? g.isLeaf === false : true,
      isMilestone: Boolean(g.isMilestone),
      metric: g.metric || 'COUNT', targetOperator: g.targetOperator || 'GREATER_THAN',
      targetValue: g.targetValue ?? '', currentValue: g.currentValue ?? 0,
      minimumSessionPeriod: String(
        scheduleRequirements.minimumSessionPeriod
          ?? g.minimumSessionPeriod
          ?? g.minimum_session_period
          ?? ''
      ),
      maximumSessionPeriod: String(
        scheduleRequirements.maximumSessionPeriod
          ?? g.maximumSessionPeriod
          ?? g.maximum_session_period
          ?? ''
      ),
      minimumTimeCommittedPerActivity:
        g.minimumTimeCommittedPerActivity
        ?? g.minimum_time_committed_per_activity
        ?? '',
      scheduleFrequency: parsed.scheduleFrequency || g.scheduleFrequency || 'DAILY',
      scheduleFlexible: parsed.scheduleFlexible ?? true,
      scheduleSegments: parsed.scheduleSegments || [],
      scheduleMonthlyMode: parsed.scheduleMonthlyMode || 'weeks',
      missesAllowedPerPeriod: g.missesAllowedPerPeriod ?? '',
      allowDoubleLogging: g.allowDoubleLogging !== false,
      consistencyWeight: g.consistencyWeight ?? '',
      momentumWeight: g.momentumWeight ?? '',
      progressWeight: g.progressWeight ?? '',
    });
  }, [isOpen, editGoal, isEdit, parentGoal]);

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

  const totalPeriods = useMemo(
    () => calculateTotalPeriods(form.startDate, form.targetDate, form.scheduleFrequency),
    [form.startDate, form.targetDate, form.scheduleFrequency]
  );

  const handleIsContainerChange = (nextIsContainer) => {
    if (nextIsContainer) {
      setError('');
      update({ isContainer: true });
      return;
    }
    const err = validateRequiredBeforeDisablingChildTracking(form, totalPeriods);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    update({ isContainer: false });
  };

  const minimumActivities = useMemo(() => {
    const value = parseFloat(form.minimumSessionPeriod);
    return Number.isFinite(value) ? value : 0;
  }, [form.minimumSessionPeriod]);

  const maximumActivities = useMemo(() => {
    const value = parseFloat(form.maximumSessionPeriod);
    return Number.isFinite(value) ? value : 0;
  }, [form.maximumSessionPeriod]);

  const timeCommittedPerActivity = useMemo(() => {
    const value = parseFloat(form.minimumTimeCommittedPerActivity);
    return Number.isFinite(value) ? value : 0;
  }, [form.minimumTimeCommittedPerActivity]);

  const computedTargetValue = useMemo(() => {
    if (!totalPeriods.value || !maximumActivities) return null;
    return maximumActivities * totalPeriods.value;
  }, [maximumActivities, totalPeriods.value]);

  const computedTimeCommittedPerPeriod = useMemo(() => {
    if (!maximumActivities || !timeCommittedPerActivity) return null;
    return maximumActivities * timeCommittedPerActivity;
  }, [maximumActivities, timeCommittedPerActivity]);

  const computedTimeCommitted = useMemo(() => {
    if (!totalPeriods.value || !computedTimeCommittedPerPeriod) return null;
    return computedTimeCommittedPerPeriod * totalPeriods.value;
  }, [computedTimeCommittedPerPeriod, totalPeriods.value]);

  /* ─── Build payload ─── */
  const buildPayload = () => {
    if (isEdit) {
      const payload = {
        title: form.title,
        description: form.description || '',
        goalType: form.goalType || undefined,
        priority: form.priority || undefined,
      };

      if (form.targetDate) {
        payload.targetDate = `${form.targetDate}T23:59:59`;
      }

      return payload;
    }

    const parentGoalId = parentGoal?.uuid || parentGoal?.id || null;
    const targetValue = computedTargetValue ?? parseFloat(form.targetValue);

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
      targetValue: form.isContainer ? 1 : Number.isFinite(targetValue) ? targetValue : undefined,
    };

    payload.scheduleSpec = buildScheduleSpec(form) || undefined;

    if (!form.isContainer) {
      payload.currentValue = 0;
      payload.minimumSessionPeriod = form.minimumSessionPeriod !== '' ? parseInt(form.minimumSessionPeriod) : undefined;
      payload.maximumSessionPeriod = form.maximumSessionPeriod !== '' ? parseInt(form.maximumSessionPeriod) : undefined;
      payload.minimumTimeCommittedPeriod =
        computedTimeCommittedPerPeriod != null
          ? Math.round(computedTimeCommittedPerPeriod)
          : undefined;
      payload.minimumTimeCommittedPerActivity =
        form.minimumTimeCommittedPerActivity !== ''
          ? parseInt(form.minimumTimeCommittedPerActivity)
          : undefined;
      payload.missesAllowedPerPeriod = form.missesAllowedPerPeriod !== '' ? parseInt(form.missesAllowedPerPeriod) : undefined;
      payload.allowDoubleLogging = Boolean(form.allowDoubleLogging);

      if (form.consistencyWeight !== '' || form.momentumWeight !== '' || form.progressWeight !== '') {
        payload.consistencyWeight = form.consistencyWeight !== '' ? parseInt(form.consistencyWeight) : undefined;
        payload.momentumWeight = form.momentumWeight !== '' ? parseInt(form.momentumWeight) : undefined;
        payload.progressWeight = form.progressWeight !== '' ? parseInt(form.progressWeight) : undefined;
      }
    }

    // Always include dates if present, regardless of container status
    if (form.startDate) {
      payload.startDate = `${form.startDate}T00:00:00`;
    }
    if (form.targetDate) {
      payload.targetDate = `${form.targetDate}T23:59:59`;
    }

    return payload;
  };

  /* ─── Save ─── */
  const handleSave = async (e) => {
    e?.preventDefault?.();
    setError('');

    if (!form.title.trim()) { setError('Goal title is required.'); return; }
    if (isEdit) {
      if (!form.targetDate) { setError('End date is required.'); return; }
      if (!form.goalType) { setError('Select a goal type.'); return; }
      if (!form.priority) { setError('Select a priority.'); return; }

      setIsSaving(true);
      try {
        await goalsApi.update(editGoalId, buildPayload());
        onSuccess?.();
        onClose?.();
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Something went wrong.');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    if (!form.scheduleFrequency) { setError('Select how often this goal will be tracked.'); return; }
    if (!form.startDate || !form.targetDate) { setError('Start date and end date are required.'); return; }
    if (!totalPeriods.value) { setError(totalPeriods.detail || 'The selected date range is not valid.'); return; }
    if (!form.isContainer) {
      const minBound = parseOptionalActivityBound(form.minimumSessionPeriod);
      const maxBound = parseOptionalActivityBound(form.maximumSessionPeriod);
      if (minBound == null || minBound <= 0) {
        setError('Minimum activity per period must be greater than zero.');
        return;
      }
      if (maxBound == null || maxBound <= 0) {
        setError('Maximum activity per period must be greater than zero.');
        return;
      }
      if (maxBound < minBound) {
        setError(`Minimum activity ${periodLabel} must be less than or equal to maximum activity ${periodLabel}.`);
        return;
      }
      if (!computedTargetValue || computedTargetValue <= 0) { setError('Overall target must be greater than zero.'); return; }
      if (!timeCommittedPerActivity || timeCommittedPerActivity <= 0) {
        setError('Time commitment per activity must be greater than zero.');
        return;
      }
      if (!computedTimeCommittedPerPeriod || computedTimeCommittedPerPeriod <= 0) {
        setError('Calculated time commitment per period must be greater than zero.');
        return;
      }
    }
    const wc = Number(form.consistencyWeight) || 0;
    const wm = Number(form.momentumWeight) || 0;
    const wp = Number(form.progressWeight) || 0;
    const anyW = form.consistencyWeight !== '' || form.momentumWeight !== '' || form.progressWeight !== '';
    if (anyW && wc + wm + wp !== 100) { setError('Health weights must total 100.'); return; }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) await goalsApi.update(editGoalId, payload);
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
            <form id="goal-drawer-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              <FormSection icon={Calendar} title="Goal Info" tone="blue">
                <div className="space-y-4">
                  {parentTitleForDisplay ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 ring-1 ring-white/[0.04]">
                      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Parent goal
                      </div>
                      <Field label="Title">
                        <Input
                          value={parentTitleForDisplay}
                          readOnly
                          disabled
                          tabIndex={-1}
                          className="h-10 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 opacity-90 focus-visible:ring-0"
                        />
                      </Field>
                    </div>
                  ) : null}

                  <Field label="Title *">
                    <Input value={form.title} onChange={(e) => update({ title: e.target.value })}
                      placeholder="e.g. Master Quantitative for CAT" required
                      className="h-10 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                  </Field>

                  {isEdit || showDescription ? (
                    <div>
                      <Field label="Description">
                        <Textarea rows={3} value={form.description} onChange={(e) => update({ description: e.target.value })}
                          placeholder="What does achieving this goal mean to you?" />
                      </Field>
                      {!isEdit ? (
                        <button
                          type="button"
                          onClick={() => setShowDescription(false)}
                          className="mt-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          Hide description
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDescription(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-slate-400 hover:border-white/15 hover:bg-white/[0.06] hover:text-slate-200 transition-colors"
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      {form.description.trim() ? 'Edit description' : 'Add description'}
                    </button>
                  )}

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                    <Field label="Start Date" hint={isEdit ? 'Locked' : undefined}>
                      <Input type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })}
                        disabled={isEdit} readOnly={isEdit}
                        className={`h-10 w-full rounded-xl border border-white/10 text-white focus-visible:border-white/25 focus-visible:ring-0 ${isEdit ? 'bg-white/[0.03] cursor-not-allowed text-slate-300 disabled:opacity-100' : 'bg-white/5'}`} />
                    </Field>
                    <Field label="End Date">
                      <Input type="date" value={form.targetDate} onChange={(e) => update({ targetDate: e.target.value })}
                        className="h-10 w-full rounded-xl bg-white/5 border border-white/10 text-white focus-visible:border-white/25 focus-visible:ring-0" />
                    </Field>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Goal Setup" tone="slate">
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-xs text-slate-400">Goal type</div>
                    <div className="flex flex-wrap gap-1.5">
                      {GOAL_TYPES.map((gt) => (
                        <motion.button key={gt.value} type="button" whileTap={{ scale: 0.95 }}
                          onClick={() => update({ goalType: gt.value })}
                          className={[
                            'inline-flex items-center gap-1.5 rounded-xl border border-white/[0.06] px-3 py-2 text-xs font-medium transition-all duration-150',
                            form.goalType === gt.value
                              ? 'bg-white text-black shadow-lg shadow-white/10'
                              : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200',
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

                  {!isEdit ? (
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 sm:p-4">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="text-sm font-medium leading-snug text-white">
                          Track this goal by its child goals
                        </div>
                        <p className="text-xs leading-relaxed text-slate-500">
                          {form.isContainer
                            ? 'Roll up progress from child goals. Turn off to track this goal directly and show advanced options for targets, schedule, and behavior.'
                            : 'Direct tracking: set commitments, schedule details, and fine-tuning in the sections below.'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end pt-0.5">
                        <SwitchToggle checked={form.isContainer} onChange={handleIsContainerChange} />
                      </div>
                    </div>
                  </div>
                  ) : null}
                </div>
              </FormSection>

              {/* Edit mode: surface the rest of the goal's data read-only instead of hiding it. */}
              {isEdit ? (
                <FormSection icon={Clock} title="Commitment & Schedule" tone="amber">
                  <div className="space-y-4">
                    <p className="text-[11px] leading-relaxed text-slate-500">
                      Set when this goal was created. Shown here for reference and can&apos;t be changed from this screen.
                    </p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadOnlyInfoField
                        label="Tracking mode"
                        value={form.isContainer ? 'Rolls up from child goals' : 'Tracked directly'}
                        placeholder="—"
                      />
                      <ReadOnlyInfoField
                        label="Frequency"
                        value={labelOf(FREQUENCIES, form.scheduleFrequency)}
                        placeholder="—"
                      />
                    </div>

                    {!form.isContainer ? (
                      <>
                        <ReadOnlyInfoField
                          label="Schedule"
                          value={form.scheduleFlexible ? 'Flexible — any time in the period' : (scheduleSummary || 'Specific schedule')}
                          placeholder="—"
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <ReadOnlyInfoField label="What you track" value={labelOf(METRICS, form.metric)} placeholder="—" />
                          <ReadOnlyInfoField label="Target rule" value={labelOf(OPERATORS, form.targetOperator)} placeholder="—" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <ReadOnlyInfoField label="Overall target" value={formatNumberValue(editGoal?.targetValue)} placeholder="—" />
                          <ReadOnlyInfoField label={`Min activity ${periodLabel}`} value={formatNumberValue(editGoal?.minimumSessionPeriod)} placeholder="—" />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <ReadOnlyInfoField label={`Max activity ${periodLabel}`} value={formatNumberValue(editGoal?.maximumSessionPeriod)} placeholder="—" />
                          <ReadOnlyInfoField label="Time per activity" value={formatCommittedTime(editGoal?.minimumTimeCommittedPerActivity)} placeholder="—" />
                        </div>
                        <ReadOnlyInfoField
                          label="Total time committed per period"
                          value={formatCommittedTime(editGoal?.minimumTimeCommittedPeriod)}
                          placeholder="—"
                        />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <ReadOnlyInfoField label="Misses allowed per period" value={formatNumberValue(editGoal?.missesAllowedPerPeriod)} placeholder="Auto" />
                          <ReadOnlyInfoField label="Multiple sessions / day" value={editGoal?.allowDoubleLogging === false ? 'Not allowed' : 'Allowed'} placeholder="—" />
                        </div>
                        <div>
                          <div className="mb-1 text-sm font-medium text-slate-300">Health weights</div>
                          <div className="grid grid-cols-3 gap-3">
                            <ReadOnlyInfoField label="Consistency" value={formatNumberValue(editGoal?.consistencyWeight)} placeholder="Auto" />
                            <ReadOnlyInfoField label="Momentum" value={formatNumberValue(editGoal?.momentumWeight)} placeholder="Auto" />
                            <ReadOnlyInfoField label="Progress" value={formatNumberValue(editGoal?.progressWeight)} placeholder="Auto" />
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </FormSection>
              ) : null}

              {isEdit ? (
                <FormSection icon={Zap} title="Progress & Health" tone="green">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadOnlyInfoField label="Current value" value={formatNumberValue(editGoal?.currentValue)} placeholder="—" />
                      <ReadOnlyInfoField
                        label="Progress"
                        value={formatNumberValue(editGoal?.progressPercentage) !== '' ? `${formatNumberValue(editGoal?.progressPercentage)}%` : ''}
                        placeholder="—"
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadOnlyInfoField label="Health score" value={formatScoreValue(editGoal?.healthScore)} placeholder="—" />
                      <ReadOnlyInfoField
                        label="Health status"
                        value={(editGoal?.healthStatus || '').replace(/_/g, ' ')}
                        placeholder="—"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <ReadOnlyInfoField label="Consistency" value={formatScoreValue(editGoal?.consistencyScore)} placeholder="—" />
                      <ReadOnlyInfoField label="Momentum" value={formatScoreValue(editGoal?.momentumScore)} placeholder="—" />
                      <ReadOnlyInfoField label="Progress score" value={formatScoreValue(editGoal?.progressScore)} placeholder="—" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadOnlyInfoField label="Current streak" value={formatNumberValue(editGoal?.currentStreak)} placeholder="—" />
                      <ReadOnlyInfoField label="Longest streak" value={formatNumberValue(editGoal?.longestStreak)} placeholder="—" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <ReadOnlyInfoField label="Created" value={formatDateDisplay(editGoal?.createdAt)} placeholder="—" />
                      <ReadOnlyInfoField label="Last updated" value={formatDateDisplay(editGoal?.lastUpdatedAt)} placeholder="—" />
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {!isEdit && !form.isContainer ? (
                <FormSection icon={Zap} title="Effort & Commitment" tone="green">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 text-xs text-slate-400">This goal will be tracked</div>
                      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {FREQUENCIES.map((f) => (
                          <motion.button key={f.value} type="button" whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              update({
                                scheduleFrequency: f.value,
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

                    <ReadOnlyInfoField
                      label="Total periods"
                      value={totalPeriods.display}
                      tooltipTitle="Total periods"
                      tooltip={totalPeriods.detail}
                    />

                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                      <Field label={`Min activity ${periodLabel}`} hint="Required" stackedHint>
                        <Input type="number" min={0} value={form.minimumSessionPeriod}
                          onChange={(e) => update({ minimumSessionPeriod: e.target.value })}
                          placeholder="e.g. 3"
                          className="h-10 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                      </Field>
                      <Field label={`Max activity ${periodLabel}`} hint="Required for target" stackedHint>
                        <Input type="number" min={0} value={form.maximumSessionPeriod}
                          onChange={(e) => update({ maximumSessionPeriod: e.target.value })}
                          placeholder="e.g. 10"
                          className="h-10 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                      </Field>
                    </div>

                    <Field label="Time commitment per activity" hint="Minutes">
                      <Input type="number" min={0} value={form.minimumTimeCommittedPerActivity}
                        onChange={(e) => update({ minimumTimeCommittedPerActivity: e.target.value })}
                        placeholder="e.g. 30"
                        className="h-10 w-full rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus-visible:border-white/25 focus-visible:ring-0" />
                    </Field>

                    <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
                      <ReadOnlyInfoField
                        label="Overall target number"
                        value={formatNumberValue(computedTargetValue)}
                        tooltipTitle="Overall target"
                        tooltip={`Maximum activity ${periodLabel} (${maximumActivities || 0}) x total periods (${formatNumberValue(totalPeriods.value) || 0}) = ${formatNumberValue(computedTargetValue) || 0}.`}
                      />
                      <ReadOnlyInfoField
                        label="Total time committed"
                        value={formatCommittedTime(computedTimeCommitted)}
                        tooltipTitle="Total time committed"
                        tooltip={`Maximum activity ${periodLabel} (${maximumActivities || 0}) x time per activity (${timeCommittedPerActivity || 0} min) = ${formatCommittedTime(computedTimeCommittedPerPeriod) || '0 min'} ${periodLabel}; then x total periods (${formatNumberValue(totalPeriods.value) || 0}) = ${formatCommittedTime(computedTimeCommitted) || '0 min'}.`}
                      />
                    </div>
                  </div>
                </FormSection>
              ) : null}

              {!isEdit && !form.isContainer ? (
                <FormSection icon={Sliders} title="Fine Tuning" tone="amber">
                  <div className="space-y-3">
                    <ExpandableSection label="Schedule details" icon={Calendar} defaultOpen={!form.scheduleFlexible}>
                      <div className="space-y-3">
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

                        {form.scheduleFlexible ? (
                          <div className="text-[11px] text-slate-600">
                            Check in anytime within the {form.scheduleFrequency.toLowerCase()} period.
                          </div>
                        ) : (
                          <div>
                            {form.scheduleSegments.length > 0 ? (
                              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                <div className="flex items-center justify-between gap-3">
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
                        )}
                      </div>
                    </ExpandableSection>

                    <ExpandableSection label="Tracking details" icon={Settings} defaultOpen={showAdvancedOptions}>
                      <div className="space-y-4">
                        {!showAdvancedOptions ? (
                          <button type="button" onClick={() => setShowAdvancedOptions(true)}
                            className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Customize metric and operator
                          </button>
                        ) : (
                          <>
                            <Field label="What are you tracking?">
                              <Select value={form.metric} onChange={(v) => update({ metric: v })} options={METRICS} />
                            </Field>
                            <Field label="Target Operator">
                              <Select value={form.targetOperator} onChange={(v) => update({ targetOperator: v })} options={OPERATORS} />
                            </Field>
                            <button type="button" onClick={() => setShowAdvancedOptions(false)}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                              Use default tracking
                            </button>
                          </>
                        )}
                      </div>
                    </ExpandableSection>

                    <ExpandableSection label="Behavior" icon={Sliders} defaultOpen={!!(form.missesAllowedPerPeriod)}>
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
                </FormSection>
              ) : null}
            </form>

            {/* Footer */}
            <div className="flex-shrink-0 border-t border-white/[0.08] px-6 py-4">
              <div
                className={[
                  'flex flex-col gap-3',
                  error ? 'sm:flex-row sm:items-center sm:justify-between sm:gap-4' : 'sm:flex-row sm:justify-end',
                ].join(' ')}
              >
                {error ? (
                  <p
                    role="alert"
                    className="min-w-0 max-w-full rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm leading-snug text-red-200 sm:max-w-[60%]"
                  >
                    {error}
                  </p>
                ) : null}
                <div className="flex shrink-0 justify-end gap-3">
                  <button type="button" onClick={() => (isSaving ? null : onClose?.())}
                    className="rounded-xl px-4 py-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-60"
                    disabled={isSaving}>Cancel</button>
                  <button type="submit" form="goal-drawer-form"
                    className="inline-flex items-center rounded-xl bg-white px-6 py-2 font-semibold text-black hover:bg-gray-100 disabled:opacity-60"
                    disabled={isSaving}>
                    {isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>) : 'Save'}
                  </button>
                </div>
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
