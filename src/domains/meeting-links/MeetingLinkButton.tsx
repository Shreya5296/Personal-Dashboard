import React, { useState } from 'react';
import { detectMeetingPlatform } from './platformDetector';

export interface MeetingLinkButtonProps {
  url?: string | null;
  onCopy?: (url: string) => void;
  onDelete?: () => void | Promise<void>;
  isCopied?: boolean;
  disabled?: boolean;
}

export const MeetingLinkButton: React.FC<MeetingLinkButtonProps> = ({
  url,
  onCopy,
  onDelete,
  isCopied: parentCopied,
  disabled = false,
}) => {
  const [localCopied, setLocalCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [touchOpen, setTouchOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const cleanUrl = (url || '').trim();
  if (!cleanUrl || cleanUrl === '-' || cleanUrl === '—') return null;

  const platformInfo = detectMeetingPlatform(cleanUrl);
  const platform = platformInfo?.platform || 'OTHER';
  const isCopied = parentCopied !== undefined ? parentCopied : localCopied;

  const stylesByPlatform = {
    GOOGLE_MEET: { bg: isHovered ? '#d1fae5' : '#ecfdf5', color: '#065f46', border: isHovered ? '#059669' : '#a7f3d0' },
    ZOOM: { bg: isHovered ? '#dbeafe' : '#eff6ff', color: '#1d4ed8', border: isHovered ? '#2563eb' : '#bfdbfe' },
    OTHER: { bg: isHovered ? '#ede9fe' : '#f5f3ff', color: '#6d28d9', border: isHovered ? '#7c3aed' : '#ddd6fe' },
  }[platform];

  const handleCopyClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator?.clipboard?.writeText) navigator.clipboard.writeText(cleanUrl).catch(() => {});
    setLocalCopied(true);
    setTimeout(() => setLocalCopied(false), 2000);
    if (onCopy) onCopy(cleanUrl);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isDeleting || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  const showActions = isHovered || isFocused || touchOpen || isDeleting;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
          setTouchOpen(false);
        }
      }}
      onClick={() => setTouchOpen((prev) => !prev)}
      title={cleanUrl}
      tabIndex={0}
      role="group"
      aria-label={`Meeting link for ${platform}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        fontFamily: 'monospace',
        backgroundColor: stylesByPlatform.bg,
        color: stylesByPlatform.color,
        border: `1px solid ${stylesByPlatform.border}`,
        padding: '4px 8px',
        borderRadius: 'var(--radius-md)',
        maxWidth: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        transition: 'background-color 140ms ease, border-color 140ms ease',
        cursor: 'default',
        position: 'relative',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: '1 1 auto' }}>
        {isCopied ? '✓ Copied!' : cleanUrl}
      </span>

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flexShrink: 0, opacity: showActions ? 1 : 0, pointerEvents: showActions ? 'auto' : 'none', transition: 'opacity 120ms ease' }}>
        <button
          type="button"
          onClick={handleCopyClick}
          aria-label="Copy meeting link"
          style={{ border: '1px solid currentColor', background: 'rgba(255, 255, 255, 0.8)', color: stylesByPlatform.color, borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', lineHeight: 1.2 }}
        >
          Copy
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={disabled || isDeleting}
            aria-label="Delete meeting link"
            style={{ border: '1px solid #f87171', background: 'rgba(254, 242, 242, 0.9)', color: '#dc2626', borderRadius: 'var(--radius-sm)', padding: '2px 6px', fontSize: '10px', fontWeight: 700, cursor: disabled || isDeleting ? 'not-allowed' : 'pointer', lineHeight: 1.2, opacity: disabled || isDeleting ? 0.6 : 1 }}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        )}
      </div>
    </div>
  );
};
