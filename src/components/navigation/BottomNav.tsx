'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, MapPin, MessageCircle, User } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'moments', icon: Home },
    { href: '/nearby', label: 'nearby', icon: MapPin },
    { href: '/chats', label: 'chats', icon: MessageCircle },
    { href: '/profile', label: 'you', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#000000] pb-safe">
      <div className="mx-auto max-w-lg p-4">
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === '' && item.href === '/');
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-[20px] border border-[#333333] transition-colors ${
                  isActive 
                    ? 'bg-[#1e293b]/40 text-[#60a5fa] border-[#60a5fa]/20' 
                    : 'bg-transparent text-[#f5f5f5] hover:bg-[#2a2a2a]'
                }`}
              >
                <Icon size={20} strokeWidth={2} />
                <span className={`text-[11px] font-bold tracking-wide ${isActive ? 'text-[#60a5fa]' : 'text-[#f5f5f5]'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
