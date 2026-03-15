import axios from 'axios';

const authClient = axios.create({
  baseURL: '/api/auth',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send cookies automatically
});

// Response interceptor — handle errors globally
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default authClient;
