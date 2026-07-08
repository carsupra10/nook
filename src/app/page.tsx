'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/UserContext';
import MomentCard from '@/components/feed/MomentCard';
import CreatePostModal from '@/components/feed/CreatePostModal';
import StoryViewer from '@/components/feed/StoryViewer';
import { INITIAL_MOMENTS } from '@/constants/mockData';
import { Moment, UserProfile } from '@/types';
import { Plus } from 'lucide-react';

const formatMomentTime = (date: any): string => {
  if (!date) return 'Just now';
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return 'Just now';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export default function MomentsPage() {
  const { profile } = useUser();
  const router = useRouter();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeStoryUser, setActiveStoryUser] = useState<UserProfile | null>(null);

  // 1. Subscribe to real-time Moments from Firestore
  useEffect(() => {
    const q = query(collection(db, 'moments'), orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Moment[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          user: data.user,
          time: formatMomentTime(data.createdAt),
          distance: data.distance || '0.1 mi',
          disappearsIn: data.disappearsIn || 24,
          caption: data.caption || '',
          comments: data.comments || 0,
          hearts: data.hearts || 0,
          flames: data.flames || 0,
          likedBy: data.likedBy || [],
          reactedFlames: data.reactedFlames || [],
          imageUrl: data.imageUrl,
          liked: profile ? (data.likedBy || []).includes(profile.id) : false,
        });
      });
      setMoments(list);
    }, (error) => {
      console.error("Error listening to moments:", error);
    });

    return () => unsub();
  }, [profile]);

  // Handle Like Action
  const handleLike = async (id: string) => {
    if (!profile) return;
    const momentDoc = doc(db, 'moments', id);
    const m = moments.find(x => x.id === id);
    if (!m) return;

    const isLiked = m.likedBy?.includes(profile.id);
    
    try {
      await updateDoc(momentDoc, {
        likedBy: isLiked ? arrayRemove(profile.id) : arrayUnion(profile.id),
        hearts: isLiked ? Math.max(0, (m.hearts || 1) - 1) : (m.hearts || 0) + 1,
      });
    } catch (e) {
      console.error("Error updating like:", e);
    }
  };

  // Handle Flame Action
  const handleFlame = async (id: string) => {
    if (!profile) return;
    const momentDoc = doc(db, 'moments', id);
    const m = moments.find(x => x.id === id);
    if (!m) return;

    const isFlameActive = m.reactedFlames?.includes(profile.id);

    try {
      await updateDoc(momentDoc, {
        reactedFlames: isFlameActive ? arrayRemove(profile.id) : arrayUnion(profile.id),
        flames: isFlameActive ? Math.max(0, (m.flames || 1) - 1) : (m.flames || 0) + 1,
      });
    } catch (e) {
      console.error("Error updating flame reaction:", e);
    }
  };

  // Create new Moment in Firestore
  const handleCreatePost = async (text: string, imageUrl?: string) => {
    if (!profile) return;

    try {
      await addDoc(collection(db, 'moments'), {
        user: profile,
        time: 'Just now',
        distance: '0.1 mi',
        disappearsIn: 24,
        caption: text,
        comments: 0,
        hearts: 0,
        flames: 0,
        likedBy: [],
        reactedFlames: [],
        imageUrl: imageUrl || null,
        createdAt: new Date(),
      });
      setIsCreating(false);
    } catch (e) {
      console.error("Error posting moment:", e);
    }
  };

  // Redirect to chats page and start conversation
  const handleStartChat = (targetUser: UserProfile, initialMessage?: string) => {
    if (!profile || !profile.id) return;
    let url = `/chats?userId=${targetUser.id}`;
    if (initialMessage) {
      url += `&msg=${encodeURIComponent(initialMessage)}`;
    }
    router.push(url);
  };

  // Generate stories dynamically by filtering active moments from the last 24h
  const storiesMap: Record<string, { user: UserProfile; moments: Moment[] }> = {};
  moments.forEach((m) => {
    if (m.user.id !== profile?.id) {
      if (!storiesMap[m.user.id]) {
        storiesMap[m.user.id] = { user: m.user, moments: [] };
      }
      storiesMap[m.user.id].moments.push(m);
    }
  });

  const getMomentsForUser = (user: UserProfile) => {
    return moments.filter(m => m.user.id === user.id);
  };

  return (
    <div className="flex flex-col relative min-h-screen bg-black">
      {/* Horizontal avatars (Story-like UI) */}
      <div className="flex items-center gap-6 px-4 py-6 overflow-x-auto no-scrollbar bg-black">
        {/* "you" story button */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer" onClick={() => setIsCreating(true)}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-dashed border-[#555555] bg-transparent">
            <Plus size={24} className="text-[#555555]" />
          </div>
          <span className="text-[13px] font-bold text-[#737373]">you</span>
        </div>

        {/* Dynamic Stories */}
        {Object.values(storiesMap).map(({ user, moments }) => (
          <div 
            key={user.id} 
            className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer"
            onClick={() => setActiveStoryUser(user)}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg border-2"
              style={{
                borderColor: user.accent,
                color: user.accent,
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              {user.initials}
            </div>
            <span className="text-[13px] font-bold text-[#e5e5e5]">{user.name}</span>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 px-4 pb-24 space-y-8 bg-black">
        {moments.map((moment) => (
          <MomentCard 
            key={moment.id} 
            moment={moment}
            currentUserId={profile?.id}
            onLike={handleLike} 
            onFlame={handleFlame}
            onStartChat={handleStartChat}
          />
        ))}
      </div>

      {/* Create Modal */}
      {isCreating && profile && (
        <CreatePostModal
          onClose={() => setIsCreating(false)}
          onSubmit={handleCreatePost}
          user={profile}
        />
      )}

      {/* Story Viewer Overlay */}
      {activeStoryUser && (
        <StoryViewer
          user={activeStoryUser}
          moments={getMomentsForUser(activeStoryUser)}
          onClose={() => setActiveStoryUser(null)}
        />
      )}
    </div>
  );
}
