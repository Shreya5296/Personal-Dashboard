import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Enrollment, EnrollmentInput } from './enrollmentTypes';
import { fetchEnrollments, createEnrollment } from './enrollmentApi';
import { EnrollmentForm } from './EnrollmentForm';
import { DataTable, Column } from '../../components/tables/DataTable';
import { formatStatusBadge } from '../../lib/textFormat';
import { formatDate } from '../../lib/dateFormat';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { EmptyState } from '../../components/feedback/EmptyState';

export const EnrollmentList: React.FC<{ studentId: string }> = ({ studentId }) => {
  const { token } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchEnrollments(studentId, token);
      setEnrollments(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId, token]);

  const handleCreate = async (input: EnrollmentInput) => {
    setFormLoading(true);
    try {
      await createEnrollment(input, token);
      setIsAdding(false);
      await loadData();
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<Enrollment>[] = [
    { key: 'course_name', header: 'Course / Subject' },
    { key: 'level_or_grade', header: 'Level', render: (e) => e.level_or_grade || '—' },
    { key: 'start_date', header: 'Start Date', render: (e) => formatDate(e.start_date) },
    {
      key: 'status',
      header: 'Status',
      render: (e) => {
        const badge = formatStatusBadge(e.status);
        return (
          <span style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            backgroundColor: badge.tone === 'success' ? 'var(--color-success-bg)' : 'var(--color-bg-subtle)',
            color: badge.tone === 'success' ? 'var(--color-success-text)' : 'var(--color-text-main)',
          }}>
            {badge.label}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <h4 style={{ margin: 0 }}>Enrollment Periods</h4>
        <Button variant="secondary" onClick={() => setIsAdding(!isAdding)}>
          {isAdding ? 'Cancel' : '+ New Enrollment'}
        </Button>
      </div>

      {isAdding && (
        <div style={{ padding: 'var(--space-4)', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
          <EnrollmentForm studentId={studentId} onSubmit={handleCreate} onCancel={() => setIsAdding(false)} isLoading={formLoading} />
        </div>
      )}

      {loading && <LoadingState message="Loading enrollments…" />}
      {!loading && enrollments.length === 0 && <EmptyState title="No enrollments" description="This student has no active or past enrollments." />}
      {!loading && enrollments.length > 0 && <DataTable columns={columns} data={enrollments} keyExtractor={(e) => e.enrollment_id} />}
    </div>
  );
};
