// Predefined "not done" reason taxonomy for "No activity" / skip logs.
// Stored on the activity as notDoneReasonCategory (the category `value`) and
// notDoneReasonSubcategory (the chosen subcategory string) so they stay consistent
// for later analysis. Kept as a small constant list rather than a managed taxonomy;
// can be promoted to a backend-managed structure later if needed.

export const SKIP_REASON_CATEGORIES = [
  {
    value: 'NO_TIME',
    label: 'No time',
    subcategories: ['Too busy', 'Ran out of time', 'Overbooked', 'Unexpected event'],
  },
  {
    value: 'HEALTH',
    label: 'Health',
    subcategories: ['Sick', 'Injured', 'Tired / low energy', 'Mental health'],
  },
  {
    value: 'MOTIVATION',
    label: 'Motivation',
    subcategories: ['Not motivated', 'Forgot', 'Procrastinated', 'Burned out'],
  },
  {
    value: 'EXTERNAL',
    label: 'External',
    subcategories: ['Travel', 'Family / social', 'Weather', 'Resource unavailable'],
  },
  {
    value: 'PLANNED_REST',
    label: 'Planned rest',
    subcategories: ['Rest day', 'Deload', 'Reprioritized'],
  },
  {
    value: 'OTHER',
    label: 'Other',
    subcategories: ['Other'],
  },
];

export function getSkipReasonLabel(categoryValue) {
  const found = SKIP_REASON_CATEGORIES.find((c) => c.value === categoryValue);
  return found ? found.label : categoryValue || '';
}

export function getSkipReasonSubcategories(categoryValue) {
  const found = SKIP_REASON_CATEGORIES.find((c) => c.value === categoryValue);
  return found ? found.subcategories : [];
}
