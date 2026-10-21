import React from 'react';
import { Student } from './studentTypes';
import { formatStatusBadge } from '../../lib/textFormat';
import { formatDate } from '../../lib/dateFormat';
import { CurrencyCreditSummary } from '../fees/creditCalculator';
import { AvailableCreditBadge } from '../fees/AvailableCreditBadge';

export interface StudentSummaryProps {
  student: Student;
  credits?: CurrencyCreditSummary[];
}

export const StudentSummary: React.FC<StudentSummaryProps> = ({ student, credits }) => {
  const badge = formatStatusBadge(student.status);
  const name = student.student_name || student.full_name || 'Unnamed Student';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: 'var(--radius-xl)',
        padding: '1.5rem',
        marginBottom: 'var(--space-6)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-primary-bg)',
              color: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 700,
              border: '1px solid var(--color-primary-border)',
            }}
          >
            {initial}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--color-text-main)', letterSpacing: '-0.01em' }}>
              {name}
            </h2>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '2px', display: 'block' }}>
              Student ID: <code>{student.student_id}</code> • Registered {formatDate(student.created_at)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {credits && <AvailableCreditBadge summaries={credits} />}
          <span
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              backgroundColor: badge.tone === 'success' ? 'var(--color-success-bg)' : 'var(--color-bg-subtle)',
              color: badge.tone === 'success' ? 'var(--color-success-text)' : 'var(--color-text-muted)',
              border: `1px solid ${badge.tone === 'success' ? 'var(--color-success-border)' : 'var(--color-border)'}`,
            }}
          >
            {badge.label}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-border-subtle)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        <div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: '2px' }}>
            Subject / Curriculum
          </span>
          <strong style={{ color: 'var(--color-text-main)' }}>{student.subject || '—'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: '2px' }}>
            Student Email
          </span>
          <strong style={{ color: 'var(--color-text-main)' }}>{student.student_email || student.email || '—'}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: '2px' }}>
            Parent / Guardian
          </span>
          <strong style={{ color: 'var(--color-text-main)' }}>
            {student.parent_name || '—'} {student.parent_phone ? `(${student.parent_phone})` : ''}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: '2px' }}>
            Parent Email
          </span>
          <strong style={{ color: 'var(--color-text-main)' }}>{student.parent_email || '—'}</strong>
        </div>
      </div>
    </div>
  );
};
