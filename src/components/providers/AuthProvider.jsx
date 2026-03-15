'use client';

import { useEffect } from 'react';
import { getProfile } from '@/lib/api/authApi';
import useAuthStore from '@/lib/store/authStore';

export default function AuthProvider({ children }) {
  const { setUser, clearUser, setLoading } = useAuthStore();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const response = await getProfile();
        setUser(response);
      } catch (error) {
        // If 401 or 503 or any error, clear auth state and don't break the app
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setUser, clearUser, setLoading]);

  return <>{children}</>;
}
