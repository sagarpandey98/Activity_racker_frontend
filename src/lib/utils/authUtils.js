// Utility functions for authentication

export function getUserId() {
  // Try multiple methods to get user ID
  let userId = null;

  // Method 1: Try Zustand store
  try {
    if (typeof window !== 'undefined') {
      const authStore = window.__ZUSTAND__?.authStore?.getState?.();
      userId = authStore?.user?.id;
      if (userId) {
        console.log('User ID from Zustand:', userId);
        return userId;
      }
    }
  } catch (e) {
    console.warn('Failed to get user ID from Zustand:', e);
  }

  // Method 2: Try localStorage
  if (!userId) {
    userId = localStorage.getItem('userId');
    if (userId) {
      console.log('User ID from localStorage:', userId);
      return userId;
    }
  }

  // Method 3: Try sessionStorage
  if (!userId) {
    userId = sessionStorage.getItem('userId');
    if (userId) {
      console.log('User ID from sessionStorage:', userId);
      return userId;
    }
  }

  // Method 4: Try parsing from JWT token (if available)
  if (!userId) {
    try {
      const token = getCookieValue('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userId = payload.sub; // Standard JWT claim for subject
        if (userId) {
          console.log('User ID from JWT:', userId);
          return userId;
        }
      }
    } catch (e) {
      console.warn('Failed to parse JWT token:', e);
    }
  }

  console.warn('Could not extract user ID from any source');
  return null;
}

function getCookieValue(name) {
  const value = `; ${document.cookie}`.split(`; ${name}=`).pop()?.split(';').shift();
  return value;
}

export function setUserId(userId) {
  // Set in multiple places for redundancy
  localStorage.setItem('userId', userId);
  sessionStorage.setItem('userId', userId);
}
