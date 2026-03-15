// Priority label and color
export function getPriorityLabel(priority) {
  switch (priority) {
    case 'CRITICAL': return 'P1';
    case 'HIGH':     return 'P2';
    case 'MEDIUM':   return 'P3';
    case 'LOW':      return 'P4';
    default:         return '–';
  }
}

export function getPriorityColor(priority) {
  switch (priority) {
    case 'CRITICAL':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'HIGH':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'MEDIUM':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'LOW':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// Status label and color
export function getStatusColor(status) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'IN_PROGRESS':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'NOT_STARTED':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    case 'OVERDUE':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

// Goal type label
export function getGoalTypeLabel(goalType) {
  switch (goalType) {
    case 'HABIT':   return 'Habit';
    case 'PROJECT': return 'Project';
    case 'SKILL':   return 'Skill';
    case 'FITNESS': return 'Fitness';
    case 'GENERAL': return 'General';
    default:        return 'General';
  }
}

// Evaluation period label
export function getEvaluationPeriodLabel(period) {
  switch (period) {
    case 'DAILY':     return 'Daily';
    case 'WEEKLY':    return 'Weekly';
    case 'MONTHLY':   return 'Monthly';
    case 'QUARTERLY': return 'Quarterly';
    case 'YEARLY':    return 'Yearly';
    case 'CUSTOM':    return 'Custom';
    default:          return '–';
  }
}

// Check if goal is a leaf (trackable) goal
export function isLeafGoal(goal) {
  return goal.isLeaf === true;
}

// Check if goal has tracking configured
export function isTrackedGoal(goal) {
  return goal.isTracked === true;
}
