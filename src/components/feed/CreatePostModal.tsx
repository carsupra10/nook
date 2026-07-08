'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ImageIcon, Camera, Send, Aperture } from 'lucide-react';

interface CreatePostModalProps {
  onClose: () => void;
  onSubmit: (
    text: string,
    imageUrl?: string,
    isAnonymous?: boolean,
    poll?: { question: string; options: { text: string; votes: string[] }[] }
  ) => void;
  user: { name: string; initials: string; accent: string };
}

// Compress and resize image using Canvas to keep size under 600kb
const compressImage = (file: File | Blob, maxWidth = 800, maxHeight = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function CreatePostModal({ onClose, onSubmit, user }: CreatePostModalProps) {
  const [text, setText] = useState('');
  const [localImage, setLocalImage] = useState<string | null>(null);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showPollBuilder, setShowPollBuilder] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraMode(true);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraMode(false);
  };

  const takePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    let width = videoRef.current.videoWidth;
    let height = videoRef.current.videoHeight;
    const maxWidth = 800;
    const maxHeight = 800;

    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      setLocalImage(dataUrl);
      stopCamera();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await compressImage(file);
      setLocalImage(base64);
    } catch (err) {
      console.error("Error compressing image file:", err);
    }
  };

  const handleSubmit = () => {
    const hasText = !!text.trim();
    const hasPoll = showPollBuilder && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2;
    if (!hasText && !localImage && !hasPoll) return;

    const pollData = hasPoll ? {
      question: pollQuestion.trim(),
      options: pollOptions.filter(o => o.trim()).map(o => ({
        text: o.trim(),
        votes: []
      }))
    } : undefined;

    onSubmit(text, localImage || undefined, isAnonymous, pollData);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-[#000000]/90 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in p-4 pb-safe">
      <div className="w-full max-w-lg bg-[#1a1a1a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-slide-up relative">
        
        {isCameraMode ? (
          <div className="w-full h-[60vh] bg-black relative flex flex-col items-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <button onClick={stopCamera} className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full">
              <X size={24} />
            </button>
            <button 
              onClick={takePhoto}
              className="absolute bottom-8 p-4 bg-white text-black rounded-full shadow-lg"
            >
              <Aperture size={32} />
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: isAnonymous ? '#5b21b6' : user.accent }}
                >
                  {isAnonymous ? '🕵️' : user.initials}
                </div>
                <span className="text-white font-medium">
                  {isAnonymous ? 'Anonymous Confession' : 'New Moment'}
                </span>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 max-h-[50vh] overflow-y-auto">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={isAnonymous ? "Share a secret anonymously..." : "What's happening nearby?"}
                className="w-full bg-transparent text-white text-lg placeholder-gray-500 resize-none focus:outline-none min-h-[100px]"
              />
              
              {localImage && (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10">
                  <img src={localImage} alt="Upload preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setLocalImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Poll Builder UI */}
              {showPollBuilder && (
                <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Create a Poll</span>
                    <button 
                      onClick={() => {
                        setShowPollBuilder(false);
                        setPollQuestion('');
                        setPollOptions(['', '']);
                      }}
                      className="text-xs text-gray-500 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Ask a question..."
                    className="w-full bg-white/10 border border-transparent rounded-xl px-3 py-2 text-white text-sm focus:border-white/20 focus:outline-none placeholder-gray-500"
                  />
                  <div className="space-y-2">
                    {pollOptions.map((opt, idx) => (
                      <input
                        key={idx}
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...pollOptions];
                          newOpts[idx] = e.target.value;
                          setPollOptions(newOpts);
                        }}
                        placeholder={`Option ${idx + 1}`}
                        className="w-full bg-transparent border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-white/20 focus:outline-none placeholder-gray-500"
                      />
                    ))}
                  </div>
                  {pollOptions.length < 4 && (
                    <button
                      onClick={() => setPollOptions([...pollOptions, ''])}
                      className="text-xs text-blue-400 hover:underline pl-1 cursor-pointer"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Toggle Actions Area */}
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 bg-[#1e1e1e]/30">
              <label className="flex items-center gap-2.5 text-sm text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-white/20 bg-transparent text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span className={isAnonymous ? 'text-purple-400 font-semibold' : ''}>🕵️ Anonymous Confession</span>
              </label>
              <button
                onClick={() => setShowPollBuilder(!showPollBuilder)}
                className={`text-xs px-3 py-1.5 border rounded-lg transition-all cursor-pointer ${
                  showPollBuilder ? 'border-blue-500/50 text-blue-400 bg-blue-500/10 font-bold' : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                📊 {showPollBuilder ? 'Remove Poll' : 'Add Poll'}
              </button>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between p-4 border-t border-white/5 bg-white/5">
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFilePick}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                >
                  <ImageIcon size={20} />
                  <span className="text-sm font-medium hidden sm:inline">Photo</span>
                </button>
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10"
                >
                  <Camera size={20} />
                  <span className="text-sm font-medium hidden sm:inline">Camera</span>
                </button>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!text.trim() && !localImage && !(showPollBuilder && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
              >
                Post <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
