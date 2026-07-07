import { useState } from 'react';
import { Heart, Flame, Coffee, Mountain, Flame as FlameIcon, Send } from 'lucide-react';
import { Moment, UserProfile } from '@/types';

interface MomentCardProps {
  moment: Moment;
  currentUserId?: string;
  onLike: (id: string) => void;
  onFlame: (id: string) => void;
  onStartChat: (user: UserProfile, initialMessage?: string) => void;
}

export default function MomentCard({ moment, currentUserId, onLike, onFlame, onStartChat }: MomentCardProps) {
  const [replyText, setReplyText] = useState('');

  // Map imageUrl to icon and colors
  let Icon = Coffee;
  let bgClass = 'bg-[#0f172a]'; // dark blue
  let iconClass = 'text-blue-400';
  let placeholderText = 'say something about the coffee...';

  // Support base64 image or predefined icons
  const isBase64Image = moment.imageUrl?.startsWith('data:image');

  if (moment.imageUrl === 'mountain') {
    Icon = Mountain;
    bgClass = 'bg-[#2e1065]'; // dark purple
    iconClass = 'text-purple-400';
    placeholderText = 'ask her which trail';
  } else if (moment.imageUrl === 'flame') {
    Icon = FlameIcon;
    bgClass = 'bg-[#451a03]'; // dark brown/orange
    iconClass = 'text-orange-400';
    placeholderText = 'offer to save the pasta';
  } else if (isBase64Image) {
    placeholderText = 'reply to this moment...';
  }

  const isLiked = currentUserId ? moment.likedBy?.includes(currentUserId) : false;
  const isFlameActive = currentUserId ? moment.reactedFlames?.includes(currentUserId) : false;

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onStartChat(moment.user, replyText.trim());
    setReplyText('');
  };

  return (
    <div className="flex flex-col gap-3 py-2 bg-black">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs"
          style={{ backgroundColor: moment.user.accent }}
        >
          {moment.user.initials}
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-[#f5f5f5] text-[15px] font-bold">{moment.user.name}</p>
          <p className="text-[#888888] text-sm">
            {moment.distance} · {moment.time}
          </p>
        </div>
      </div>

      {/* Media Box */}
      <div className={`relative w-full h-64 rounded-2xl flex items-center justify-center overflow-hidden ${bgClass}`}>
        <div className="absolute top-4 right-4 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md z-10">
          <span className={`text-xs font-semibold ${iconClass}`}>disappears in {moment.disappearsIn}h</span>
        </div>
        
        {isBase64Image ? (
          <img src={moment.imageUrl} alt="moment" className="w-full h-full object-cover" />
        ) : (
          <Icon size={48} className={iconClass} strokeWidth={2.5} />
        )}
      </div>

      {/* Caption */}
      <div className="text-[#f5f5f5] text-[15px] font-bold px-1">
        {moment.caption}
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={() => onLike(moment.id)}
          className={`flex items-center gap-2 px-4 py-2 bg-transparent border rounded-xl transition-all cursor-pointer ${
            isLiked ? 'border-red-500/30 bg-red-500/10 text-red-500' : 'border-[#333333] text-[#a3a3a3]'
          }`}
        >
          <Heart size={16} className={isLiked ? 'fill-red-500 text-red-500' : 'text-[#a3a3a3]'} />
          <span className={`text-sm font-semibold ${isLiked ? 'text-red-500' : 'text-[#f5f5f5]'}`}>{moment.hearts || 0}</span>
        </button>
        
        <button
          onClick={() => onFlame(moment.id)}
          className={`flex items-center gap-2 px-4 py-2 bg-transparent border rounded-xl transition-all cursor-pointer ${
            isFlameActive ? 'border-orange-500/30 bg-orange-500/10 text-orange-500' : 'border-[#333333] text-[#a3a3a3]'
          }`}
        >
          <Flame size={16} className={isFlameActive ? 'fill-orange-500 text-orange-500' : 'text-[#a3a3a3]'} />
          <span className={`text-sm font-semibold ${isFlameActive ? 'text-orange-500' : 'text-[#f5f5f5]'}`}>{moment.flames || 0}</span>
        </button>

        <form onSubmit={handleReplySubmit} className="flex-1 flex items-center gap-2 bg-transparent border border-[#333333] rounded-xl px-4 py-1.5 focus-within:border-white/20 transition-all">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={placeholderText}
            className="flex-1 bg-transparent text-sm text-[#f5f5f5] placeholder-[#737373] outline-none"
          />
          {replyText.trim() && (
            <button type="submit" className="text-white hover:scale-105 active:scale-95 transition-all">
              <Send size={14} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
