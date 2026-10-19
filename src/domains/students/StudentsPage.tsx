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
        await updateStudent(editingStudent.student_id, input, token);
      } else {
        await createStudent(input, token);
      }
      setIsCreating(false);
      setEditingStudent(null);
      await loadStudents();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save student');
    } finally {
      setFormLoading(false);
    }
  };

  if (selectedStudent) {
    return (
      <StudentProfilePage
        student={selectedStudent}
        onBack={() => {
          setSelectedStudent(null);
          loadStudents();
        }}
        onEdit={() => setEditingStudent(selectedStudent)}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <StudentSearch
          query={searchQuery}
          statusFilter={statusFilter}
          onQueryChange={setSearchQuery}
          onStatusFilterChange={setStatusFilter}
        />
        <Button variant="primary" onClick={() => setIsCreating(true)}>
          + Add Student
        </Button>
      </div>

      {(isCreating || editingStudent) && (
        <div style={{ backgroundColor: 'var(--color-bg-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-6)' }}>
          <h3 style={{ margin: '0 0 var(--space-4)' }}>{editingStudent ? 'Edit Student' : 'New Student Registration'}</h3>
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
