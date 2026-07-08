'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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

const isUserOnline = (lastActive: any): boolean => {
  if (!lastActive) return false;
  const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
  const diffMs = new Date().getTime() - date.getTime();
  return diffMs < 10 * 60000; // Active within the last 10 minutes
};

export default function NearbyPage() {
  const { profile, requestLocation } = useUser();
  const router = useRouter();
  const [requesting, setRequesting] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);

  // Subscribe to real-time users from Firestore to build "Who's Online Nearby"
  useEffect(() => {
    if (!profile?.id) return;
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (doc.id !== profile.id && data.pos && Array.isArray(data.pos)) {
          list.push({
            id: doc.id,
            name: data.name || 'User',
            initials: data.initials || 'U',
            accent: data.accent || '#3b82f6',
            pos: data.pos as [number, number],
            approxPos: data.approxPos,
            lastActive: data.lastActive,
          });
        }
      });
      setActiveUsers(list);
    }, (error) => {
      console.error("Error subscribing to users in NearbyPage:", error);
    });

    return () => unsub();
  }, [profile]);

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

      {/* "Who's Online Nearby" HUD Row (Only shows when location is active) */}
      {hasLocation && activeUsers.length > 0 && (
        <div className="absolute top-4 left-4 right-4 z-[9999] overflow-x-auto no-scrollbar pointer-events-auto flex justify-center">
          <div className="flex gap-3 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-3 overflow-x-auto max-w-full shadow-2xl">
            {activeUsers.map((user) => {
              const online = isUserOnline(user.lastActive);
              return (
                <button
                  key={user.id}
                  onClick={() => handleStartChat(user)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform group-hover:scale-105"
                      style={{ 
                        backgroundColor: user.accent,
                        border: online ? '2px solid #22c55e' : '2px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {user.initials}
                    </div>
                    {online && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161616] animate-pulse" />
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 font-bold group-hover:text-white truncate max-w-[52px] text-center">
                    {user.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Enable Location Request Banner overlay */}
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
