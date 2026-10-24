import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ClassSchedule } from './ClassSchedule';
import { ClassSessionForm } from './ClassSessionForm';
import { scheduleClass } from './classApi';
import { ClassSessionInput } from './classTypes';
import { fetchStudents } from '../students/studentApi';
import { Student } from '../students/studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/buttons/Button';
import { PageHeader } from '../../layout/PageHeader';
import formStyles from '../../components/forms/forms.module.css';

export const ClassesPage: React.FC = () => {
  usePageTitle('Class Schedule & Attendance');
  const { token } = useAuth();
  const [isScheduling, setIsScheduling] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    fetchStudents({}, token).then(setStudents).catch(() => []);
  }, [token]);

  const handleScheduleSubmit = async (input: ClassSessionInput) => {
    setFormLoading(true);
    try {
      await scheduleClass(input, token);
      setIsScheduling(false);
      setRefreshKey((k) => k + 1);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Class Schedule & Attendance"
        subtitle="Manage upcoming live classes, launch meeting rooms, and record attendance with package credit deductions."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="secondary" onClick={() => setRefreshKey((k) => k + 1)} aria-label="Refresh classes">
              ↻ Refresh
            </Button>
            <Button variant="primary" onClick={() => setIsScheduling(!isScheduling)}>
              {isScheduling ? 'Cancel' : '+ Schedule Class'}
            </Button>
          </div>
        }
      />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
        backgroundColor: 'var(--color-bg-surface)',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: '1 1 300px' }}>
          <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)', whiteSpace: 'nowrap' }}>
            Filter by Student:
          </label>
          <select
            className={formStyles.select}
            style={{ maxWidth: '320px', paddingRight: '2.5rem' }}
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            aria-label="Filter schedule by student"
          >
            <option value="">All Students (Showing all classes)</option>
            {students.map((s) => (
              <option key={s.student_id} value={s.student_id}>
                {s.student_name || s.full_name} ({s.student_id})
              </option>
            ))}
          </select>
        </div>

        {selectedStudentId && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedStudentId('')}>
            ✕ Clear Filter
          </Button>
        )}
      </div>

      {isScheduling && (
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          marginBottom: 'var(--space-6)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
            Schedule New Class Session
          </h3>
          <ClassSessionForm
            onSubmit={handleScheduleSubmit}
            onCancel={() => setIsScheduling(false)}
            isLoading={formLoading}
          />
        </div>
      )}

      <ClassSchedule
        key={`${refreshKey}_${selectedStudentId}`}
        studentId={selectedStudentId || undefined}
        onRefreshTrigger={refreshKey}
      />
    </div>
  );
};
