'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, writeBatch } from 'firebase/firestore';
import { User, LogOut, Settings, Image as ImageIcon, Flame, MapPin, X, Loader2, Trash2 } from 'lucide-react';
import { auth } from '@/lib/firebase';

const ACCENTS = ['#3b82f6', '#8b5cf6', '#d97706', '#10b981', '#ec4899', '#f43f5e'];

export default function ProfilePage() {
  const { profile, requestLocation } = useUser();
  const [momentsCount, setMomentsCount] = useState(0);
  const [chatsCount, setChatsCount] = useState(0);
  const [streaksCount, setStreaksCount] = useState(0);
  const [neighborsCount, setNeighborsCount] = useState(0);

  // Edit Profile States
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAccent, setEditAccent] = useState('');
  const [saving, setSaving] = useState(false);

  // 1. Fetch user stats from Firestore
  useEffect(() => {
    if (!profile || !profile.id) return;

    // Fetch moments count
    const qMoments = query(collection(db, 'moments'), where('user.id', '==', profile.id));
    getDocs(qMoments).then((snap) => setMomentsCount(snap.size)).catch(console.error);

    // Fetch chats & streaks
    const qChats = query(collection(db, 'chats'), where('members', 'array-contains', profile.id));
    getDocs(qChats).then((snap) => {
      setChatsCount(snap.size);
      let totalStreaks = 0;
      snap.forEach((doc) => {
        totalStreaks += doc.data().streak || 0;
      });
      setStreaksCount(totalStreaks);
    }).catch(console.error);

    // Fetch total neighbors count (other registered users)
    const qUsers = collection(db, 'users');
    getDocs(qUsers).then((snap) => {
      // Exclude current user
      setNeighborsCount(Math.max(0, snap.size - 1));
    }).catch(console.error);

  }, [profile]);

  // Open edit modal
  const handleOpenEdit = () => {
    if (!profile) return;
    setEditName(profile.name);
    setEditAccent(profile.accent);
    setIsEditing(true);
  };

  // Save profile edits
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.id || !editName.trim()) return;

    setSaving(true);
    const initials = editName.trim().substring(0, 2).toUpperCase();

    try {
      // 1. Update user document (using setDoc with merge: true in case the document doesn't exist yet)
      const userRef = doc(db, 'users', profile.id);
      await setDoc(userRef, {
        name: editName.trim(),
        initials,
        accent: editAccent,
      }, { merge: true });

      // 2. Update their moments in Firestore (batch update)
      const qMoments = query(collection(db, 'moments'), where('user.id', '==', profile.id));
      const momentSnaps = await getDocs(qMoments);
      const batch = writeBatch(db);
      
      momentSnaps.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          'user.name': editName.trim(),
          'user.initials': initials,
          'user.accent': editAccent,
        });
      });

      // 3. Update their chats in Firestore
      const qChats = query(collection(db, 'chats'), where('members', 'array-contains', profile.id));
      const chatSnaps = await getDocs(qChats);
      chatSnaps.forEach((docSnap) => {
        batch.update(docSnap.ref, {
          [`profiles.${profile.id}.name`]: editName.trim(),
          [`profiles.${profile.id}.initials`]: initials,
          [`profiles.${profile.id}.accent`]: editAccent,
        });
      });

      await batch.commit();
      setIsEditing(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  if (!profile) return null;

  return (
    <div className="px-4 py-6 space-y-6 bg-black min-h-screen">
      <div className="flex items-center gap-2 mb-2 text-white bg-black">
        <User size={24} className="text-green-400" />
        <h2 className="font-bold text-xl tracking-tight">Your Profile</h2>
      </div>

      <div className="flex items-center gap-5 p-6 rounded-3xl bg-[#161616] border border-white/5 shadow-xl relative overflow-hidden">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg relative z-10"
          style={{ backgroundColor: profile.accent }}
        >
          {profile.initials}
        </div>
        <div className="relative z-10">
          <h2 className="text-white font-bold text-2xl tracking-tight">{profile.name}</h2>
          <div className="flex items-center gap-1.5 mt-1 text-green-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]" />
            Online now
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-[#161616] border border-white/5 p-4 text-center flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors">
          <ImageIcon size={20} className="text-blue-400" />
          <div>
            <p className="text-white text-xl font-bold leading-none mb-1">{momentsCount}</p>
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Moments</p>
          </div>
        </div>
        <div className="rounded-2xl bg-[#161616] border border-white/5 p-4 text-center flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors">
          <Flame size={20} className="text-orange-400" />
          <div>
            <p className="text-white text-xl font-bold leading-none mb-1">{streaksCount}</p>
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Streaks</p>
          </div>
        </div>
        <div className="rounded-2xl bg-[#161616] border border-white/5 p-4 text-center flex flex-col items-center justify-center gap-2 hover:bg-white/5 transition-colors">
          <MapPin size={20} className="text-purple-400" />
          <div>
            <p className="text-white text-xl font-bold leading-none mb-1">{neighborsCount}</p>
            <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Neighbors</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4">
        <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest pl-1">Settings</h3>
        <button
          onClick={async () => {
            try {
              await requestLocation();
              alert("Precise GPS location successfully shared!");
            } catch (e) {
              alert("Could not enable GPS location. Please check browser permissions.");
            }
          }}
          className="w-full flex items-center justify-between rounded-2xl bg-[#161616] border border-white/5 px-5 py-4 text-white hover:bg-white/5 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <MapPin size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            <span className="font-medium text-[15px]">
              {profile.pos ? "📍 GPS Location Access: Allowed" : "📍 Enable Precise GPS Access"}
            </span>
          </div>
        </button>
        <button
          onClick={handleOpenEdit}
          className="w-full flex items-center justify-between rounded-2xl bg-[#161616] border border-white/5 px-5 py-4 text-white hover:bg-white/5 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-gray-400 group-hover:text-white transition-colors" />
            <span className="font-medium text-[15px]">Edit Profile</span>
          </div>
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-between rounded-2xl bg-red-500/10 border border-red-500/20 px-5 py-4 text-red-400 hover:bg-red-500/20 transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} />
            <span className="font-medium text-[15px]">Sign Out</span>
          </div>
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#161616] border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setIsEditing(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="text-white font-bold text-lg mb-4">Edit Profile</h3>
            
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div>
                <label className="text-xs text-gray-400 font-semibold mb-2 block">Display Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 text-white placeholder-gray-500 focus:border-white/20 focus:bg-black transition-all outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-semibold mb-3 block">Accent Color</label>
                <div className="flex gap-3 justify-center flex-wrap">
                  {ACCENTS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditAccent(color)}
                      className="w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95 border-2 relative"
                      style={{
                        backgroundColor: color,
                        borderColor: editAccent === color ? '#ffffff' : 'transparent',
                      }}
                    >
                      {editAccent === color && (
                        <span className="absolute inset-1 border border-black rounded-full pointer-events-none" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !editName.trim()}
                className="w-full rounded-xl bg-white py-3.5 text-sm font-bold text-black transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center cursor-pointer"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
