import { Timestamp } from 'firebase/firestore';
import { VipTier } from '../types';

export function formatBdt(amount: number): string {
  return `৳${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function formatTimestamp(value?: Timestamp | string | null): string {
  if (!value) return '—';
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function computeVipTier(rankPoints: number): VipTier {
  if (rankPoints >= 7500) return 'Grandmaster';
  if (rankPoints >= 3000) return 'Diamond';
  if (rankPoints >= 1000) return 'Gold';
  if (rankPoints >= 250) return 'Silver';
  return 'Bronze';
}

export function getNextVipThreshold(tier: VipTier): { next: VipTier | null; pointsNeeded: number } {
  switch (tier) {
    case 'Bronze':
      return { next: 'Silver', pointsNeeded: 250 };
    case 'Silver':
      return { next: 'Gold', pointsNeeded: 1000 };
    case 'Gold':
      return { next: 'Diamond', pointsNeeded: 3000 };
    case 'Diamond':
      return { next: 'Grandmaster', pointsNeeded: 7500 };
    case 'Grandmaster':
      return { next: null, pointsNeeded: 7500 };
  }
}

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase();
  return `${prefix}_${time}_${rand}`;
}

export function generateOrderCode(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const timePart = Date.now().toString().slice(-5);
  return `FFZ-${timePart}-${rand}`;
}

export function generateTicketCode(): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SUP-${rand}-${Date.now().toString().slice(-4)}`;
}

export function generateReferralCode(uid: string): string {
  const clean = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `FFZ${clean}${suffix}`.slice(0, 14);
}

export async function compressImageToDataUrl(file: File): Promise<string> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    throw new Error('Only JPG, PNG, or WebP screenshots are allowed.');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image file must be under 5 MB.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const maxWidth = 860;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.72;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);
        while (dataUrl.length > 360000 && quality > 0.3) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }
        if (dataUrl.length > 380000) {
          reject(new Error('Compressed screenshot is still too large. Please crop or choose a smaller image.'));
          return;
        }
        resolve(dataUrl);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function sanitizeId(input: string): string {
  return input.trim().replace(/[^a-zA-Z0-9_\-]/g, '');
}
