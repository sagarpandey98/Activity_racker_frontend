/** Deterministic palette for goal cards (hash of id → theme). */
const GOAL_CARD_THEMES = [
  {
    border: 'border-violet-400/35 hover:border-violet-300/55',
    wash: 'from-violet-400/40 via-fuchsia-500/20 to-cyan-400/10',
    ribbon: 'from-violet-300 via-fuchsia-400 to-cyan-300',
    miniBorder: 'border-violet-400/30',
    miniWash: 'from-violet-500/25 via-fuchsia-500/10 to-cyan-500/10',
    panelWash: 'from-violet-500/20 via-fuchsia-500/10 to-cyan-500/10',
    progressTrack: 'bg-violet-950/60',
    viewBtn: 'bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 hover:text-white',
  },
  {
    border: 'border-cyan-400/35 hover:border-cyan-300/55',
    wash: 'from-cyan-400/40 via-sky-500/20 to-blue-400/10',
    ribbon: 'from-cyan-300 via-sky-400 to-blue-300',
    miniBorder: 'border-cyan-400/30',
    miniWash: 'from-cyan-500/25 via-sky-500/10 to-blue-500/10',
    panelWash: 'from-cyan-500/20 via-sky-500/10 to-blue-500/10',
    progressTrack: 'bg-cyan-950/60',
    viewBtn: 'bg-cyan-500/20 text-cyan-100 hover:bg-cyan-500/30 hover:text-white',
  },
  {
    border: 'border-amber-400/35 hover:border-amber-300/55',
    wash: 'from-amber-400/40 via-orange-500/20 to-rose-400/10',
    ribbon: 'from-amber-300 via-orange-400 to-rose-300',
    miniBorder: 'border-amber-400/30',
    miniWash: 'from-amber-500/25 via-orange-500/10 to-rose-500/10',
    panelWash: 'from-amber-500/20 via-orange-500/10 to-rose-500/10',
    progressTrack: 'bg-amber-950/60',
    viewBtn: 'bg-amber-500/20 text-amber-100 hover:bg-amber-500/30 hover:text-white',
  },
  {
    border: 'border-emerald-400/35 hover:border-emerald-300/55',
    wash: 'from-emerald-400/40 via-teal-500/20 to-cyan-400/10',
    ribbon: 'from-emerald-300 via-teal-400 to-cyan-300',
    miniBorder: 'border-emerald-400/30',
    miniWash: 'from-emerald-500/25 via-teal-500/10 to-cyan-500/10',
    panelWash: 'from-emerald-500/20 via-teal-500/10 to-cyan-500/10',
    progressTrack: 'bg-emerald-950/60',
    viewBtn: 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 hover:text-white',
  },
  {
    border: 'border-rose-400/35 hover:border-rose-300/55',
    wash: 'from-rose-400/40 via-pink-500/20 to-violet-400/10',
    ribbon: 'from-rose-300 via-pink-400 to-violet-300',
    miniBorder: 'border-rose-400/30',
    miniWash: 'from-rose-500/25 via-pink-500/10 to-violet-500/10',
    panelWash: 'from-rose-500/20 via-pink-500/10 to-violet-500/10',
    progressTrack: 'bg-rose-950/60',
    viewBtn: 'bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 hover:text-white',
  },
  {
    border: 'border-indigo-400/35 hover:border-indigo-300/55',
    wash: 'from-indigo-400/40 via-blue-500/20 to-violet-400/10',
    ribbon: 'from-indigo-300 via-blue-400 to-violet-300',
    miniBorder: 'border-indigo-400/30',
    miniWash: 'from-indigo-500/25 via-blue-500/10 to-violet-500/10',
    panelWash: 'from-indigo-500/20 via-blue-500/10 to-violet-500/10',
    progressTrack: 'bg-indigo-950/60',
    viewBtn: 'bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 hover:text-white',
  },
];

function hashGoalId(seed) {
  const str = String(seed ?? '');
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getGoalCardTheme(seed) {
  const idx = hashGoalId(seed) % GOAL_CARD_THEMES.length;
  return GOAL_CARD_THEMES[idx];
}

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

// Priority score calculation helpers
export function getPriorityValue(priority) {
  switch (priority) {
    case 'CRITICAL': return 4;
    case 'HIGH':     return 3;
    case 'MEDIUM':   return 2;
    case 'LOW':      return 1;
    default:         return 1;
  }
}

export function calculateEffectivePriorityScore(goal, parentGoal = null) {
  const childPriority = getPriorityValue(goal?.priority);
  const parentPriority = parentGoal ? getPriorityValue(parentGoal?.priority) : 0;
  
  // Weighted formula: 70% child + 30% parent
  let score = (childPriority * 0.7) + (parentPriority * 0.3);
  
  // Bonus for children of CRITICAL goals
  if (parentPriority === 4) {
    score += 0.5;
  }
  
  return Math.round(score * 10) / 10; // Round to 1 decimal place
}

export function getPriorityScoreColor(score) {
  if (score >= 3.5) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 2.5) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (score >= 1.5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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

// Milestone / parent-container goals: organizational only (child goals, no direct targets on parent).
// Treat isLeaf === false as parent in the API model; also honor explicit milestone flags (camel or snake case).
export function isMilestoneGoal(goal) {
  if (!goal || typeof goal !== 'object') return false;
  if (goal.isMilestone === true || goal.is_milestone === true) return true;
  if (goal.isLeaf === false) return true;
  return false;
}

/** User-visible reason when “create child goal” is disabled (direct tracking, not a milestone parent). */
export const CHILD_GOAL_DISABLED_EXPLANATION =
  'Child goals can only be created under milestone (parent) goals. This goal is set up for direct tracking, so adding a sub-goal is not available.';

// Check if goal is a leaf (trackable) goal
export function isLeafGoal(goal) {
  return goal.isLeaf === true;
}

// Check if goal has tracking configured
export function isTrackedGoal(goal) {
  return goal.scheduleSpec != null;
}
