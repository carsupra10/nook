'use client';

import dynamic from 'next/dynamic';

const MapViewer = dynamic(() => import('@/components/map/MapViewer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#000000]">
      <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  ),
});

export default function NearbyPage() {
  return (
    <div className="absolute top-0 bottom-[96px] left-0 right-0 bg-[#000000]">
      <MapViewer />
    </div>
  );
}
