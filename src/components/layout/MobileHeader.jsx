'use client';

import { Bell } from 'lucide-react';
import useAuthStore from '@/lib/store/authStore';

function getInitial(name, email) {
  const base = (name || email || '').trim();
  return base ? base[0].toUpperCase() : 'U';
}

export default function MobileHeader({ title }) {
  const { user } = useAuthStore();

  const displayName = user?.name || user?.username || '';
  const displayEmail = user?.email || '';
  const initial = getInitial(displayName, displayEmail);

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#000212] border-b border-white/5">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="text-white text-sm font-semibold tracking-tight">
          {title}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-sm font-semibold">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}

