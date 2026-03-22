'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Home, Settings, Target, Zap } from 'lucide-react';

const items = [
  { label: 'Home', href: '/dashboard', icon: Home, match: 'exact' },
  { label: 'Goals', href: '/goals', icon: Target, match: 'startsWith' },
  { label: 'Activities', href: '/activities', icon: Zap, match: 'startsWith', primary: true },
  { label: 'Analytics', href: '/analytics', icon: BarChart2, match: 'startsWith' },
  { label: 'Settings', href: '/settings', icon: Settings, match: 'startsWith' },
];

function isActive(pathname, item) {
  if (item.match === 'exact') return pathname === item.href;
  return pathname.startsWith(item.href);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-16 bg-[#05051a] border-t border-white/10">
      <div className="h-full grid grid-cols-5 items-center">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1"
                aria-label={item.label}
              >
                <div className="rounded-full bg-white p-3 shadow-[0_8px_24px_rgba(255,255,255,0.12)]">
                  <Icon className="w-5 h-5 text-black" />
                </div>
                <span className={active ? 'text-[10px] text-white' : 'text-[10px] text-slate-500'}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={active
                ? 'flex flex-col items-center justify-center gap-1 text-white'
                : 'flex flex-col items-center justify-center gap-1 text-slate-500'}
              aria-label={item.label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

