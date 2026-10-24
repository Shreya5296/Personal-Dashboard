import React, { useEffect } from 'react';
import { MeetingLink, MeetingLinkInput } from './meetingLinkTypes';
import { MeetingLinkForm } from './MeetingLinkForm';
import { backdropStyle, dialogStyle } from '../finances/paymentModalStyles';

export interface MeetingLinkModalProps {
  isOpen: boolean;
  studentId?: string;
  initialLink?: MeetingLink | null;
  targetSlot?: 'primary' | 'secondary' | null;
  onSubmit: (input: MeetingLinkInput) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export const MeetingLinkModal: React.FC<MeetingLinkModalProps> = ({
  isOpen,
  studentId,
  initialLink,
  targetSlot,
  onSubmit,
  onClose,
  isLoading = false,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="meeting-link-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div style={{ ...dialogStyle, maxWidth: '560px' }}>
        <MeetingLinkForm
          studentId={studentId}
          initialLink={initialLink}
          targetSlot={targetSlot}
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
