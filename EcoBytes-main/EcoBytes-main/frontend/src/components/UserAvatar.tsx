'use client';

import { useState } from 'react';
import { getAvatarUrl } from '@/lib/auth';

interface UserAvatarProps {
  name?: string | null;
  avatarUrl?: string | null;
  size?: number;
  rounded?: string;
  className?: string;
}

export default function UserAvatar({ name, avatarUrl, size = 36, rounded = 'rounded-full', className = '' }: UserAvatarProps) {
  const url = getAvatarUrl(avatarUrl);
  const initial = name?.charAt(0).toUpperCase() ?? '?';
  const [imgError, setImgError] = useState(false);

  if (url && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? 'Avatar'}
        width={size}
        height={size}
        className={`flex-shrink-0 object-cover ${rounded} ${className}`}
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-accent to-accent-hover font-semibold text-white select-none ${rounded} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
    >
      {initial}
    </div>
  );
}
