'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useUser } from '@/context/UserContext';
import { UserProfile } from '@/types';

// Fix for default leaflet icons in Next.js
const iconRetinaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png';
const iconUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png';
const shadowUrl = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png';

if (typeof window !== 'undefined') {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl,
        iconUrl,
        shadowUrl,
    });
}

// Sub-component to center map dynamically when coordinates change
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

function createCustomIcon(user: UserProfile) {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div style="
        background-color: ${user.accent};
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        border: 3px solid #000;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      ">
        ${user.initials}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

interface MapUser {
  id: string;
  user: UserProfile;
  pos: [number, number];
}

interface MapViewerProps {
  currentUserId?: string;
  onStartChat: (user: UserProfile) => void;
}

export default function MapViewer({ currentUserId, onStartChat }: MapViewerProps) {
  const { profile } = useUser();
  const [locations, setLocations] = useState<MapUser[]>([]);

  // Subscribe to real-time user locations from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: MapUser[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.pos && Array.isArray(data.pos) && data.pos.length === 2) {
          list.push({
            id: doc.id,
            user: {
              id: doc.id,
              name: data.name || 'User',
              initials: data.initials || 'U',
              accent: data.accent || '#3b82f6',
            },
            pos: data.pos as [number, number],
          });
        }
      });
      setLocations(list);
    }, (error) => {
      console.error("Error listening to user locations:", error);
    });

    return () => unsub();
  }, []);

  // Default fallback center: San Francisco
  const defaultCenter: [number, number] = [37.7749, -122.4194];
  const mapCenter = profile?.pos || defaultCenter;

  return (
    <div className="w-full h-full relative bg-black">
      <MapContainer
        center={mapCenter}
        zoom={14}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#000' }}
        zoomControl={false}
      >
        {/* Recenter the map once user coordinates load */}
        {profile?.pos && <RecenterMap center={profile.pos} />}

        {/* Dark mode tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {locations.map((loc) => (
          <Marker key={loc.id} position={loc.pos} icon={createCustomIcon(loc.user)}>
            <Popup className="custom-popup">
              <div className="flex flex-col items-center gap-2 p-1">
                <span className="text-white font-bold text-sm">{loc.user.name}</span>
                {loc.id !== currentUserId && (
                  <button
                    onClick={() => onStartChat(loc.user)}
                    className="px-3 py-1 bg-white text-black text-xs font-bold rounded-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Chat
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <style jsx global>{`
        .leaflet-container {
          background: #000000 !important;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper, .leaflet-popup-tip {
          background: #161616;
          color: #f5f5f5;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .leaflet-popup-content {
          margin: 8px 12px;
        }
      `}</style>
    </div>
  );
}
