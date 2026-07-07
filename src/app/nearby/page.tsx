'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/UserContext';
import ChatOverlay from '@/components/chat/ChatOverlay';
import { UserProfile, Chat, Message } from '@/types';

const MapViewer = dynamic(() => import('@/components/map/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#000000]">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  ),
});

export default function NearbyPage() {
  const { profile } = useUser();
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  // Subscribe to messages of active chat if opened
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

  // Start chat with a user
  const handleStartChat = async (targetUser: UserProfile) => {
    if (!profile || !profile.id) return;

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
      } else {
        // Create new chat doc
        const newChatDoc = await addDoc(collection(db, 'chats'), {
          members: [profile.id, targetUser.id],
          profiles: {
            [profile.id]: profile,
            [targetUser.id]: targetUser,
          },
          lastMessage: '',
          time: 'Just now',
          streak: 1,
          disappearsIn: 24,
          createdAt: new Date(),
        });

        const newChat: Chat = {
          id: newChatDoc.id,
          user: targetUser,
          lastMessage: '',
          time: 'Just now',
          streak: 1,
          disappearsIn: 24,
        };

        setActiveChat(newChat);
      }
    } catch (err) {
      console.error("Error starting chat:", err);
    }
  };

  // Send message from overlay
  const handleSendChatMessage = async (text: string, imageUrl?: string) => {
    if (!activeChat || !profile) return;

    try {
      // Add message
      await addDoc(collection(db, 'messages'), {
        chatId: activeChat.id,
        from: 'you',
        text: text || '',
        imageUrl: imageUrl || null,
        time: 'Now',
        createdAt: new Date(),
      });

      // Update chat last message
      const chatDoc = doc(db, 'chats', activeChat.id);
      await updateDoc(chatDoc, {
        lastMessage: text || '📷 Photo',
        time: 'Just now',
        createdAt: new Date(),
      });
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  return (
    <div className="absolute top-0 bottom-[96px] left-0 right-0 bg-[#000000]">
      <MapViewer currentUserId={profile?.id} onStartChat={handleStartChat} />

      {activeChat && (
        <ChatOverlay
          chat={activeChat}
          messages={chatMessages}
          onBack={() => setActiveChat(null)}
          onSend={handleSendChatMessage}
        />
      )}
    </div>
  );
}
