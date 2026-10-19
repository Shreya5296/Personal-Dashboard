import React from 'react';
import { Student } from './studentTypes';
import { formatStatusBadge } from '../../lib/textFormat';
import { formatDate } from '../../lib/dateFormat';

export interface StudentSummaryProps {
  student: Student;
}

export const StudentSummary: React.FC<StudentSummaryProps> = ({ student }) => {
  const badge = formatStatusBadge(student.status);

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-surface)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-6)',
      marginBottom: 'var(--space-6)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
            {student.full_name}
          </h2>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            ID: {student.student_id} • Registered: {formatDate(student.created_at)}
          </span>
        </div>
        <span style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 600,
          backgroundColor: badge.tone === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: badge.tone === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
        }}>
          {badge.label}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
        <div>
          <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Email</span>
          <strong>{student.email || '—'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Phone</span>
          <strong>{student.phone || '—'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)', display: 'block' }}>Parent</span>
          <strong>{student.parent_name || '—'} ({student.parent_phone || '—'})</strong>
        </div>
      </div>
    </div>
  );
};
