'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { UserProfile } from '@/types';

interface UserContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  firebaseUser: null,
  profile: null,
  loading: true,
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Listen to Auth State
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Request Geolocation and Save to Firestore
  useEffect(() => {
    if (!firebaseUser) return;

    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const userRef = doc(db, 'users', firebaseUser.uid);
            await setDoc(userRef, {
              pos: [latitude, longitude],
            }, { merge: true });
          } catch (e) {
            console.error('Failed to save geolocation to Firestore:', e);
          }
        },
        (err) => {
          console.error('Geolocation permission denied or error:', err);
        },
        { enableHighAccuracy: true }
      );
    }
  }, [firebaseUser]);

  // 3. Listen to Firestore Profile Document
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          id: docSnap.id,
          name: data.name || 'Anonymous User',
          initials: data.initials || 'AU',
          accent: data.accent || '#3b82f6',
          pos: data.pos,
        });
      } else {
        // Fallback user profile if not in firestore yet
        setProfile({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Anonymous User',
          initials: (firebaseUser.displayName || 'AU').substring(0, 2).toUpperCase(),
          accent: '#3b82f6',
        });
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching user profile:', error);
      setLoading(false);
    });

    return () => unsubProfile();
  }, [firebaseUser]);

  return (
    <UserContext.Provider value={{ firebaseUser, profile, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
