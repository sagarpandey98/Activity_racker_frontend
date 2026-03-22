import trackerClient from './trackerClient';

export const activitiesApi = {
  getAll: () =>
    trackerClient.get('/activities').then(r => r.data),

  create: (activityData) =>
    trackerClient.post('/activities', activityData)
      .then(r => r.data),

  createBulk: (activities) =>
    trackerClient.post('/activities/bulk', { activities })
      .then(r => r.data),

  search: (filter, pagination) =>
    trackerClient.post('/activities/search', {
      filter,
      pagination,
    }).then(r => r.data),
};
