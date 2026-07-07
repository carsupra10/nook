'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, doc, addDoc, updateDoc, arrayUnion, arrayRemove, getDocs, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/UserContext';
import MomentCard from '@/components/feed/MomentCard';
import CreatePostModal from '@/components/feed/CreatePostModal';
import StoryViewer from '@/components/feed/StoryViewer';
import ChatOverlay from '@/components/chat/ChatOverlay';
import { USERS, INITIAL_MOMENTS } from '@/constants/mockData';
import { Moment, UserProfile, Chat, Message } from '@/types';
import { Plus } from 'lucide-react';

export default function MomentsPage() {
  const { profile } = useUser();
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeStoryUser, setActiveStoryUser] = useState<UserProfile | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

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
          time: data.time || '1h ago',
          distance: data.distance || '0.5 mi',
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

  // 2. Subscribe to messages of active chat if opened
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChat.id),
      orderBy('createdAt', 'asc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          from: data.from,
          text: data.text || '',
          time: data.time || 'Now',
          imageUrl: data.imageUrl,
        });
      });
      setChatMessages(list);
    }, (error) => {
      console.error("Error loading chat messages:", error);
    });

    return () => unsub();
  }, [activeChat]);

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
        imageUrl: imageUrl || undefined,
        createdAt: new Date(),
      });
      setIsCreating(false);
    } catch (e) {
      console.error("Error posting moment:", e);
    }
  };

  // Start chat with a user
  const handleStartChat = async (targetUser: UserProfile, initialMessage?: string) => {
    if (!profile) return;

    try {
      // Find or create chat in Firestore
      const q = query(
        collection(db, 'chats'),
        where('members', 'array-contains', profile.id)
      );
      const querySnap = await getDocs(q);
      
      let existingChat: Chat | null = null;

      querySnap.forEach((doc) => {
        const data = doc.data();
        if (data.members.includes(targetUser.id)) {
          existingChat = {
            id: doc.id,
            user: data.profiles[targetUser.id],
            lastMessage: data.lastMessage,
            time: data.time,
            streak: data.streak || 0,
            disappearsIn: data.disappearsIn || 24,
          };
        }
      });

      if (existingChat) {
        setActiveChat(existingChat);
        if (initialMessage) {
          await handleSendChatMessage(initialMessage, undefined, existingChat);
        }
      } else {
        // Create new chat doc
        const newChatDoc = await addDoc(collection(db, 'chats'), {
          members: [profile.id, targetUser.id],
          profiles: {
            [profile.id]: profile,
            [targetUser.id]: targetUser,
          },
          lastMessage: initialMessage || '',
          time: 'Just now',
          streak: 1,
          disappearsIn: 24,
          createdAt: new Date(),
        });

        const newChat: Chat = {
          id: newChatDoc.id,
          user: targetUser,
          lastMessage: initialMessage || '',
          time: 'Just now',
          streak: 1,
          disappearsIn: 24,
        };

        setActiveChat(newChat);

        if (initialMessage) {
          await addDoc(collection(db, 'messages'), {
            chatId: newChatDoc.id,
            from: 'you',
            text: initialMessage,
            time: 'Now',
            createdAt: new Date(),
          });
        }
      }
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  // Send message from overlay
  const handleSendChatMessage = async (text: string, imageUrl?: string, overrideChat?: Chat) => {
    const active = overrideChat || activeChat;
    if (!active || !profile) return;

    try {
      // Add message
      await addDoc(collection(db, 'messages'), {
        chatId: active.id,
        from: 'you',
        text: text || '',
        imageUrl: imageUrl || null,
        time: 'Now',
        createdAt: new Date(),
      });

      // Update chat last message
      const chatDoc = doc(db, 'chats', active.id);
      await updateDoc(chatDoc, {
        lastMessage: text || '📷 Photo',
        time: 'Just now',
        createdAt: new Date(),
      });
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  // Generate stories dynamically by filtering active moments from the last 24h
  // Group them by user
  const storiesMap: Record<string, { user: UserProfile; moments: Moment[] }> = {};
  moments.forEach((m) => {
    // Exclude current user from stories if they click the FAB separately, 
    // but we can still show their moments in feed.
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

      {/* Reply Chat Overlay */}
      {activeChat && (
        <ChatOverlay
          chat={activeChat}
          messages={chatMessages}
          onBack={() => setActiveChat(null)}
          onSend={(text, img) => handleSendChatMessage(text, img)}
        />
      )}
    </div>
  );
}
