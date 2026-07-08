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
  requestLocation: () => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  firebaseUser: null,
  profile: null,
  loading: true,
  requestLocation: async () => {},
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

  // Fetch IP Location
  const fetchIPLocation = async (): Promise<[number, number]> => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('IP api request failed');
      const data = await res.json();
      if (data.latitude && data.longitude) {
        return [data.latitude, data.longitude];
      }
      throw new Error('No coordinates returned');
    } catch (e) {
      console.warn('IP-based geolocation failed, falling back to default:', e);
      // Fallback: Default to San Francisco coords
      return [37.7749, -122.4194];
    }
  };

  // Request Location Explicitly (GPS)
  const requestLocation = async () => {
    if (!firebaseUser) return;
    return new Promise<void>((resolve, reject) => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const userRef = doc(db, 'users', firebaseUser.uid);
              await setDoc(userRef, {
                pos: [latitude, longitude],
              }, { merge: true });
              resolve();
            } catch (e) {
              console.error('Failed to save geolocation to Firestore:', e);
              reject(e);
            }
          },
          async (err) => {
            console.warn('Geolocation permission denied, falling back to IP geolocation...');
            try {
              const ipCoords = await fetchIPLocation();
              const userRef = doc(db, 'users', firebaseUser.uid);
              await setDoc(userRef, {
                approxPos: ipCoords,
              }, { merge: true });
              resolve();
            } catch (ipErr) {
              console.error('IP fallback failed:', ipErr);
              reject(err);
            }
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        reject(new Error('Geolocation not supported by browser'));
      }
    });
  };

  // 2. Request Geolocation automatically on Login
  useEffect(() => {
    if (!firebaseUser) return;
    requestLocation().catch(async () => {
      // If prompt fails automatically (Safari gesture rule), immediately seed IP geolocation
      try {
        const ipCoords = await fetchIPLocation();
        const userRef = doc(db, 'users', firebaseUser.uid);
        await setDoc(userRef, {
          approxPos: ipCoords,
        }, { merge: true });
      } catch (e) {
        console.error('Error auto-seeding IP location:', e);
      }
    });
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
          approxPos: data.approxPos,
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
    <UserContext.Provider value={{ firebaseUser, profile, loading, requestLocation }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
