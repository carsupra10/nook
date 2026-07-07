import { useState, useEffect } from 'react';
import { UserProfile, Moment } from '@/types';
import { X } from 'lucide-react';

interface StoryViewerProps {
  user: UserProfile;
  moments: Moment[];
  onClose: () => void;
}

export default function StoryViewer({ user, moments, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const STORY_DURATION = 5000; // 5 seconds per story

  useEffect(() => {
    let startTime = Date.now();
    let animationFrameId: number;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const currentProgress = (elapsed / STORY_DURATION) * 100;
      
      if (currentProgress >= 100) {
        if (currentIndex < moments.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setProgress(0);
        } else {
          onClose();
        }
      } else {
        setProgress(currentProgress);
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [currentIndex, moments.length, onClose]);

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX } = e;
    const { innerWidth } = window;
    
    // Left 30% taps back, right 70% taps forward
    if (clientX < innerWidth * 0.3) {
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
        setProgress(0);
      }
    } else {
      if (currentIndex < moments.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setProgress(0);
      } else {
        onClose();
      }
    }
  };

  if (!moments.length) return null;

  const currentMoment = moments[currentIndex];

  // Helper to map mock image strings to colors
  let bgClass = 'bg-[#0f172a]';
  let iconClass = 'text-blue-400';
  if (currentMoment.imageUrl === 'mountain') {
    bgClass = 'bg-[#2e1065]';
    iconClass = 'text-purple-400';
  } else if (currentMoment.imageUrl === 'flame') {
    bgClass = 'bg-[#451a03]';
    iconClass = 'text-orange-400';
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col animate-fade-in">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 px-2 pt-2">
        {moments.map((_, idx) => (
          <div key={idx} className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ 
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
            style={{ borderColor: user.accent, color: user.accent, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 2 }}
          >
            {user.initials}
          </div>
          <span className="text-white font-bold text-sm">{user.name}</span>
          <span className="text-gray-400 text-xs">{currentMoment.time}</span>
        </div>
        <button onClick={onClose} className="p-2 text-white hover:bg-white/10 rounded-full">
          <X size={20} />
        </button>
      </div>

      {/* Tap Zones & Content */}
      <div className="flex-1 relative" onClick={handleTap}>
        <div className={`absolute inset-0 flex flex-col items-center justify-center p-8 ${bgClass}`}>
          {/* We reuse the generic icons for the mock images */}
          {currentMoment.imageUrl === 'coffee' && (
            <svg className={`w-32 h-32 mb-8 ${iconClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
            </svg>
          )}
          {currentMoment.imageUrl === 'mountain' && (
            <svg className={`w-32 h-32 mb-8 ${iconClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m8 3 4 8 5-5 5 15H2L8 3z"/>
            </svg>
          )}
          {currentMoment.imageUrl === 'flame' && (
            <svg className={`w-32 h-32 mb-8 ${iconClass}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c-2.28 0-3-4.5-3-4.5s2.29-.5 4.5.5c2.21 1 3 4.5 3 4.5A2.5 2.5 0 0 0 13 14.5c0 2.21-2.24 4.5-4.5 4.5S4 16.71 4 14.5c0-3.32 3-5.5 3-5.5s1 2.18 1.5 5.5z"/>
            </svg>
          )}
          
          <p className="text-white text-2xl font-bold text-center leading-tight">
            {currentMoment.caption}
          </p>
        </div>
      </div>
    </div>
  );
}
