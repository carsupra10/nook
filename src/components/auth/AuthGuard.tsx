'use client';

import { useUser } from '@/context/UserContext';
import AuthScreen from './AuthScreen';
import TopHeader from '../navigation/TopHeader';
import BottomNav from '../navigation/BottomNav';
import { updateCurrentUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthScreen onAuth={() => {}} />;
  }

  return (
    <div className="mx-auto max-w-lg min-h-screen flex flex-col relative w-full bg-black text-[#f5f5f5]">
      <TopHeader />
      <main className="flex-1 pb-32 relative">{children}</main>
      <BottomNav />
    </div>
  );
}
