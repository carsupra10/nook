'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, addDoc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/UserContext';
import ChatOverlay from '@/components/chat/ChatOverlay';
import { UserProfile, Chat, Message } from '@/types';
import { MessageCircle, Flame } from 'lucide-react';

const formatChatTime = (date: any): string => {
  if (!date) return 'Just now';
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  if (isNaN(d.getTime())) return 'Just now';
  
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - d.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0 && now.getDate() === d.getDate()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1 || (diffDays === 0 && now.getDate() !== d.getDate())) {
    return 'Yesterday';
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

export default function ChatsPage() {
  const { profile } = useUser();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // 1. Subscribe to active chats from Firestore
  useEffect(() => {
    if (!profile || !profile.id) return;

    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', profile.id)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list: Chat[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        // The other member is the contact user
        const otherMemberId = data.members.find((mId: string) => mId !== profile.id);
        const contactUser = data.profiles[otherMemberId] || {
          id: otherMemberId,
          name: 'Contact',
          initials: 'C',
          accent: '#737373'
        };

        list.push({
          id: doc.id,
          user: contactUser,
          lastMessage: data.lastMessage || '',
          time: formatChatTime(data.createdAt),
          streak: data.streak || 0,
          disappearsIn: data.disappearsIn || 24,
        });
      });
      setChats(list);
    }, (error) => {
      console.error("Error listening to chats:", error);
    });

    return () => unsub();
  }, [profile]);

  // 2. Check for redirect query parameters to start chat instantly
  useEffect(() => {
    if (typeof window === 'undefined' || !profile || !profile.id) return;
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    const initialMessage = params.get('msg');
    if (!targetUserId) return;

    const startChat = async () => {
      try {
        const q = query(
          collection(db, 'chats'),
          where('members', 'array-contains', profile.id)
        );
        const querySnap = await getDocs(q);
        let existingChat: any = null;

        querySnap.forEach((doc) => {
          const data = doc.data();
          if (data.members.includes(targetUserId)) {
            const otherMemberId = data.members.find((mId: string) => mId !== profile.id);
            const contactUser = data.profiles[otherMemberId] || {
              id: otherMemberId,
              name: 'Contact',
              initials: 'C',
              accent: '#737373'
            };
            existingChat = {
              id: doc.id,
              user: contactUser,
              lastMessage: data.lastMessage || '',
              time: data.time || 'Now',
              streak: data.streak || 0,
              disappearsIn: data.disappearsIn || 24,
            };
          }
        });

        if (existingChat) {
          setActiveChat(existingChat);
          if (initialMessage) {
            // Write message to messages subcollection for existing chat
            await addDoc(collection(db, 'messages'), {
              chatId: existingChat.id,
              from: profile.id,
              text: initialMessage,
              time: 'Now',
              createdAt: new Date(),
            });
            await updateDoc(doc(db, 'chats', existingChat.id), {
              lastMessage: initialMessage,
              time: 'Just now',
              createdAt: new Date(),
            });
          }
        } else {
          // Fetch target user profile first
          const targetSnap = await getDoc(doc(db, 'users', targetUserId));
          if (targetSnap.exists()) {
            const targetData = targetSnap.data();
            const targetUser: UserProfile = {
              id: targetSnap.id,
              name: targetData.name || 'User',
              initials: targetData.initials || 'U',
              accent: targetData.accent || '#3b82f6',
            };
            
            // Create chat doc
            const newChatDoc = await addDoc(collection(db, 'chats'), {
              members: [profile.id, targetUserId],
              profiles: {
                [profile.id]: {
                  id: profile.id,
                  name: profile.name,
                  initials: profile.initials,
                  accent: profile.accent,
                },
                [targetUserId]: {
                  id: targetUser.id,
                  name: targetUser.name,
                  initials: targetUser.initials,
                  accent: targetUser.accent,
                },
              },
              lastMessage: initialMessage || '',
              time: 'Just now',
              streak: 1,
              disappearsIn: 24,
              createdAt: new Date(),
            });

            setActiveChat({
              id: newChatDoc.id,
              user: targetUser,
              lastMessage: initialMessage || '',
              time: 'Just now',
              streak: 1,
              disappearsIn: 24,
            });

            if (initialMessage) {
              await addDoc(collection(db, 'messages'), {
                chatId: newChatDoc.id,
                from: profile.id,
                text: initialMessage,
                time: 'Now',
                createdAt: new Date(),
              });
            }
          }
        }
        
        // Clear query parameters from URL without page reload
        window.history.replaceState({}, '', '/chats');
      } catch (e) {
        console.error("Error auto-starting chat:", e);
      }
    };

    startChat();
  }, [profile]);

  // 3. Subscribe to messages of active chat if opened
  useEffect(() => {
    if (!activeChat) return;

    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChat.id)
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
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date(0)),
        });
      });
      
      // Sort client-side to avoid requiring a Firestore composite index
      list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      setMessages(list);
    }, (error) => {
      console.error("Error loading chat messages:", error);
    });

    return () => unsub();
  }, [activeChat]);

  // Send Message
  const handleSendMessage = async (text: string, imageUrl?: string) => {
    if (!activeChat || !profile) return;

    try {
      // Add message doc
      await addDoc(collection(db, 'messages'), {
        chatId: activeChat.id,
        from: profile.id,
        text: text || '',
        imageUrl: imageUrl || null,
        time: 'Now',
        createdAt: new Date(),
      });

      // Update chat last message & time
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
    <div className="px-4 py-6 space-y-4 bg-black min-h-screen">
      <div className="flex items-center gap-2 mb-6 text-white bg-black">
        <MessageCircle size={24} className="text-purple-400" />
        <h2 className="font-bold text-xl tracking-tight">Your Chats</h2>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <MessageCircle size={40} className="text-gray-600" />
          <p className="text-gray-400 text-sm">No chats yet.</p>
          <p className="text-gray-600 text-xs max-w-[200px]">Start a conversation by replying to someone's Moment or tapping Chat on the map!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveChat(chat)}
              className="w-full flex items-center gap-4 rounded-2xl bg-[#161616] border border-white/5 p-4 hover:border-white/10 transition-all group text-left cursor-pointer"
            >
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner transition-transform group-hover:scale-105"
                  style={{ backgroundColor: chat.user.accent }}
                >
                  {chat.user.initials}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#161616]" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-white font-semibold text-[15px] truncate">{chat.user.name}</p>
                  <span className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{chat.time}</span>
                </div>
                <p className="text-gray-400 text-sm truncate">{chat.lastMessage}</p>
              </div>
              
              <div className="flex flex-col items-end gap-1">
                {chat.streak > 0 && (
                  <div className="flex items-center gap-1 text-orange-400 bg-orange-400/10 px-2 py-1 rounded-md">
                    <Flame size={14} className="fill-orange-400" />
                    <span className="text-xs font-bold">{chat.streak}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {activeChat && (
        <ChatOverlay
          chat={activeChat}
          messages={messages}
          currentUserId={profile?.id || ''}
          onBack={() => setActiveChat(null)}
          onSend={handleSendMessage}
        />
      )}
    </div>
  );
}
