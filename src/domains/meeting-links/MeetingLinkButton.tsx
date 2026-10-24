import React, { useState } from 'react';
import { detectMeetingPlatform } from './platformDetector';

export interface MeetingLinkButtonProps {
  url?: string | null;
  onCopy?: (url: string) => void;
  isCopied?: boolean;
}

export const MeetingLinkButton: React.FC<MeetingLinkButtonProps> = ({
  url,
  onCopy,
  isCopied: parentCopied,
}) => {
  const [localCopied, setLocalCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const cleanUrl = (url || '').trim();
  if (!cleanUrl || cleanUrl === '-' || cleanUrl === '—') {
    return null;
  }

  const platformInfo = detectMeetingPlatform(cleanUrl);
  const platform = platformInfo?.platform || 'OTHER';

  const isCopied = parentCopied !== undefined ? parentCopied : localCopied;

  // Green for Google Meet, Blue for Zoom, Violet for Other
  const stylesByPlatform = {
    GOOGLE_MEET: {
      bg: isHovered ? '#d1fae5' : '#ecfdf5',
      color: '#065f46',
      border: isHovered ? '#059669' : '#a7f3d0',
    },
    ZOOM: {
      bg: isHovered ? '#dbeafe' : '#eff6ff',
      color: '#1d4ed8',
      border: isHovered ? '#2563eb' : '#bfdbfe',
    },
    OTHER: {
      bg: isHovered ? '#ede9fe' : '#f5f3ff',
      color: '#6d28d9',
      border: isHovered ? '#7c3aed' : '#ddd6fe',
    },
  }[platform];

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(cleanUrl).catch(() => {});
    }
    setLocalCopied(true);
    setTimeout(() => setLocalCopied(false), 2000);

    if (onCopy) {
      onCopy(cleanUrl);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={cleanUrl}
      aria-label={`Copy link: ${cleanUrl}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        fontFamily: 'monospace',
        backgroundColor: stylesByPlatform.bg,
        color: stylesByPlatform.color,
        border: `1px solid ${stylesByPlatform.border}`,
        padding: '5px 10px',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        transition: 'background-color 140ms ease, border-color 140ms ease, transform 100ms ease',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {isCopied ? '✓ Copied!' : cleanUrl}
      </span>
    </button>
  );
};
