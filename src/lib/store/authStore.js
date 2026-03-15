import { create } from 'zustand';

const useAuthStore = create((set) => ({
  // User object from JWT claims
  // { id, username, email, name, roles }
  user: null,

  // Is the user authenticated?
  isAuthenticated: false,

  // Is auth state being loaded?
  isLoading: true,

  // Set user after login
  setUser: (user) => set({
    user,
    isAuthenticated: true,
    isLoading: false,
  }),

  // Clear user on logout
  clearUser: () => set({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  }),

  // Set loading state
  setLoading: (isLoading) => set({ isLoading }),
}));

export default useAuthStore;
