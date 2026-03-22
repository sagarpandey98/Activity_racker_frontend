'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getProfile } from '@/lib/api/authApi';
import useAuthStore from '@/lib/store/authStore';

export default function AuthProvider({ children }) {
  const { setUser, clearUser, setLoading } = useAuthStore();
  const pathname = usePathname();

  useEffect(() => {
    const publicPaths = ['/', '/login', '/signup'];
    
    // Skip profile fetch on public routes
    if (publicPaths.includes(pathname)) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const response = await getProfile();
        const profile = response.data?.data || response.data;
        setUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          username: profile.username || profile.email,
        });
      } catch (error) {
        // If 401 or 503 or any error, clear auth state and don't break the app
        clearUser();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, [setUser, clearUser, setLoading, pathname]);

  return <>{children}</>;
}
