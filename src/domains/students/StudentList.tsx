import React from 'react';
import { Student } from './studentTypes';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatStatusBadge } from '../../lib/textFormat';
import { Button } from '../../components/buttons/Button';
import { EmptyState } from '../../components/feedback/EmptyState';

export interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onEditStudent,
}) => {
  if (students.length === 0) {
    return <EmptyState title="No students found" description="Try adjusting your search or filters." />;
  }

  const columns: Column<Student>[] = [
    {
      key: 'student_name',
      header: 'Student Name',
      render: (s) => (
        <button
          type="button"
          onClick={() => onSelectStudent(s)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'left',
            padding: 0,
          }}
        >
          {s.student_name || s.full_name}
        </button>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (s) => s.subject || '—',
    },
    {
      key: 'email',
      header: 'Email',
      render: (s) => s.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (s) => s.phone || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => {
        const badge = formatStatusBadge(s.status);
        return (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--font-size-xs)',
              fontWeight: 600,
              backgroundColor: badge.tone === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: badge.tone === 'success' ? 'var(--color-success-text)' : 'var(--color-danger-text)',
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
        <Button variant="outline" onClick={() => onEditStudent(s)}>
          Edit
        </Button>
      ),
    },
  ];

  return <DataTable columns={columns} data={students} keyExtractor={(s) => s.student_id} />;
};
