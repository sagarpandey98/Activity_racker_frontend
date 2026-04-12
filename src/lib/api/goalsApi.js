import trackerClient from './trackerClient';

// Goals
export const goalsApi = {
  getAll: () =>
    trackerClient.get('/goals').then(r => r.data),

  getById: (id) =>
    trackerClient.get(`/goals/${id}`).then(r => r.data),

  getTree: () =>
    trackerClient.get('/goals/tree').then(r => r.data),

  create: (data) =>
    trackerClient.post('/goals', data).then(r => r.data),

  update: (id, data) =>
    trackerClient.put(`/goals/${id}`, data).then(r => r.data),

  delete: (id) =>
    trackerClient.delete(`/goals/${id}`).then(r => r.data),

  getStatistics: () =>
    trackerClient.get('/goals/statistics').then(r => r.data),

  getHealthSummary: () =>
    trackerClient.get('/goals/health-summary').then(r => r.data),

  getOverdue: () =>
    trackerClient.get('/goals/overdue').then(r => r.data),

  getDueSoon: () =>
    trackerClient.get('/goals/due-soon').then(r => r.data),

  getMilestones: () =>
    trackerClient.get('/goals/milestones').then(r => r.data),

  search: (query) =>
    trackerClient.get(`/goals/search?query=${query}`)
      .then(r => r.data),

  updateProgress: (id, currentValue) =>
    trackerClient.patch(`/goals/${id}/progress`, { currentValue })
      .then(r => r.data),

  recalculateHealth: (id) =>
    trackerClient.patch(`/goals/${id}/health/recalculate`)
      .then(r => r.data),

  bulkUpdateProgress: (updates) =>
    trackerClient.patch('/goals/progress/bulk', updates)
      .then(r => r.data),

  bulkUpdateStatus: (updates) =>
    trackerClient.patch('/goals/status/bulk', updates)
      .then(r => r.data),
};

// Priority System
export const priorityApi = {
  // Priority-wise goal listings
  getSortedGoals: () =>
    trackerClient.get('/priority/goals/sorted').then(r => r.data),

  getGroupedGoals: () =>
    trackerClient.get('/priority/goals/grouped').then(r => r.data),

  getTodayFocus: (limit = 10) =>
    trackerClient.get(`/priority/goals/today-focus?limit=${limit}`).then(r => r.data),

  // Priority score calculation
  getGoalScore: (goalUuid) =>
    trackerClient.get(`/priority/goals/${goalUuid}/score`).then(r => r.data),

  // Priority analytics
  getStatistics: () =>
    trackerClient.get('/priority/statistics').then(r => r.data),
};

// Smart Todo List
export const smartTodoApi = {
  // Get today's smart todo list
  getTodayTodos: () =>
    trackerClient.get('/todos/today').then(r => r.data),

  // Refresh today's todo list
  refreshTodos: () =>
    trackerClient.post('/todos/refresh').then(r => r.data),
};
