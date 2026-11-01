import React from 'react';

interface CaptainAvatarProps {
  captainId: number;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const QUADRANT_POSITIONS: Record<number, string> = {
  0: '4% 4%',     // Top-Left: Cap. Jack (Red Tricorn Hat)
  1: '96% 4%',    // Top-Right: Anne Bonny (Blue Bandana & Parrot)
  2: '4% 96%',    // Bottom-Left: Barbe-Verte (Emerald Ghost Pirate)
  3: '96% 96%',   // Bottom-Right: Barbe-Noire (Black & Gold Hat)
};

export const CaptainAvatar: React.FC<CaptainAvatarProps> = ({
  captainId,
  color,
  size = 'sm',
}) => {
  const dimClass =
    size === 'lg'
      ? 'w-12 h-12 rounded-xl border-2'
      : size === 'md'
      ? 'w-9 h-9 rounded-lg border-2'
      : 'w-7 h-7 rounded-lg border-2';

  const bgPosition = QUADRANT_POSITIONS[captainId % 4] ?? '4% 4%';

  return (
    <div
      className={`${dimClass} shrink-0 overflow-hidden relative bg-amber-950`}
      style={{
        borderColor: color,
        boxShadow: `0 2px 6px rgba(0,0,0,0.6), 0 0 8px ${color}66`,
        backgroundImage: 'url(./assets/captains_sheet.jpg)',
        backgroundSize: '215% 215%',
        backgroundPosition: bgPosition,
        backgroundRepeat: 'no-repeat',
      }}
    />
  );
};
