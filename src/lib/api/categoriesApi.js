import trackerClient from './trackerClient';

export const categoriesApi = {
  // GET /categories — userId from JWT, no path param
  get: () =>
    trackerClient.get('/categories').then(r => r.data),

  // PUT /categories — send full structure
  update: (data) =>
    trackerClient.put('/categories', data).then(r => r.data),

  // POST /categories — create or update
  createOrUpdate: (data) =>
    trackerClient.post('/categories', data).then(r => r.data),
};
