import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Student, StudentInput } from './studentTypes';
import { fetchStudents, createStudent, updateStudent } from './studentApi';
import { StudentSearch } from './StudentSearch';
import { StudentList } from './StudentList';
import { StudentForm } from './StudentForm';
import { StudentProfilePage } from './StudentProfilePage';
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

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebouncedValue(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

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

  useEffect(() => {
    loadStudents();
  }, [debouncedQuery, statusFilter, token]);

  const handleFormSubmit = async (input: StudentInput) => {
    setFormLoading(true);
    try {
      if (editingStudent) {
        const updated = await updateStudent(editingStudent.student_id, input, token);
        if (selectedStudent) setSelectedStudent(updated);
      } else {
        await createStudent(input, token);
      }
      setIsCreating(false);
      setEditingStudent(null);
      await loadStudents();
    } finally {
      setFormLoading(false);
    }
  };

  if (selectedStudent && !editingStudent) {
    return (
      <StudentProfilePage
        student={selectedStudent}
        onBack={() => { setSelectedStudent(null); loadStudents(); }}
        onEdit={() => setEditingStudent(selectedStudent)}
        onUpdate={(updated) => setSelectedStudent(updated)}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Students Directory"
        subtitle="Manage registered learners, curriculum details, parent contacts, and fee profiles."
        actions={
          <Button variant="primary" onClick={() => setIsCreating(true)}>
            + Add Student
          </Button>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StudentSearch
          query={searchQuery}
          statusFilter={statusFilter}
          onQueryChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
        />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {students.length} student{students.length === 1 ? '' : 's'} found
        </span>
      </div>

      {(isCreating || editingStudent) && (
        <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-6)', boxShadow: 'var(--shadow-sm)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
            {editingStudent ? 'Edit Student Details' : 'New Student Registration'}
          </h3>
          <StudentForm
            initialStudent={editingStudent}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsCreating(false); setEditingStudent(null); }}
            isLoading={formLoading}
          />
        </div>
      )}

      {loading && <LoadingState message="Loading students…" />}
      {error && !loading && <ErrorState message={error} onRetry={loadStudents} />}
      {!loading && !error && (
        <StudentList
          students={students}
          onSelectStudent={setSelectedStudent}
          onEditStudent={setEditingStudent}
        />
      )}
    </div>
  );
};
