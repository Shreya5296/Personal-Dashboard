import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Student } from './studentTypes';
import { fetchStudents } from './studentApi';
import { StudentSearch } from './StudentSearch';
import { StudentList } from './StudentList';
import { EditStudentForm } from './EditStudentForm';
import { StudentRegistrationForm } from './StudentRegistrationForm';
import { StudentProfilePage } from './StudentProfilePage';
import { AutoScheduleModal } from '../classes/AutoScheduleModal';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/buttons/Button';
import { PageHeader } from '../../layout/PageHeader';

export const StudentsPage: React.FC = () => {
  usePageTitle('Students Directory');
  const { token } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [autoScheduleStudent, setAutoScheduleStudent] = useState<Student | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudents({ query: debouncedQuery, status: statusFilter }, token);
      setStudents(data);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, [debouncedQuery, statusFilter, token]);

  const handleEditSuccess = async (updated: Student, msg: string) => {
    if (selectedStudent) setSelectedStudent(updated);
    setEditingStudent(null);
    setFeedback(msg || 'Student details saved successfully');
    setRefreshKey((k) => k + 1);
    setTimeout(() => setFeedback(null), 4000);
    await loadStudents();
  };

  const handleRegistrationSuccess = async (_s: Student, msg: string) => {
    setIsCreating(false);
    setFeedback(msg);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setFeedback(null), 4000);
    await loadStudents();
  };

  const handleAutoScheduleSuccess = async (cnt: number) => {
    setFeedback(`Successfully generated and scheduled ${cnt} class session(s).`);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setFeedback(null), 4000);
    await loadStudents();
  };

  if (selectedStudent && !editingStudent) {
    return (
      <div>
        {feedback && (
          <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
            ✓ {feedback}
          </div>
        )}
        <StudentProfilePage
          student={selectedStudent}
          onBack={() => { setSelectedStudent(null); loadStudents(); }}
          onEdit={() => setEditingStudent(selectedStudent)}
          onUpdate={(updated) => setSelectedStudent(updated)}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Students Directory"
        subtitle="Manage registered learners, curriculum details, parent contacts, and fee profiles."
        actions={<Button variant="primary" onClick={() => setIsCreating(true)}>+ Add Student</Button>}
      />

      {feedback && (
        <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
          ✓ {feedback}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StudentSearch query={searchQuery} statusFilter={statusFilter} onQueryChange={setSearchQuery} onStatusFilterChange={setStatusFilter} />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {students.length} student{students.length === 1 ? '' : 's'} found
        </span>
      </div>

      {isCreating && (
        <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>New Student Registration</h3>
          <StudentRegistrationForm onSuccess={handleRegistrationSuccess} onCancel={() => setIsCreating(false)} />
        </div>
      )}

      {editingStudent && (
        <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Edit Student Details</h3>
          <EditStudentForm student={editingStudent} onSuccess={handleEditSuccess} onCancel={() => setEditingStudent(null)} />
        </div>
      )}

      {autoScheduleStudent && (
        <AutoScheduleModal
          student={autoScheduleStudent}
          onClose={() => setAutoScheduleStudent(null)}
          onSuccess={handleAutoScheduleSuccess}
        />
      )}

      {loading && <LoadingState message="Loading students…" />}
      {error && !loading && <ErrorState message={error} onRetry={loadStudents} />}
      {!loading && !error && (
        <StudentList
          key={refreshKey}
          students={students}
          onSelectStudent={setSelectedStudent}
          onEditStudent={setEditingStudent}
          onAutoSchedule={setAutoScheduleStudent}
        />
      )}
    </div>
  );
};