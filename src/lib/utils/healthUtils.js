// Derive health status label from score
// Backend computes score, frontend derives label
export function getHealthStatus(score) {
  if (score === null || score === undefined)
    return 'UNTRACKED';
  if (score >= 80) return 'THRIVING';
  if (score >= 60) return 'ON_TRACK';
  if (score >= 40) return 'AT_RISK';
  return 'CRITICAL';
}

// Get color for health status
export function getHealthColor(score) {
  const status = getHealthStatus(score);
  switch (status) {
    case 'THRIVING':  return '#22c55e'; // green-500
    case 'ON_TRACK':  return '#3b82f6'; // blue-500
    case 'AT_RISK':   return '#eab308'; // yellow-500
    case 'CRITICAL':  return '#ef4444'; // red-500
    case 'UNTRACKED': return '#6b7280'; // gray-500
    default:          return '#6b7280';
  }
}

// Get Tailwind class for health status
export function getHealthBadgeClass(score) {
  const status = getHealthStatus(score);
  switch (status) {
    case 'THRIVING':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'ON_TRACK':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'AT_RISK':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'CRITICAL':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'UNTRACKED':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// Derive health trend from current vs last week score
export function getHealthTrend(current, lastWeek) {
  if (current === null || lastWeek === null) return 'UNKNOWN';
  const diff = current - lastWeek;
  if (diff > 3)  return 'IMPROVING';
  if (diff < -3) return 'DECLINING';
  return 'STABLE';
}

// Get trend arrow character
export function getTrendArrow(trend) {
  switch (trend) {
    case 'IMPROVING': return '↑';
    case 'DECLINING': return '↓';
    case 'STABLE':    return '→';
    default:          return '–';
  }
}

// Get trend color
export function getTrendColor(trend) {
  switch (trend) {
    case 'IMPROVING': return 'text-green-400';
    case 'DECLINING': return 'text-red-400';
    case 'STABLE':    return 'text-gray-400';
    default:          return 'text-gray-400';
  }
}

// Format health score for display
export function formatHealthScore(score) {
  if (score === null || score === undefined) return '–';
  return `${Math.round(score)}`;
}
