'use client';

import { Target } from 'lucide-react';
import { getRelativeTime } from '@/lib/utils/dateUtils';

const MOOD_EMOJIS = ['', '😫', '😕', '😐', '🙂', '😄'];

function formatTimeFromISO(isoString) {
  if (!isoString) return '–';
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
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
  return (
    <div className="flex items-start gap-4 border-b border-white/[0.05] py-4 hover:bg-white/[0.02] px-3 rounded-xl transition-all">
      {/* Left Column - Time */}
      <div className="w-16 flex-shrink-0 text-center">
        <div className="text-sm font-medium text-white">
          {formatTimeFromISO(activity.startTime)}
        </div>
        <div className="text-xs text-slate-500">
          {calculateDuration(activity.startTime, activity.endTime)}
        </div>
      </div>

      {/* Middle - Activity Info */}
      <div className="flex-1">
        <div className="font-medium text-white text-sm">
          {activity.name || 'Untitled Activity'}
        </div>

        {activity.goalId && (
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
            <Target className="w-3 h-3" />
            Linked to goal
          </div>
        )}

        {activity.domainName && activity.domainName !== 'General' && (
          <div className="text-xs text-slate-600 mt-0.5">
            {activity.domainName}
            {activity.subdomainName && ` · ${activity.subdomainName}`}
          </div>
        )}
      </div>

      {/* Right Column - Mood & Time */}
      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {activity.mood && MOOD_EMOJIS[activity.mood] && (
          <div className="text-lg">{MOOD_EMOJIS[activity.mood]}</div>
        )}
        <div className="text-xs text-slate-600">
          {getRelativeTime(activity.createdAt)}
        </div>
      </div>
    </div>
  );
}
