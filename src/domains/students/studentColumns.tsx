import { Student } from './studentTypes';
import { Column } from '../../components/tables/DataTable';
import { formatStatusBadge } from '../../lib/textFormat';
import { Button } from '../../components/buttons/Button';
import { StudentCell } from './StudentCell';

export interface StudentColumnHandlers {
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
}

export function getStudentColumns({ onSelectStudent, onEditStudent }: StudentColumnHandlers): Column<Student>[] {
  return [
    {
      key: 'student_name',
      header: 'Student',
      width: '24%',
      render: (s) => <StudentCell student={s} onSelect={onSelectStudent} />,
    },
    {
      key: 'subject',
      header: 'Subject',
      width: '18%',
      render: (s) => (
        <span
          title={s.subject || 'General'}
          style={{
            fontSize: 'var(--font-size-xs)',
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-bg-subtle)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border-subtle)',
            maxWidth: '150px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {s.subject || 'General'}
        </span>
      ),
    },
    {
      key: 'parent_contact',
      header: 'Parent Contact',
      width: '20%',
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
      width: '18%',
      render: (s) => (
        <span
          title={s.student_email || s.email || '—'}
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-muted)',
            maxWidth: '160px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'inline-block',
          }}
        >
          {s.student_email || s.email || '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '10%',
      render: (s) => {
        const badge = formatStatusBadge(s.status);
        const isSuccess = badge.tone === 'success';
        const isDanger = badge.tone === 'danger';
        const bg = isSuccess ? 'var(--color-success-bg)' : isDanger ? 'var(--color-danger-bg)' : 'var(--color-bg-subtle)';
        const color = isSuccess ? 'var(--color-success-text)' : isDanger ? 'var(--color-danger-text)' : 'var(--color-text-muted)';
        const border = isSuccess ? 'var(--color-success-border)' : isDanger ? 'var(--color-danger-border)' : 'var(--color-border)';

        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              backgroundColor: bg,
              color: color,
              border: `1px solid ${border}`,
              display: 'inline-block',
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
      width: '10%',
      render: (s) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
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
