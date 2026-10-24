import React, { useEffect } from 'react';
import { Student } from './studentTypes';
import { EditStudentForm } from './EditStudentForm';
import { backdropStyle, dialogStyle, headerStyle, closeButtonStyle } from '../finances/paymentModalStyles';

export interface EditStudentModalProps {
  student: Student;
  onSuccess: (updated: Student, message: string) => Promise<void>;
  onClose: () => void;
}

export const EditStudentModal: React.FC<EditStudentModalProps> = ({
  student,
  onSuccess,
  onClose,
}) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      style={backdropStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-student-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          ...dialogStyle,
          maxWidth: '720px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        <div style={{ ...headerStyle, padding: '1.25rem 1.5rem', margin: 0, borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h3 id="edit-student-title" style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
              Edit Student Details
            </h3>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              {student.student_name || student.full_name} ({student.student_id})
            </span>
          </div>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1 }}>
          <EditStudentForm
            student={student}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};
