import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Student } from './studentTypes';
import { fetchStudents } from './studentApi';
import { StudentSearch } from './StudentSearch';
import { StudentList } from './StudentList';
import { EditStudentModal } from './EditStudentModal';
import { AddStudentModal } from './AddStudentModal';
import { StudentProfilePage } from './StudentProfilePage';
import { StudentRenewalModal } from '../packages/StudentRenewalModal';
import { RenewalResult } from '../packages/packageRenewalTypes';
import { LoadingState } from '../../components/feedback/LoadingState';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Button } from '../../components/buttons/Button';
import { PageHeader } from '../../layout/PageHeader';
import { StudentStatusTab } from './studentStatusClassifier';

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
  const [activeTab, setActiveTab] = useState<StudentStatusTab>('ACTIVE');
  const [displayedCount, setDisplayedCount] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [renewingStudent, setRenewingStudent] = useState<Student | null>(null);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      setStudents(await fetchStudents({ query: debouncedQuery }, token));
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStudents(); }, [debouncedQuery, token]);

  const handleStatusFilterChange = (val: string) => {
    setActiveTab(val === 'ACTIVE' ? 'ACTIVE' : val === 'INACTIVE' ? 'INACTIVE' : 'ALL');
  };

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

  const handleRenewalSuccess = async (_res: RenewalResult, msg: string) => {
    setIsRenewing(false);
    setRenewingStudent(null);
    setFeedback(msg);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setFeedback(null), 4000);
    await loadStudents();
    if (selectedStudent) {
      const refreshed = await fetchStudents({ query: selectedStudent.student_id }, token);
      if (refreshed.length > 0) setSelectedStudent(refreshed[0]);
    }
  };

  const banner = feedback && (
    <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--font-size-sm)' }}>
      ✓ {feedback}
    </div>
  );

  const closeRenewal = () => { setIsRenewing(false); setRenewingStudent(null); };

  if (selectedStudent) {
    return (
      <div>
        {banner}
        <StudentProfilePage student={selectedStudent} onBack={() => { setSelectedStudent(null); loadStudents(); }} onEdit={() => setEditingStudent(selectedStudent)} onRenew={() => { setRenewingStudent(selectedStudent); setIsRenewing(true); }} onUpdate={(u) => setSelectedStudent(u)} />
        {editingStudent && <EditStudentModal student={editingStudent} onSuccess={handleEditSuccess} onClose={() => setEditingStudent(null)} />}
        {isRenewing && <StudentRenewalModal initialStudent={renewingStudent} onSuccess={handleRenewalSuccess} onClose={closeRenewal} />}
      </div>
    );
  }

  const resultCount = displayedCount !== null ? displayedCount : students.length;
  const statusDropdownVal = activeTab === 'ACTIVE' ? 'ACTIVE' : activeTab === 'INACTIVE' ? 'INACTIVE' : '';

  return (
    <div>
      <PageHeader
        title="Students Directory"
        subtitle="Manage registered learners, curriculum details, parent contacts, and fee profiles."
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={() => { setRenewingStudent(null); setIsRenewing(true); }}>Renew Package</Button>
            <Button variant="primary" onClick={() => setIsCreating(true)}>+ Add Student</Button>
          </div>
        }
      />
      {banner}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <StudentSearch query={searchQuery} statusFilter={statusDropdownVal} onQueryChange={setSearchQuery} onStatusFilterChange={handleStatusFilterChange} />
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 500 }}>
          {resultCount} student{resultCount === 1 ? '' : 's'} found
        </span>
      </div>

      {isCreating && <AddStudentModal onSuccess={handleRegistrationSuccess} onClose={() => setIsCreating(false)} />}
      {editingStudent && <EditStudentModal student={editingStudent} onSuccess={handleEditSuccess} onClose={() => setEditingStudent(null)} />}
      {isRenewing && <StudentRenewalModal initialStudent={renewingStudent} onSuccess={handleRenewalSuccess} onClose={closeRenewal} />}

      {loading && <LoadingState message="Loading students…" />}
      {error && !loading && <ErrorState message={error} onRetry={loadStudents} />}
      {!loading && !error && (
        <StudentList
          key={refreshKey}
          students={students}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onDisplayedCountChange={setDisplayedCount}
          onSelectStudent={setSelectedStudent}
          onEditStudent={setEditingStudent}
          onRenewStudent={(s) => { setRenewingStudent(s); setIsRenewing(true); }}
        />
      )}
    </div>
  );
};
