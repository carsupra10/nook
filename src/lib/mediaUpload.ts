'use client';

import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const MAX_SIZE_MB = 0.6;
const MAX_DIM = 1280;

function toBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
        width *= ratio;
        height *= ratio;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob as Blob),
        'image/jpeg',
        0.75
      );
    };
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

async function sizeGuard(blob: Blob): Promise<Blob> {
  if (blob.size <= MAX_SIZE_MB * 1024 * 1024) return blob;
  const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  const img = new window.Image();
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ratio = Math.min(MAX_DIM / img.width, MAX_DIM / img.height);
      canvas.width = Math.floor(img.width * ratio);
      canvas.height = Math.floor(img.height * ratio);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => (b ? resolve(b as Blob) : reject(new Error('compression failed'))),
        'image/jpeg',
        0.5
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function compressAndUpload(file: File, path: string): Promise<string> {
  const blob = await toBlob(file);
  const guarded = await sizeGuard(blob);
  const targetPath = `${path}.jpg`;
  const storageRef = ref(storage, `nook/${targetPath}`);
  await uploadBytes(storageRef, guarded, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
