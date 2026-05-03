'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart2, CheckSquare, LogOut, Settings, Target, Zap } from 'lucide-react';
import useAuthStore from '@/lib/store/authStore';
import { logout } from '@/lib/api/authApi';

const navItems = [
  { label: 'My Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Activities', href: '/activities', icon: Zap },
  { label: 'Analytics', href: '/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitial(name, email) {
  const base = (name || email || '').trim();
  return base ? base[0].toUpperCase() : 'U';
}

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser } = useAuthStore();

  const displayName = user?.name || user?.username || 'User';
  const displayEmail = user?.email || '';
  const initial = getInitial(displayName, displayEmail);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.warn('Logout request failed, clearing local session anyway:', error);
    } finally {
      clearUser();
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#000212]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white text-sm font-black text-black shadow-lg shadow-white/5">
              N
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-white">Northstar</div>
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Activity Tracker
              </div>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden min-w-0 text-right sm:block">
              <div className="truncate text-sm font-semibold text-white">{displayName}</div>
              <div className="truncate text-xs text-slate-500">{displayEmail}</div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.08] text-sm font-semibold text-white">
              {initial}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-all ${
                  active
                    ? 'border-emerald-300/30 bg-emerald-400/15 text-emerald-100 shadow-lg shadow-emerald-500/10'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
