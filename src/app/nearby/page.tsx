'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { UserProfile } from '@/types';
import { MapPin } from 'lucide-react';

const MapViewer = dynamic(() => import('@/components/map/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#000000]">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  ),
});

export default function NearbyPage() {
  const { profile, requestLocation } = useUser();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);

  // Redirect to chats page and open chat with the target user
  const handleStartChat = (targetUser: UserProfile) => {
    if (!profile || !profile.id) return;
    router.push(`/chats?userId=${targetUser.id}`);
  };

  const handleRequestLocation = async () => {
    setRequesting(true);
    try {
      await requestLocation();
    } catch (e) {
      alert('Could not enable location access. Please check your browser/device settings.');
    } finally {
      setRequesting(false);
    }
  };

  const hasLocation = !!profile?.pos;

  return (
    <div className="absolute top-0 bottom-[96px] left-0 right-0 bg-[#000000]">
      <MapViewer currentUserId={profile?.id} onStartChat={handleStartChat} />

      {!hasLocation && (
        <div className="absolute top-4 left-4 right-4 z-[9999] flex flex-col items-center">
          <div className="w-full max-w-md bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex items-center gap-3 shadow-2xl animate-slide-up">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 flex-shrink-0 animate-pulse">
              <MapPin size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold mb-0.5">Location Access Required</p>
              <p className="text-gray-400 text-xs leading-normal">
                Grant location access to discover people around you on the map.
              </p>
            </div>
            <button
              onClick={handleRequestLocation}
              disabled={requesting}
              className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md flex-shrink-0 disabled:opacity-50 cursor-pointer"
            >
              {requesting ? 'Enabling...' : 'Enable'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
