'use client';

import { Target, Ban } from 'lucide-react';
import { getRelativeTime } from '@/lib/utils/dateUtils';
import { getSkipReasonLabel } from '@/lib/constants/skipReasons';

const MOOD_EMOJIS = ['', '😫', '😕', '😐', '🙂', '😄'];

function formatTimeFromISO(isoString) {
  if (!isoString) return '–';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '–';
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diffMs = end - start;
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export default function ActivityCard({ activity }) {
  const isSkip = activity?.entryType === 'SKIP';
  const reason = isSkip
    ? [getSkipReasonLabel(activity.notDoneReasonCategory), activity.notDoneReasonSubcategory]
        .filter(Boolean)
        .join(' • ')
    : '';

  return (
    <div className={`flex items-start gap-4 border-b border-white/[0.05] py-4 hover:bg-white/[0.02] px-3 rounded-xl transition-all ${isSkip ? 'opacity-80' : ''}`}>
      {/* Left Column - Time */}
      <div className="w-16 flex-shrink-0 text-center">
        {isSkip ? (
          <div className="flex flex-col items-center text-rose-300/80">
            <Ban className="w-4 h-4" />
            <div className="text-[10px] mt-0.5 uppercase tracking-wide">Skipped</div>
          </div>
        ) : (
          <>
            <div className="text-sm font-medium text-white">
              {formatTimeFromISO(activity.startTime)}
            </div>
            <div className="text-xs text-slate-500">
              {calculateDuration(activity.startTime, activity.endTime)}
            </div>
          </>
        )}
      </div>

      {/* Middle - Activity Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className={`font-medium text-sm ${isSkip ? 'text-slate-300' : 'text-white'}`}>
            {activity.name || (isSkip ? 'No activity' : 'Untitled Activity')}
          </div>
          {isSkip && (
            <span className="rounded-md border border-rose-400/25 bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200">
              Not done
            </span>
          )}
        </div>

        {isSkip && reason && (
          <div className="text-xs text-rose-200/70 mt-1">{reason}</div>
        )}

        {isSkip && activity.description && (
          <div className="text-xs text-slate-500 mt-0.5">{activity.description}</div>
        )}

        {activity.goalId && (
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Target className="w-3 h-3" />
            Linked to goal
          </div>
        )}

        {!isSkip && activity.domainName && activity.domainName !== 'General' && (
          <div className="text-xs text-slate-600 mt-0.5">
            {activity.domainName}
            {activity.subdomainName && ` · ${activity.subdomainName}`}
          </div>
        )}
      </div>

      {/* Right Column - Mood & Time */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {!isSkip && activity.mood && MOOD_EMOJIS[activity.mood] && (
          <div className="text-lg">{MOOD_EMOJIS[activity.mood]}</div>
        )}
        <div className="text-xs text-slate-600">
          {getRelativeTime(activity.createdAt)}
        </div>
      </div>
    </div>
  );
}
