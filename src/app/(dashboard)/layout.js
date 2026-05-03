'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import AuthProvider from '@/components/providers/AuthProvider';
import useAuthStore from '@/lib/store/authStore';
import HeaderNav from '@/components/layout/HeaderNav';
import useUIStore from '@/lib/store/uiStore';
import QuickLogDrawer from '@/components/activities/QuickLogDrawer';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const {
    isQuickLogOpen,
    setIsQuickLogOpen,
    prefillGoal,
    setPrefillGoal,
    bumpActivityLogVersion,
  } = useUIStore();

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
          <HeaderNav />

          <main className="min-h-screen pb-24">
            <div className="px-4 py-5 md:p-6">{children}</div>
          </main>

          {/* Floating Action Button */}
          <button
            onClick={() => setIsQuickLogOpen(true)}
            className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 w-14 h-14 rounded-full bg-white shadow-lg shadow-black/20 flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="Log Activity"
          >
            <Plus className="w-6 h-6 text-black" />
          </button>

          {/* Quick Log Drawer */}
          <QuickLogDrawer
            isOpen={isQuickLogOpen}
            onClose={() => {
              setIsQuickLogOpen(false);
              setPrefillGoal(null);
            }}
            onSuccess={() => {
              setIsQuickLogOpen(false);
              setPrefillGoal(null);
              bumpActivityLogVersion();
            }}
            prefillGoal={prefillGoal}
          />
        </div>
      )}
    </AuthProvider>
  );
}
