import React from 'react';
import { PlatformInfo } from './platformDetector';

export interface MeetingPlatformBadgeProps {
  info: PlatformInfo;
}

export const MeetingPlatformBadge: React.FC<MeetingPlatformBadgeProps> = ({ info }) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 600,
        backgroundColor: info.badgeBg,
        color: info.badgeText,
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        border: `1px solid ${info.dotColor}30`,
        lineHeight: 1.4,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: info.dotColor,
          flexShrink: 0,
        }}
      />
      <span>{info.label}</span>
    </span>
  );
};
