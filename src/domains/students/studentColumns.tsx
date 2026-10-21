import { Student } from './studentTypes';
import { Column } from '../../components/tables/DataTable';
import { formatStatusBadge } from '../../lib/textFormat';
import { Button } from '../../components/buttons/Button';

export interface StudentColumnHandlers {
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
}

export function getStudentColumns({ onSelectStudent, onEditStudent }: StudentColumnHandlers): Column<Student>[] {
  return [
    {
      key: 'student_name',
      header: 'Student',
      render: (s) => {
        const name = s.student_name || s.full_name || 'Unnamed Student';
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
                onClick={() => onSelectStudent(s)}
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
              <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', display: 'block' }}>
                {s.student_id}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (s) => (
        <span
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-subtle)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border-subtle)',
          }}
        >
          {s.subject || 'General'}
        </span>
      ),
    },
    {
      key: 'parent_contact',
      header: 'Parent Contact',
      render: (s) => (
        <div>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', display: 'block' }}>
            {s.parent_name || '—'}
          </span>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            {s.parent_phone || s.phone || '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'student_email',
      header: 'Student Email',
      render: (s) => (
        <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          {s.student_email || s.email || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const badge = formatStatusBadge(s.status);
        const isSuccess = badge.tone === 'success';
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              backgroundColor: isSuccess ? 'var(--color-success-bg)' : 'var(--color-bg-subtle)',
              color: isSuccess ? 'var(--color-success-text)' : 'var(--color-text-muted)',
              border: `1px solid ${isSuccess ? 'var(--color-success-border)' : 'var(--color-border)'}`,
            }}
          >
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (s) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="sm" onClick={() => onSelectStudent(s)}>
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEditStudent(s)}>
            Edit
          </Button>
        </div>
      ),
    },
  ];
}
