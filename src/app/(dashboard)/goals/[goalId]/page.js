'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  BarChart2,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Clock3,
  LineChart as LineChartIcon,
  List,
  Pencil,
  Target,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { activitiesApi } from '@/lib/api/activitiesApi';
import { goalPeriodsApi, goalsApi } from '@/lib/api/goalsApi';
import { getGoalCardTheme } from '@/lib/utils/goalUtils';
import GoalDrawer from '@/components/goals/GoalDrawer';
import DeleteGoalDialog from '@/components/goals/DeleteGoalDialog';

const ACTIVITY_PAGE_SIZE = 5000;
const DEFAULT_RANGE_DAYS = 14;
const ACTIVITY_SERIES_KEY = 'activityCount';
const ACTIVITY_COLOR = '#6366f1';
const ACTIVITY_CHART_TYPES = [
  { value: 'bar', label: 'Stacked Bar', Icon: BarChart2 },
  { value: 'line', label: 'Line', Icon: LineChartIcon },
];
const ACTIVITY_QUICK_RANGES = [
  { value: '14d', label: 'Last 14 days', days: 14 },
  { value: '30d', label: 'Last 30 days', days: 30 },
  { value: '90d', label: 'Last 90 days', days: 90 },
];
const DETAIL_TABS = [
  { value: 'activity', label: 'Activity', Icon: Activity },
  { value: 'periods', label: 'Goal Periods', Icon: CalendarRange },
];

