'use client';

import { useState } from 'react';
import { Heart, Flame, Coffee, Mountain, Flame as FlameIcon, Send } from 'lucide-react';
import { Moment, UserProfile } from '@/types';

interface MomentCardProps {
  moment: Moment;
  currentUserId?: string;
  onLike: (id: string) => void;
  onFlame: (id: string) => void;
  onStartChat: (user: UserProfile, initialMessage?: string) => void;
  onVote: (momentId: string, optionIdx: number) => void;
}

export default function MomentCard({ moment, currentUserId, onLike, onFlame, onStartChat, onVote }: MomentCardProps) {
  const [replyText, setReplyText] = useState('');

  // Map imageUrl to icon and colors
  let Icon = Coffee;
  let bgClass = 'bg-[#0f172a]'; // dark blue
  let iconClass = 'text-blue-400';
  let placeholderText = 'say something about the coffee...';

  // Predefined mockup icons vs real images
  const hasImage = !!moment.imageUrl;
  const isMockupIcon = moment.imageUrl === 'mountain' || moment.imageUrl === 'flame';
  
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
  } else if (hasImage) {
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

  const isAnon = !!moment.isAnonymous;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-3xl transition-all ${
      isAnon 
        ? 'bg-[#0e091b] border border-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.08)]' 
        : 'bg-[#000000] border border-white/5'
    }`}>
      
      {/* Header (Clickable to start chat only if not anonymous) */}
      <div 
        onClick={() => !isAnon && moment.user.id !== currentUserId && onStartChat(moment.user)}
        className={`flex items-center gap-3 ${(!isAnon && moment.user.id !== currentUserId) ? 'cursor-pointer group/header' : ''}`}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs transition-transform"
          style={{ backgroundColor: isAnon ? '#5b21b6' : moment.user.accent }}
        >
          {isAnon ? '🕵️' : moment.user.initials}
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-[#f5f5f5] text-[15px] font-bold group-hover/header:underline decoration-white/20">
            {isAnon ? 'Anonymous Confession' : moment.user.name}
          </p>
          <p className="text-[#888888] text-sm">
            {moment.distance} · {moment.time}
          </p>
        </div>
      </div>

      {/* Media Box (Only render if moment has an image or is a mockup icon) */}
      {hasImage && (
        <div className={`relative w-full h-64 rounded-2xl flex items-center justify-center overflow-hidden ${bgClass}`}>
          <div className="absolute top-4 right-4 bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-md z-10">
            <span className={`text-xs font-semibold ${iconClass}`}>disappears in {moment.disappearsIn}h</span>
          </div>
          
          {!isMockupIcon ? (
            <img src={moment.imageUrl!} alt="moment" className="w-full h-full object-cover" />
          ) : (
            <Icon size={48} className={iconClass} strokeWidth={2.5} />
          )}
        </div>
      )}

      {/* Poll Component */}
      {moment.poll && (
        <div className="mt-1 p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
          <p className="text-white font-semibold text-[15px]">{moment.poll.question}</p>
          <div className="space-y-2">
            {moment.poll.options.map((opt, idx) => {
              const totalVotes = moment.poll!.options.reduce((acc, o) => acc + (o.votes?.length || 0), 0);
              const optVotes = opt.votes?.length || 0;
              const percent = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
              const hasVoted = currentUserId ? moment.poll!.options.some(o => o.votes?.includes(currentUserId)) : false;
              const votedForThis = currentUserId ? opt.votes?.includes(currentUserId) : false;

              return (
                <button
                  key={idx}
                  disabled={!currentUserId || hasVoted}
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(moment.id, idx);
                  }}
                  className={`w-full relative overflow-hidden rounded-xl border p-3 flex items-center justify-between text-left transition-all cursor-pointer ${
                    votedForThis 
                      ? 'border-blue-500 bg-blue-500/10' 
                      : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Progress Bar Background fill */}
                  {hasVoted && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 bg-white/10 transition-all duration-500" 
                      style={{ width: `${percent}%` }}
                    />
                  )}
                  <span className="relative z-10 text-sm text-white font-medium flex items-center gap-2">
                    {opt.text}
                    {votedForThis && <span className="text-blue-400">✓</span>}
                  </span>
                  {hasVoted && (
                    <span className="relative z-10 text-xs font-bold text-gray-400">
                      {percent}% ({optVotes})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Caption */}
      <div className="text-[#f5f5f5] text-[15px] font-bold px-1 mt-1">
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
            <button type="submit" className="text-white hover:scale-105 active:scale-95 transition-all cursor-pointer">
              <Send size={14} />
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
