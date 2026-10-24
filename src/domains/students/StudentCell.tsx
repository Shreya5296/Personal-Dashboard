import React from 'react';
import { Student } from './studentTypes';

export interface StudentCellProps {
  student: Student;
  onSelect: (student: Student) => void;
}

export const StudentCell: React.FC<StudentCellProps> = ({ student, onSelect }) => {
  const name = student.student_name || student.full_name || 'Unnamed Student';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--color-primary-bg)',
          color: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--font-size-xs)',
          fontWeight: 700,
          border: '1px solid var(--color-primary-border)',
          flexShrink: 0,
        }}
      >
        {initial}
      </div>
      <div>
        <button
          type="button"
          onClick={() => onSelect(student)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontWeight: 600,
            fontSize: 'var(--font-size-sm)',
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
          }}
        >
          {name}
        </button>
        <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', display: 'block', fontFamily: 'monospace' }}>
          {student.student_id}
        </span>
      </div>
    </div>
  );
};
