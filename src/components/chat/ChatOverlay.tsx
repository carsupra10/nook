import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Flame, Camera, Send } from 'lucide-react';
import { Chat, Message } from '@/types';

interface ChatOverlayProps {
  chat: Chat;
  messages: Message[];
  onBack: () => void;
  onSend: (text: string, imageUrl?: string) => Promise<void>;
}

export default function ChatOverlay({ chat, messages, onBack, onSend }: ChatOverlayProps) {
  const [input, setInput] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = URL.createObjectURL(file); // Mock for now
    setPendingImage(url);
    setUploading(false);
  };

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return;
    setUploading(true);
    await onSend(input, pendingImage || undefined);
    setInput('');
    setPendingImage(null);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-3 border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors text-white">
          <ArrowLeft size={24} />
        </button>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner"
          style={{ backgroundColor: chat.user.accent }}
        >
          {chat.user.initials}
        </div>
        <div>
          <p className="text-white font-bold tracking-tight">{chat.user.name}</p>
          <div className="flex items-center gap-1 text-orange-400 text-xs font-semibold">
            <Flame size={12} className="fill-orange-400" />
            <span>{chat.streak} day streak</span>
          </div>
        </div>
      </div>

      {/* Disappearing notice */}
      <div className="px-4 py-2.5 bg-white/5 border-b border-white/5 flex items-center justify-center gap-2 text-[11px] font-medium text-gray-400 uppercase tracking-wider backdrop-blur-sm">
        Disappears in {chat.disappearsIn}h
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.from === 'you' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2.5 ${
                msg.from === 'you'
                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-sm'
                  : 'bg-[#1a1a1a] text-white rounded-2xl rounded-bl-sm border border-white/5'
              } shadow-sm`}
            >
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="attachment" className="rounded-xl mb-2 max-h-64 object-cover w-full" />
              )}
              {msg.text && (
                <p className="text-[15px] leading-relaxed">{msg.text}</p>
              )}
              <p className={`text-[10px] mt-1 text-right ${msg.from === 'you' ? 'text-blue-200' : 'text-gray-500'}`}>
                {msg.time}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-safe-bottom pt-2 bg-black/90 backdrop-blur-md border-t border-white/10">
        {pendingImage && (
          <div className="px-1 pb-3 relative">
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/10 relative group">
              <img src={pendingImage} alt="pending" className="w-full h-full object-cover" />
              <button 
                onClick={() => setPendingImage(null)}
                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 pb-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFilePick}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="p-3 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10 disabled:opacity-50"
          >
            <Camera size={22} />
          </button>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={uploading ? 'Uploading...' : 'Message...'}
            disabled={uploading}
            className="flex-1 rounded-full bg-white/10 border border-transparent px-5 py-3 text-white text-[15px] placeholder-gray-500 focus:border-white/20 focus:bg-white/5 focus:outline-none disabled:opacity-50 transition-all shadow-inner"
          />
          <button
            onClick={handleSend}
            disabled={uploading || (!input.trim() && !pendingImage)}
            className="p-3 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100 flex items-center justify-center"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
