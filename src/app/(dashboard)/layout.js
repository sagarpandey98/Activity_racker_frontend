'use client';

import { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import AuthProvider from '@/components/providers/AuthProvider';
import useAuthStore from '@/lib/store/authStore';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import MobileHeader from '@/components/layout/MobileHeader';
import useUIStore from '@/lib/store/uiStore';
import QuickLogDrawer from '@/components/activities/QuickLogDrawer';

function getTitleFromPath(pathname) {
  if (pathname === '/dashboard') return 'Home';
  if (pathname.startsWith('/goals')) return 'Goals';
  if (pathname.startsWith('/activities')) return 'Activities';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  if (pathname.startsWith('/settings')) return 'Settings';
  return 'Dashboard';
}

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuthStore();
  const { isQuickLogOpen, setIsQuickLogOpen } = useUIStore();

  const title = useMemo(() => getTitleFromPath(pathname), [pathname]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  return (
    <AuthProvider>
      {isLoading ? (
        <div className="min-h-screen bg-[#000212] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        </div>
      ) : !user ? (
        <div className="min-h-screen bg-[#000212]" />
      ) : (
        <div className="min-h-screen bg-[#000212] overflow-x-hidden">
          {/* Desktop */}
          <div className="hidden md:block">
            <Sidebar />
            <main className="ml-[240px] min-h-screen">
              <div className="p-6">{children}</div>
            </main>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <MobileHeader title={title} />
            <main className="pt-14 pb-16 min-h-screen">
              <div className="px-4 py-5">{children}</div>
            </main>
            <BottomNav />
          </div>

          {/* Floating Action Button */}
          <button
            onClick={() => setIsQuickLogOpen(true)}
            className="fixed bottom-24 right-6 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-white shadow-lg shadow-black/20 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Log Activity"
          >
            <Plus className="w-6 h-6 text-black" />
          </button>

          {/* Quick Log Drawer */}
          <QuickLogDrawer
            isOpen={isQuickLogOpen}
            onClose={() => setIsQuickLogOpen(false)}
            onSuccess={() => {
              setIsQuickLogOpen(false);
            }}
          />
        </div>
      )}
    </AuthProvider>
  );
}

