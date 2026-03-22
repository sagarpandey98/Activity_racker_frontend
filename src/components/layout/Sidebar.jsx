'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart2, Home, LogOut, Settings, Target, Zap } from 'lucide-react';
import useAuthStore from '@/lib/store/authStore';
import { logout } from '@/lib/api/authApi';

const navItems = [
  { label: 'Home', href: '/dashboard', icon: Home, match: 'exact' },
  { label: 'Goals', href: '/goals', icon: Target, match: 'startsWith' },
  { label: 'Activities', href: '/activities', icon: Zap, match: 'startsWith' },
  { label: 'Analytics', href: '/analytics', icon: BarChart2, match: 'startsWith' },
  { label: 'Settings', href: '/settings', icon: Settings, match: 'startsWith' },
];

function isActive(pathname, item) {
  if (item.match === 'exact') return pathname === item.href;
  return pathname.startsWith(item.href);
}

function getInitial(name, email) {
  const base = (name || email || '').trim();
  return base ? base[0].toUpperCase() : '?';
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useAuthStore();

  const displayName = user?.name || user?.username || 'User';
  const displayEmail = user?.email || '';
  const initial = getInitial(displayName, displayEmail);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      // Always continue logout UX
    } finally {
      clearUser();
      router.push('/login');
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-[#05051a] border-r border-white/5 px-3 py-6">
      {/* Top / Logo */}
      <div className="flex items-center gap-2 px-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <span className="text-black font-extrabold">N</span>
        </div>
        <span className="text-white font-bold text-lg tracking-tighter">
          Northstar
        </span>
      </div>

      {/* Nav */}
      <nav className="mt-10 flex flex-col gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'w-full rounded-lg px-3 py-2.5 flex items-center gap-3 text-sm font-medium transition-all',
                active
                  ? 'text-white bg-white/10 border-l-2 border-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent',
              ].join(' ')}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="absolute bottom-6 left-3 right-3">
        <div className="px-2 py-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white text-sm font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">
                {displayName}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {displayEmail}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

