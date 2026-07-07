'use client';

import { useState, useEffect } from 'react';
import { Bell, Trash2 } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function TopHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [notifications, setNotifications] = useState<{ id: number; text: string; time: string }[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setUserCount(snap.size);
    }, (error) => {
      console.error("Error listening to users for count:", error);
    });
    return () => unsub();
  }, []);

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="flex items-center justify-between px-5 pt-12 pb-4 sticky top-0 z-[9999] bg-[#000000] border-b border-white/5 relative">
      <div>
        <h1 className="text-[22px] font-bold text-white tracking-tight leading-none mb-1">nook</h1>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
          {userCount} {userCount === 1 ? 'user' : 'users'} nearby
        </p>
      </div>
      
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-[#888888] hover:text-white transition-colors p-2 -mr-2 relative cursor-pointer"
        >
          <Bell size={20} strokeWidth={2} />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </button>

        {/* Notification Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-3 w-80 bg-[#161616] border border-white/10 rounded-2xl shadow-2xl p-4 z-[10000] animate-slide-up">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
              <span className="text-white font-bold text-sm">Notifications</span>
              {notifications.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer font-semibold"
                >
                  <Trash2 size={12} /> Clear all
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-6">No new notifications</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="flex flex-col gap-0.5">
                    <p className="text-white text-xs leading-relaxed">{notif.text}</p>
                    <span className="text-[10px] text-gray-500 font-medium">{notif.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
