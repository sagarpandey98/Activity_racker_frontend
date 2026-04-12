'use client';

import { useEffect, useState } from 'react';
import useAuthStore from '@/lib/store/authStore';

export default function AuthDebug() {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    // Get auth state from multiple sources
    const authState = useAuthStore();
    const localStorageAuth = localStorage.getItem('auth-storage');
    const userIdFromStorage = localStorage.getItem('userId');
    const userIdFromSession = sessionStorage.getItem('userId');
    
    // Try to parse JWT from cookie
    let jwtUserId = null;
    try {
      const token = getCookieValue('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        jwtUserId = payload.sub;
      }
    } catch (e) {
      console.warn('Failed to parse JWT:', e);
    }

    const debugData = {
      authStore: {
        user: authState.user,
        isAuthenticated: authState.isAuthenticated,
        userId: authState.user?.id
      },
      localStorage: {
        authState: localStorageAuth ? JSON.parse(localStorageAuth) : null,
        userId: userIdFromStorage
      },
      sessionStorage: {
        userId: userIdFromSession
      },
      jwt: {
        userId: jwtUserId
      },
      global: {
        __AUTH_USER__: window.__AUTH_USER__,
        __ZUSTAND__: window.__ZUSTAND__
      }
    };

    setDebugInfo(debugData);
  }, []);

  const getCookieValue = (name) => {
    const value = `; ${document.cookie}`.split(`; ${name}=`).pop()?.split(';').shift();
    return value;
  };

  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50 font-mono">
      <div className="mb-2 font-bold">Auth Debug Info</div>
      <div className="space-y-1">
        <div><strong>Auth Store:</strong> {JSON.stringify(debugInfo.authStore)}</div>
        <div><strong>Local Storage:</strong> {JSON.stringify(debugInfo.localStorage)}</div>
        <div><strong>Session Storage:</strong> {JSON.stringify(debugInfo.sessionStorage)}</div>
        <div><strong>JWT:</strong> {JSON.stringify(debugInfo.jwt)}</div>
        <div><strong>Global:</strong> {JSON.stringify(debugInfo.global)}</div>
      </div>
    </div>
  );
}
