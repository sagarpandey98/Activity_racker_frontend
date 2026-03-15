import axios from 'axios';

const trackerClient = axios.create({
  baseURL: '/api/tracker',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send cookies automatically
});

// Request interceptor — attach JWT token from cookie
trackerClient.interceptors.request.use(
  (config) => {
    // Token is in httpOnly cookie, handled server-side
    // Nothing to do here — cookie sent automatically
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
trackerClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default trackerClient;
