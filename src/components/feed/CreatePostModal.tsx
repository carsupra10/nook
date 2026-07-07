import { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Send, Camera, Aperture } from 'lucide-react';

interface CreatePostModalProps {
  onClose: () => void;
  onSubmit: (text: string, imageUrl?: string) => void;
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
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    if (!text.trim() && !localImage) return;
    onSubmit(text, localImage || undefined);
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
                  style={{ backgroundColor: user.accent }}
                >
                  {user.initials}
                </div>
                <span className="text-white font-medium">New Moment</span>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4">
              <textarea
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's happening nearby?"
                className="w-full bg-transparent text-white text-lg placeholder-gray-500 resize-none focus:outline-none min-h-[120px]"
              />
              
              {localImage && (
                <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-4 border border-white/10">
                  <img src={localImage} alt="Upload preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setLocalImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
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
                disabled={!text.trim() && !localImage}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
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
