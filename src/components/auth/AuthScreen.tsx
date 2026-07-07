'use client';

import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const ACCENTS = ['#3b82f6', '#8b5cf6', '#d97706', '#10b981', '#ec4899', '#f43f5e'];

export default function AuthScreen({ onAuth }: { onAuth: (user: User) => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        if (!name.trim() || !email || !password) {
          setError('All fields are required');
          setLoading(false);
          return;
        }

        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const initials = name.trim().substring(0, 2).toUpperCase();
        const accent = ACCENTS[Math.floor(Math.random() * ACCENTS.length)];

        // Create user document in Firestore
        await setDoc(doc(db, 'users', cred.user.uid), {
          id: cred.user.uid,
          name: name.trim(),
          initials,
          accent,
          email,
          pos: [37.7749, -122.4194], // SF default pos
          createdAt: serverTimestamp(),
        });

        onAuth(cred.user);
      } else {
        if (!email || !password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }

        const cred = await signInWithEmailAndPassword(auth, email, password);
        onAuth(cred.user);
      }
    } catch (e: any) {
      console.error('Auth error:', e);
      let errMsg = e?.message || 'Authentication failed';
      if (e?.code === 'auth/email-already-in-use') {
        errMsg = 'Email is already in use.';
      } else if (e?.code === 'auth/invalid-credential') {
        errMsg = 'Incorrect email or password.';
      } else if (e?.code === 'auth/weak-password') {
        errMsg = 'Password should be at least 6 characters.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-white/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-tight text-center">nook</h1>
        <p className="text-gray-500 text-sm mb-8 text-center">
          {isSignUp ? 'Create an account to get started' : 'Sign in to start connecting'}
        </p>

        {/* Tab Selector */}
        <div className="flex rounded-xl bg-[#161616] p-1.5 mb-6 border border-white/5">
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${!isSignUp ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError(''); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${isSignUp ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display Name"
              className="w-full rounded-xl border border-white/10 bg-[#161616]/50 px-5 py-4 text-white placeholder-gray-500 focus:border-white/20 focus:bg-[#161616] transition-all outline-none"
            />
          )}

          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/10 bg-[#161616]/50 px-5 py-4 text-white placeholder-gray-500 focus:border-white/20 focus:bg-[#161616] transition-all outline-none"
          />

          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-white/10 bg-[#161616]/50 px-5 py-4 text-white placeholder-gray-500 focus:border-white/20 focus:bg-[#161616] transition-all outline-none"
          />

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 animate-shake">
              <p className="text-red-400 text-xs font-medium leading-relaxed break-words text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white py-4 text-sm font-bold text-black transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center cursor-pointer shadow-[0_0_40px_rgba(255,255,255,0.1)]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
}