function unwrapResponse(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getPathValue(value, path) {
  return path.split('.').reduce((current, key) => current?.[key], value);
}

function asArray(response, paths = []) {
  const value = unwrapResponse(response);
  if (Array.isArray(value)) return value;

  for (const path of paths) {
    const nested = getPathValue(value, path);
    if (Array.isArray(nested)) return nested;
  }

  return [];
}

function getGoalId(goal) {
  return goal?.id || goal?.uuid || goal?.goalId || goal?.goalUuid;
}

function getGoalTitle(goal, fallback = 'Selected goal') {
  return goal?.title || goal?.name || fallback;
}

function getActivityGoalId(activity) {
  return (
    activity?.goalId ||
    activity?.goalUuid ||
    activity?.goal?.id ||
    activity?.goal?.uuid
  );
}

function getActivityDateValue(activity) {
  return (
    activity?.startTime ||
    activity?.startedAt ||
    activity?.createdAt ||
    activity?.created_at
  );
}

function getDurationMinutes(activity) {
  const explicit = Number(
    activity?.durationMinutes ??
      activity?.durationInMinutes ??
      activity?.minutes
  );
  if (Number.isFinite(explicit)) return explicit;

  if (!activity?.startTime || !activity?.endTime) return 0;
  const start = new Date(activity.startTime);
  const end = new Date(activity.endTime);
  const diff = end - start;

  if (!Number.isFinite(diff) || diff <= 0) return 0;
  return Math.round(diff / 60000);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value) {
  if (!value) return null;
  const text = String(value);
  const date = new Date(text.includes('T') ? text : `${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getLocalDateKey(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatDateKey(date);
}

function getDefaultActivityRange(days = DEFAULT_RANGE_DAYS) {
  const end = new Date();
  end.setHours(0, 0, 0, 0);

  const start = new Date(end);
  start.setDate(end.getDate() - (days - 1));

  return {
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
  };
}

function getActivityRangeFilter(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  if (!start || !end) return {};

  const endOfDay = new Date(end);
  endOfDay.setHours(23, 59, 59, 999);

  return {
    startTime: start.toISOString(),
    endTime: endOfDay.toISOString(),
  };
}

function getRangeDays(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  if (!start || !end || end < start) return 0;

  return Math.round((end - start) / 86400000) + 1;
}

function getDateWindow(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  if (!start || !end || end < start) return [];

  return Array.from({ length: getRangeDays(range) }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      date: formatDateKey(date),
      day: date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      }),
      weekday: date.toLocaleDateString('en-IN', { weekday: 'short' }),
      [ACTIVITY_SERIES_KEY]: 0,
    };
  });
}

function formatActivityRangeLabel(range) {
  const start = parseInputDate(range.startDate);
  const end = parseInputDate(range.endDate);
  const days = getRangeDays(range);

  if (!start || !end || days === 0) return 'selected range';

  const formatOptions = {
    day: '2-digit',
    month: 'short',
  };

  return `${start.toLocaleDateString('en-IN', formatOptions)} - ${end.toLocaleDateString(
    'en-IN',
    formatOptions
  )} (${days} days)`;
}

function formatMinutes(minutes) {
  const safeMinutes = Math.max(0, Math.round(minutes || 0));
  if (safeMinutes < 60) return `${safeMinutes}m`;

  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function formatLastLogged(value) {
  if (!value) return 'No activity yet';

  const logged = new Date(value);
  if (Number.isNaN(logged.getTime())) return 'No activity yet';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const loggedDay = new Date(logged);
  loggedDay.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - loggedDay) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;

  return logged.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function formatDate(value, options = {}) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: options.withYear === false ? undefined : 'numeric',
  });
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPeriodId(period) {
  return period?.uuid || period?.id || period?.periodUuid;
}

function getPeriodStart(period) {
  return period?.periodStart || period?.startDate || period?.start;
}

function getPeriodEnd(period) {
  return period?.periodEnd || period?.endDate || period?.end;
}

function getProgressValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatNumberValue(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '-';
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
}

function getPeriodHealthClasses(status) {
  const normalized = String(status || '').toUpperCase();

  if (['EXCELLENT', 'GOOD', 'HEALTHY', 'ON_TRACK'].includes(normalized)) {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';
  }

  if (['WARNING', 'AT_RISK', 'BEHIND'].includes(normalized)) {
    return 'border-amber-400/25 bg-amber-500/10 text-amber-200';
  }

  if (['CRITICAL', 'FAILED', 'MISSED'].includes(normalized)) {
    return 'border-red-400/25 bg-red-500/10 text-red-200';
  }

  return 'border-slate-500/25 bg-slate-500/10 text-slate-300';
}

function formatScore(value) {
  const number = toOptionalNumber(value);
  return number === null ? '-' : `${Math.round(number)}%`;
}

function formatUnitValue(value, unitLabel = 'units') {
  const label = unitLabel || 'units';
  const number = toOptionalNumber(value) ?? 0;
  return `${formatNumberValue(number)} ${label}`;
}

function getBreakdownScore(period, breakdown, key) {
  return toOptionalNumber(breakdown?.[key] ?? period?.[key]);
}

function getBreakdownStatus(period, breakdown) {
  return breakdown?.healthStatus || period?.healthStatus || 'UNTRACKED';
}

function getMomentumTrendLabel(trend) {
  const labels = {
    FIRST_PERIOD: 'First scored period',
    NO_BASELINE: 'No baseline yet',
    IMPROVING: 'Improving',
    DECLINING: 'Declining',
    RECOVERING: 'Recovering',
    FLAT_ZERO: 'Flat zero',
    UNTRACKED: 'Untracked',
  };

  return labels[String(trend || '').toUpperCase()] || 'No trend yet';
}

function getBreakdownWeight(breakdown, key) {
  return toOptionalNumber(
    breakdown?.scoreWeights?.[key] ??
      breakdown?.weights?.[key] ??
      breakdown?.[`${key}Weight`]
  );
}

function getMonthLabel(date) {
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
}

function getCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstGridDay = new Date(firstDay);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  firstGridDay.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDay);
    date.setDate(firstGridDay.getDate() + index);

    return {
      date,
      dateKey: formatDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
      dayNumber: date.getDate(),
    };
  });
}

function isPeriodOnDate(period, date) {
  const start = parseInputDate(getPeriodStart(period));
  const end = parseInputDate(getPeriodEnd(period));
  if (!start || !end) return false;

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  return day >= start && day <= end;
}

function ActivityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const value = payload[0]?.value || 0;
  if (value <= 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#080816] px-3 py-2 shadow-xl">
      <div className="text-xs font-semibold text-white">{label}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className="h-2 w-2 rounded-full bg-indigo-400" />
        <span className="text-slate-300">Activity logs</span>
        <span className="ml-auto font-medium text-white">{value}</span>
      </div>
    </div>
  );
}

function EmptyState({ title, body }) {
  return (
    <div className="flex h-72 flex-col items-center justify-center text-center">
      <BarChart2 className="h-10 w-10 text-slate-700" />
      <div className="mt-3 text-sm font-medium text-slate-300">{title}</div>
      {body ? <div className="mt-1 text-xs text-slate-500">{body}</div> : null}
    </div>
  );
}

function ViewSwitch({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
      {options.map(({ value: optionValue, label, Icon }) => {
        const isActive = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition ${
              isActive
                ? 'bg-white text-slate-950 shadow-lg shadow-indigo-950/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ActivityList({ activities }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        title="No activity logs in this range"
        body="Change the date range or log activity against this goal."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="grid grid-cols-[120px_minmax(0,1fr)_120px_100px] gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 max-lg:hidden">
        <div>When</div>
        <div>Activity</div>
        <div>Duration</div>
        <div>Mood</div>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {activities.map((activity, index) => {
          const dateValue = getActivityDateValue(activity);
          const duration = getDurationMinutes(activity);

          return (
            <div
              key={activity?.id || activity?.uuid || `${dateValue}-${index}`}
              className="grid grid-cols-1 gap-2 px-4 py-3 transition hover:bg-white/[0.025] lg:grid-cols-[120px_minmax(0,1fr)_120px_100px] lg:items-center"
            >
              <div className="text-sm text-slate-300">
                {formatDateTime(dateValue)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-white">
                  {activity?.name || activity?.title || 'Untitled activity'}
                </div>
                <div className="mt-0.5 truncate text-xs text-slate-500">
                  {activity?.domainName && activity.domainName !== 'General'
                    ? `${activity.domainName}${activity?.subdomainName ? ` / ${activity.subdomainName}` : ''}`
                    : 'Linked to this goal'}
                </div>
              </div>
              <div className="text-sm text-slate-300">
                {duration > 0 ? formatMinutes(duration) : '-'}
              </div>
              <div className="text-sm text-slate-400">
                {activity?.mood || activity?.rating || '-'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodSummaryTooltip({
  period,
  breakdown,
  isLoading,
  error,
  className = '',
}) {
  const unitLabel = breakdown?.unitLabel || 'units';
  const healthScore = getBreakdownScore(period, breakdown, 'healthScore');
  const progressSnapshot = getProgressValue(period?.progressPercentage);
  const status = getBreakdownStatus(period, breakdown);
  const hasBreakdown = Boolean(breakdown);
  const scoreRows = [
    {
      key: 'consistency',
      label: 'Consistency',
      value: getBreakdownScore(period, breakdown, 'consistencyScore'),
      weight: getBreakdownWeight(breakdown, 'consistency'),
    },
    {
      key: 'progress',
      label: 'Progress',
      value: getBreakdownScore(period, breakdown, 'progressScore'),
      weight: getBreakdownWeight(breakdown, 'progress'),
    },
    {
      key: 'momentum',
      label: 'Momentum',
      value: getBreakdownScore(period, breakdown, 'momentumScore'),
      weight: getBreakdownWeight(breakdown, 'momentum'),
    },
  ];
  const dailyDetails = Array.isArray(breakdown?.dailyDetails)
    ? breakdown.dailyDetails.slice(0, 4)
    : [];

  return (
    <div className={`pointer-events-none absolute left-2 top-8 z-30 hidden w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-[#080816] p-3 text-left shadow-2xl shadow-black/50 group-hover:block group-focus-within:block ${className}`}>
      <div className="text-xs font-semibold text-white">
        {formatDate(getPeriodStart(period), { withYear: false })} - {formatDate(getPeriodEnd(period), { withYear: false })}
      </div>
      <div className="mt-3 rounded-lg border border-indigo-400/20 bg-indigo-500/10 p-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-indigo-200">
            Overall health
          </span>
          <span className="text-lg font-semibold text-white">
            {formatScore(healthScore)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
          <span className="text-slate-400">Status</span>
          <span className={`rounded-full border px-2 py-0.5 ${getPeriodHealthClasses(status)}`}>
            {status}
          </span>
        </div>
      </div>

      <div className="mt-2 rounded-lg bg-white/[0.04] p-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          How health is calculated
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Health is a weighted blend of consistency, progress, and momentum.
          Consistency checks the expected work pattern, progress checks target
          units, and momentum compares this period with recent periods.
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
        {scoreRows.map((row) => (
          <div key={row.key} className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">{row.label}</div>
            <div className="font-semibold text-white">{formatScore(row.value)}</div>
            <div className="text-[10px] text-slate-600">
              Weight {row.weight === null ? '-' : formatNumberValue(row.weight)}
            </div>
          </div>
        ))}
      </div>

      {hasBreakdown ? (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">Actual to date</div>
            <div className="font-semibold text-white">
              {formatUnitValue(breakdown.actualUnitsToDate, unitLabel)}
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">Target expected</div>
            <div className="font-semibold text-white">
              {formatUnitValue(breakdown.expectedTargetUnitsToDate, unitLabel)}
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">Minimum expected</div>
            <div className="font-semibold text-white">
              {formatUnitValue(breakdown.expectedMinimumUnitsToDate, unitLabel)}
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">Progress snapshot</div>
            <div className="font-semibold text-white">{Math.round(progressSnapshot)}%</div>
          </div>
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">Current value</div>
            <div className="font-semibold text-white">
              {formatNumberValue(period?.currentValue ?? 0)}
            </div>
          </div>
          <div className="rounded-lg bg-white/[0.04] px-2 py-1">
            <div className="text-slate-500">Progress snapshot</div>
            <div className="font-semibold text-white">{Math.round(progressSnapshot)}%</div>
          </div>
        </div>
      )}

      {breakdown?.momentumBreakdown ? (
        <div className="mt-2 rounded-lg bg-black/25 p-2 text-[11px]">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-slate-300">
              {getMomentumTrendLabel(breakdown.momentumBreakdown.trend)}
            </span>
            <span className="text-slate-500">
              Delta {formatScore(breakdown.momentumBreakdown.deltaFromBaseline)}
            </span>
          </div>
          {breakdown.momentumBreakdown.explanation ? (
            <div className="mt-1 leading-relaxed text-slate-500">
              {breakdown.momentumBreakdown.explanation}
            </div>
          ) : null}
        </div>
      ) : null}

      {dailyDetails.length > 0 ? (
        <div className="mt-2 rounded-lg bg-black/25 p-2 text-[11px]">
          <div className="mb-1 font-medium text-slate-300">
            Daily expected vs actual
          </div>
          <div className="space-y-1">
            {dailyDetails.map((day) => (
              <div
                key={day.date}
                className="grid grid-cols-[64px_1fr_1fr] gap-2 text-slate-500"
              >
                <span>{formatDate(day.date, { withYear: false })}</span>
                <span>Actual {formatNumberValue(day.actualUnits)}</span>
                <span>
                  Min {formatNumberValue(day.expectedMinimumUnits)} / Target{' '}
                  {formatNumberValue(day.expectedTargetUnits)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-1 leading-relaxed text-slate-600">
            Daily fulfillment is capped per day, so bunching work on one day
            cannot fully repair a missed scheduled day.
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-slate-400">
          Loading schedule-aware breakdown...
        </div>
      ) : null}
      {error ? (
        <div className="mt-2 rounded-lg border border-red-400/20 bg-red-500/10 px-2 py-1 text-[11px] text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function GoalPeriodsCalendar({
  periods,
  monthDate,
  onPreviousMonth,
  onNextMonth,
  periodBreakdowns = {},
  periodBreakdownLoading = {},
  periodBreakdownErrors = {},
  onPeriodHover,
}) {
  const calendarDays = getCalendarDays(monthDate);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/10 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">
            {getMonthLabel(monthDate)}
          </div>
          <div className="text-xs text-slate-500">
            Period windows are shown on each calendar day they cover
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPreviousMonth}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-l border-t border-white/[0.06]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="border-b border-r border-white/[0.06] bg-white/[0.03] px-2 py-2 text-xs font-medium text-slate-500"
          >
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const dayPeriods = periods.filter((period) =>
            isPeriodOnDate(period, day.date)
          );

          return (
            <div
              key={day.dateKey}
              className={`min-h-28 border-b border-r border-white/[0.06] p-2 ${
                day.inMonth ? 'bg-white/[0.015]' : 'bg-black/20'
              }`}
            >
              <div
                className={`mb-2 text-xs ${
                  day.inMonth ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {day.dayNumber}
              </div>
              <div className="space-y-1">
                {dayPeriods.slice(0, 2).map((period) => {
                  const periodId = getPeriodId(period);
                  const breakdown = periodBreakdowns[periodId];
                  const healthScore = getBreakdownScore(period, breakdown, 'healthScore');
                  const displayScore =
                    healthScore === null
                      ? getProgressValue(period?.progressPercentage)
                      : getProgressValue(healthScore);

                  return (
                    <div
                      key={periodId || `${day.dateKey}-${getPeriodStart(period)}`}
                      tabIndex={0}
                      onFocus={() => onPeriodHover?.(period)}
                      onMouseEnter={() => onPeriodHover?.(period)}
                      className="group relative rounded-md border border-indigo-300/20 bg-indigo-500/15 px-2 py-1 text-[11px] text-indigo-100"
                    >
                      <div className="truncate">
                        {Math.round(displayScore)}% health
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-white/10">
                        <div
                          className="h-1 rounded-full bg-indigo-300"
                          style={{ width: `${displayScore}%` }}
                        />
                      </div>
                      <PeriodSummaryTooltip
                        period={period}
                        breakdown={breakdown}
                        isLoading={Boolean(periodBreakdownLoading[periodId])}
                        error={periodBreakdownErrors[periodId]}
                      />
                    </div>
                  );
                })}
                {dayPeriods.length > 2 ? (
                  <div className="text-[11px] text-slate-500">
                    +{dayPeriods.length - 2} more
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodHealthBreakdownInline({ period, breakdown, isLoading, error }) {
  const unitLabel = breakdown?.unitLabel || 'units';
  const healthScore = getBreakdownScore(period, breakdown, 'healthScore');
  const hasBreakdown = Boolean(breakdown);
  const scoreRows = [
    {
      label: 'Consistency',
      value: getBreakdownScore(period, breakdown, 'consistencyScore'),
      help: 'Expected minimum work pattern met to date',
    },
    {
      label: 'Progress',
      value: getBreakdownScore(period, breakdown, 'progressScore'),
      help: 'Expected target work pattern met to date',
    },
    {
      label: 'Momentum',
      value: getBreakdownScore(period, breakdown, 'momentumScore'),
      help: 'Current pace compared with recent periods',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-200">
          Overall health
        </div>
        <div className="mt-1 text-2xl font-semibold text-white">
          {formatScore(healthScore)}
        </div>
        <div className="mt-1 text-slate-400">
          Weighted from consistency, progress, and momentum. Health is
          schedule-aware, so it is not a simple percent-of-target.
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {scoreRows.map((row) => (
            <div key={row.label} className="rounded-lg bg-black/20 p-2">
              <div className="text-[11px] text-slate-500">{row.label}</div>
              <div className="text-sm font-semibold text-white">
                {formatScore(row.value)}
              </div>
              <div className="mt-1 text-[10px] leading-snug text-slate-600">
                {row.help}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Expectation visibility
        </div>
        {hasBreakdown ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-black/20 p-2">
              <div className="text-[11px] text-slate-500">Actual to date</div>
              <div className="text-sm font-semibold text-white">
                {formatUnitValue(breakdown.actualUnitsToDate, unitLabel)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 p-2">
              <div className="text-[11px] text-slate-500">Target expected</div>
              <div className="text-sm font-semibold text-white">
                {formatUnitValue(breakdown.expectedTargetUnitsToDate, unitLabel)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 p-2">
              <div className="text-[11px] text-slate-500">Minimum expected</div>
              <div className="text-sm font-semibold text-white">
                {formatUnitValue(breakdown.expectedMinimumUnitsToDate, unitLabel)}
              </div>
            </div>
            <div className="rounded-lg bg-black/20 p-2">
              <div className="text-[11px] text-slate-500">Period actual</div>
              <div className="text-sm font-semibold text-white">
                {formatUnitValue(breakdown.actualUnits, unitLabel)}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 rounded-lg bg-black/20 p-2 text-slate-400">
            Open this row or hover the period to load schedule-aware expectation
            details from the backend.
          </div>
        )}
        {breakdown?.momentumBreakdown ? (
          <div className="mt-2 rounded-lg bg-black/20 p-2 text-slate-400">
            {getMomentumTrendLabel(breakdown.momentumBreakdown.trend)}
            {breakdown.momentumBreakdown.explanation
              ? `: ${breakdown.momentumBreakdown.explanation}`
              : ''}
          </div>
        ) : null}
        {isLoading ? (
          <div className="mt-2 text-slate-500">Loading health breakdown...</div>
        ) : null}
        {error ? (
          <div className="mt-2 text-red-300">{error}</div>
        ) : null}
      </div>
    </div>
  );
}

function GoalPeriodsList({
  periods,
  goal,
  periodBreakdowns = {},
  periodBreakdownLoading = {},
  periodBreakdownErrors = {},
  onPeriodHover,
}) {
  if (periods.length === 0) {
    return (
      <EmptyState
        title="No goal periods yet"
        body="The backend will create periods automatically for trackable goals."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08]">
      <div className="grid grid-cols-[minmax(0,1.3fr)_110px_110px_110px_130px] gap-3 border-b border-white/[0.08] bg-white/[0.03] px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-500 max-lg:hidden">
        <div>Period</div>
        <div>Progress</div>
        <div>Health</div>
        <div>Current</div>
        <div>Streak</div>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {periods.map((period) => {
          const periodId = getPeriodId(period);
          const breakdown = periodBreakdowns[periodId];
          const progress = getProgressValue(period?.progressPercentage);
          const targetValue = Number(goal?.targetValue || 0);

          return (
            <div
              key={periodId || `${getPeriodStart(period)}-${getPeriodEnd(period)}`}
              onMouseEnter={() => onPeriodHover?.(period)}
              onFocus={() => onPeriodHover?.(period)}
              className="group relative grid grid-cols-1 gap-3 px-4 py-4 transition hover:bg-white/[0.025] lg:grid-cols-[minmax(0,1.3fr)_110px_110px_110px_130px] lg:items-center"
            >
              <div>
                <div className="text-sm font-medium text-white">
                  {formatDate(getPeriodStart(period))} - {formatDate(getPeriodEnd(period))}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Updated {formatLastLogged(period?.lastUpdatedAt || period?.createdAt)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-500 lg:hidden">Progress</div>
                <div className="text-sm font-semibold text-white">{Math.round(progress)}%</div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-1.5 rounded-full bg-indigo-400"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-1 hidden text-[10px] text-slate-500 lg:block">
                  Hover for health details
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-500 lg:hidden">Health</div>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${getPeriodHealthClasses(
                    period?.healthStatus
                  )}`}
                >
                  {period?.healthStatus || 'Untracked'}
                </span>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-500 lg:hidden">Current</div>
                <div className="text-sm font-semibold text-white">
                  {period?.currentValue ?? 0}
                  {targetValue > 0 ? (
                    <span className="text-slate-500"> / {targetValue}</span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="mb-1 text-xs text-slate-500 lg:hidden">Streak</div>
                <div className="text-sm text-slate-300">
                  {period?.currentStreak ?? 0} current
                </div>
                <div className="text-xs text-slate-500">
                  {period?.longestStreak ?? 0} longest
                </div>
              </div>
              <div className="hidden rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs lg:col-span-5 group-hover:block">
                <PeriodHealthBreakdownInline
                  period={period}
                  breakdown={breakdown}
                  isLoading={Boolean(periodBreakdownLoading[periodId])}
                  error={periodBreakdownErrors[periodId]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GoalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const goalId = Array.isArray(params?.goalId)
    ? params.goalId[0]
    : params?.goalId;
  const decodedGoalId = goalId ? decodeURIComponent(goalId) : '';
  const [goal, setGoal] = useState(null);
  const [activities, setActivities] = useState([]);
  const [activityRange, setActivityRange] = useState(() =>
    getDefaultActivityRange()
  );
  const [activityChartType, setActivityChartType] = useState('bar');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [activeTab, setActiveTab] = useState('activity');
  const [activityView, setActivityView] = useState('chart');
  const [periodView, setPeriodView] = useState('calendar');
  const [periods, setPeriods] = useState([]);
  const [isPeriodsLoading, setIsPeriodsLoading] = useState(true);
  const [periodError, setPeriodError] = useState(null);
  const [periodBreakdowns, setPeriodBreakdowns] = useState({});
  const [periodBreakdownLoading, setPeriodBreakdownLoading] = useState({});
  const [periodBreakdownErrors, setPeriodBreakdownErrors] = useState({});
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const fetchGoal = useCallback(async () => {
    if (!decodedGoalId) return;

    try {
      const response = await goalsApi.getById(decodedGoalId);
      setGoal(unwrapResponse(response) || null);
    } catch {
      setGoal(null);
    }
  }, [decodedGoalId]);

  useEffect(() => {
    fetchGoal();
  }, [fetchGoal]);

  useEffect(() => {
    setPeriodBreakdowns({});
    setPeriodBreakdownLoading({});
    setPeriodBreakdownErrors({});
  }, [decodedGoalId]);

  useEffect(() => {
    let isMounted = true;

    const fetchActivities = async () => {
      if (!decodedGoalId) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await activitiesApi.search(
          getActivityRangeFilter(activityRange),
          {
            page: 0,
            size: ACTIVITY_PAGE_SIZE,
            sortBy: 'createdAt',
            sortDirection: 'DESC',
          }
        );

        if (!isMounted) return;

        const rows = asArray(response, [
          'activities',
          'content',
          'items',
          'data.activities',
        ]).filter((activity) => {
          const activityGoalId = getActivityGoalId(activity);
          return activityGoalId && String(activityGoalId) === String(decodedGoalId);
        });

        setActivities(rows);
      } catch (activityError) {
        if (!isMounted) return;
        setActivities([]);
        setError(activityError?.message || 'Unable to load activity data');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchActivities();

    return () => {
      isMounted = false;
    };
  }, [activityRange, decodedGoalId]);

  const fetchPeriods = useCallback(async () => {
    if (!decodedGoalId) return;

    setIsPeriodsLoading(true);
    setPeriodError(null);

    try {
      const response = await goalPeriodsApi.list(decodedGoalId);
      const rows = asArray(response, [
        'periods',
        'content',
        'items',
        'data.periods',
      ]).sort((a, b) => new Date(getPeriodStart(a)) - new Date(getPeriodStart(b)));

      setPeriods(rows);

      const activePeriod =
        rows.find((period) => isPeriodOnDate(period, new Date())) || rows[0];
      const activeStart = parseInputDate(getPeriodStart(activePeriod));
      if (activeStart) {
        setCalendarMonth(
          new Date(activeStart.getFullYear(), activeStart.getMonth(), 1)
        );
      }
    } catch (periodLoadError) {
      setPeriods([]);
      setPeriodError(periodLoadError?.message || 'Unable to load goal periods');
    } finally {
      setIsPeriodsLoading(false);
    }
  }, [decodedGoalId]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const fetchPeriodBreakdown = useCallback(
    async (period) => {
      const periodId = getPeriodId(period);
      if (!decodedGoalId || !periodId) return;
      if (periodBreakdowns[periodId] || periodBreakdownLoading[periodId]) {
        return;
      }

      setPeriodBreakdownLoading((current) => ({
        ...current,
        [periodId]: true,
      }));
      setPeriodBreakdownErrors((current) => ({
        ...current,
        [periodId]: '',
      }));

      try {
        const response = await goalPeriodsApi.getHealthBreakdown(
          decodedGoalId,
          periodId
        );
        setPeriodBreakdowns((current) => ({
          ...current,
          [periodId]: unwrapResponse(response) || response || null,
        }));
      } catch (breakdownError) {
        setPeriodBreakdownErrors((current) => ({
          ...current,
          [periodId]:
            breakdownError?.message || 'Unable to load health breakdown',
        }));
      } finally {
        setPeriodBreakdownLoading((current) => ({
          ...current,
          [periodId]: false,
        }));
      }
    },
    [decodedGoalId, periodBreakdowns, periodBreakdownLoading]
  );

  const activityData = useMemo(() => {
    const rows = getDateWindow(activityRange);
    const rowsByDate = new Map(rows.map((row) => [row.date, row]));
    let total = 0;
    let minutes = 0;
    let lastLoggedAt = null;

    activities.forEach((activity) => {
      if (activity.entryType === 'SKIP') return; // skips are shown in the list but never charted/counted
      const dateKey = getLocalDateKey(getActivityDateValue(activity));
      const row = rowsByDate.get(dateKey);
      if (!row) return;

      const dateValue = getActivityDateValue(activity);
      row[ACTIVITY_SERIES_KEY] += 1;
      total += 1;
      minutes += getDurationMinutes(activity);

      if (
        dateValue &&
        (!lastLoggedAt || new Date(dateValue) > new Date(lastLoggedAt))
      ) {
        lastLoggedAt = dateValue;
      }
    });

    return {
      rows,
      total,
      minutes,
      lastLoggedAt,
    };
  }, [activities, activityRange]);

  const periodData = useMemo(() => {
    const activePeriod = periods.find((period) =>
      isPeriodOnDate(period, new Date())
    );
    const averageProgress =
      periods.length === 0
        ? 0
        : periods.reduce(
            (sum, period) => sum + getProgressValue(period?.progressPercentage),
            0
          ) / periods.length;

    return {
      activePeriod,
      averageProgress,
      total: periods.length,
    };
  }, [periods]);

  const goalTitle = getGoalTitle(
    goal,
    activities[0]?.goalTitle || activities[0]?.goalName || 'Selected goal'
  );
  const actionGoal = goal
    ? { ...goal, id: getGoalId(goal) || decodedGoalId }
    : { id: decodedGoalId, title: goalTitle };
  const activityRangeLabel = formatActivityRangeLabel(activityRange);
  const theme = getGoalCardTheme(decodedGoalId);

  const setQuickActivityRange = (days) => {
    setActivityRange(getDefaultActivityRange(days));
  };

  const setActivityDate = (field, value) => {
    setActivityRange((current) => {
      const next = { ...current, [field]: value };

      if (next.startDate && next.endDate && next.startDate > next.endDate) {
        if (field === 'startDate') next.endDate = next.startDate;
        else next.startDate = next.endDate;
      }

      return next;
    });
  };

  const goToPreviousMonth = () => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        type="button"
        onClick={() => router.push('/goals')}
        className="mb-5 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to goals
      </button>

      <div
        className={`relative overflow-hidden rounded-2xl border p-5 shadow-[0_24px_70px_-38px_rgba(0,0,0,0.7)] ${theme.border}`}
      >
        <div
          className={`pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-gradient-to-br ${theme.wash} opacity-80 blur-3xl`}
        />
        <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${theme.ribbon}`} />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${theme.wash} ring-1 ring-white/10`}
              >
                <Target className="h-5 w-5 text-white" />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold text-white">
                  {goalTitle}
                </h1>
                <p className="mt-1 text-sm text-slate-400">
                  Activities by Goal for {activityRangeLabel}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteGoal(actionGoal)}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:border-red-300/30 hover:bg-red-500/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[360px]">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-xs text-slate-500">Logs</div>
              <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                {isLoading ? '...' : activityData.total}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-xs text-slate-500">Time</div>
              <div className="mt-1 text-xl font-semibold text-white tabular-nums">
                {isLoading ? '...' : formatMinutes(activityData.minutes)}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-xs text-slate-500">Last</div>
              <div className="mt-1 truncate text-sm font-semibold text-white">
                {isLoading ? '...' : formatLastLogged(activityData.lastLoggedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2">
        {DETAIL_TABS.map(({ value, label, Icon }) => {
          const isActive = activeTab === value;

          return (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-slate-950 shadow-lg shadow-black/20'
                  : 'text-slate-400 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === 'activity' ? (
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                Activities by Goal
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                Count and list of linked activity logs
              </div>
            </div>
            <ViewSwitch
              options={[
                { value: 'chart', label: 'Chart', Icon: BarChart2 },
                { value: 'list', label: 'List', Icon: List },
              ]}
              value={activityView}
              onChange={setActivityView}
            />
          </div>

          <div className="mb-5 rounded-xl border border-indigo-400/15 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_34%),linear-gradient(135deg,rgba(14,165,233,0.08),rgba(236,72,153,0.05))] p-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Visualisation
                </div>
                <div className="mt-2">
                  <ViewSwitch
                    options={ACTIVITY_CHART_TYPES}
                    value={activityChartType}
                    onChange={setActivityChartType}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Time Range
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ACTIVITY_QUICK_RANGES.map((range) => {
                    const preset = getDefaultActivityRange(range.days);
                    const isActive =
                      activityRange.startDate === preset.startDate &&
                      activityRange.endDate === preset.endDate;

                    return (
                      <button
                        key={range.value}
                        type="button"
                        onClick={() => setQuickActivityRange(range.days)}
                        className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                          isActive
                            ? 'border-cyan-300/40 bg-cyan-300/15 text-cyan-100'
                            : 'border-white/10 bg-black/15 text-slate-400 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-slate-500">
                    Start
                    <input
                      type="date"
                      value={activityRange.startDate}
                      onChange={(event) =>
                        setActivityDate('startDate', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>
                  <label className="text-xs text-slate-500">
                    End
                    <input
                      type="date"
                      value={activityRange.endDate}
                      onChange={(event) =>
                        setActivityDate('endDate', event.target.value)
                      }
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/50"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <EmptyState
              title="Loading activity data"
              body="Fetching linked logs for this goal."
            />
          ) : activityData.total === 0 ? (
            <EmptyState
              title="No activity in this range"
              body="Change the date range or log activity against this goal."
            />
          ) : activityView === 'list' ? (
            <ActivityList activities={activities} />
          ) : (
            <div className="min-h-[320px]">
              <ResponsiveContainer width="100%" height={320}>
                {activityChartType === 'bar' ? (
                  <BarChart
                    data={activityData.rows}
                    margin={{ top: 8, right: 8, bottom: 8, left: -20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.max(1, dataMax)]}
                    />
                    <Tooltip
                      content={<ActivityTooltip />}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      formatter={() => (
                        <span className="text-xs text-slate-400">
                          {goalTitle}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey={ACTIVITY_SERIES_KEY}
                      stackId="activities"
                      name={goalTitle}
                      fill={ACTIVITY_COLOR}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                ) : (
                  <LineChart
                    data={activityData.rows}
                    margin={{ top: 8, right: 14, bottom: 8, left: -20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.max(1, dataMax)]}
                    />
                    <Tooltip
                      content={<ActivityTooltip />}
                      cursor={{ stroke: 'rgba(255,255,255,0.08)' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
                      formatter={() => (
                        <span className="text-xs text-slate-400">
                          {goalTitle}
                        </span>
                      )}
                    />
                    <Line
                      type="monotone"
                      dataKey={ACTIVITY_SERIES_KEY}
                      name={goalTitle}
                      stroke={ACTIVITY_COLOR}
                      strokeWidth={2.5}
                      dot={{ r: 2.5 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-base font-semibold text-white">
                Goal Periods
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                Period snapshots generated from this goal&apos;s schedule
              </div>
            </div>
            <ViewSwitch
              options={[
                { value: 'calendar', label: 'Calendar', Icon: CalendarRange },
                { value: 'list', label: 'List', Icon: List },
              ]}
              value={periodView}
              onChange={setPeriodView}
            />
          </div>

          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarRange className="h-3.5 w-3.5" />
                Total periods
              </div>
              <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
                {isPeriodsLoading ? '...' : periodData.total}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Avg progress
              </div>
              <div className="mt-2 text-2xl font-semibold text-white tabular-nums">
                {isPeriodsLoading ? '...' : `${Math.round(periodData.averageProgress)}%`}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock3 className="h-3.5 w-3.5" />
                Active period
              </div>
              <div className="mt-2 truncate text-sm font-semibold text-white">
                {isPeriodsLoading
                  ? '...'
                  : periodData.activePeriod
                    ? `${formatDate(getPeriodStart(periodData.activePeriod), {
                        withYear: false,
                      })} - ${formatDate(getPeriodEnd(periodData.activePeriod), {
                        withYear: false,
                      })}`
                    : 'No active period'}
              </div>
            </div>
          </div>

          {periodError ? (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {periodError}
            </div>
          ) : null}

          {isPeriodsLoading ? (
            <EmptyState
              title="Loading goal periods"
              body="Fetching period snapshots for this goal."
            />
          ) : periodView === 'calendar' ? (
            <GoalPeriodsCalendar
              periods={periods}
              monthDate={calendarMonth}
              onPreviousMonth={goToPreviousMonth}
              onNextMonth={goToNextMonth}
              periodBreakdowns={periodBreakdowns}
              periodBreakdownLoading={periodBreakdownLoading}
              periodBreakdownErrors={periodBreakdownErrors}
              onPeriodHover={fetchPeriodBreakdown}
            />
          ) : (
            <GoalPeriodsList
              periods={periods}
              goal={goal}
              periodBreakdowns={periodBreakdowns}
              periodBreakdownLoading={periodBreakdownLoading}
              periodBreakdownErrors={periodBreakdownErrors}
              onPeriodHover={fetchPeriodBreakdown}
            />
          )}
        </section>
      )}

      <GoalDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={() => {
          fetchGoal();
          setIsDrawerOpen(false);
        }}
        editGoal={actionGoal}
      />

      <DeleteGoalDialog
        goal={deleteGoal}
        onClose={() => setDeleteGoal(null)}
        onSuccess={() => {
          setDeleteGoal(null);
          router.push('/goals');
        }}
      />
    </div>
  );
}
