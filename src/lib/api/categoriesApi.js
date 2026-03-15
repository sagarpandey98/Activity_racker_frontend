import trackerClient from './trackerClient';

export const categoriesApi = {
  getByUser: (userId) =>
    trackerClient.get(`/categories/${userId}`)
      .then(r => r.data),

  update: (data) =>
    trackerClient.put('/categories', data).then(r => r.data),
};
