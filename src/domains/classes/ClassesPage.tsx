import React, { useState } from 'react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { ClassSchedule } from './ClassSchedule';
import { ClassSessionForm } from './ClassSessionForm';
import { scheduleClass } from './classApi';
import { ClassSessionInput } from './classTypes';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/buttons/Button';

export const ClassesPage: React.FC = () => {
  usePageTitle('Class Schedule & Attendance');
  const { token } = useAuth();
  const [isScheduling, setIsScheduling] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
        <Button variant="primary" onClick={() => setIsScheduling(!isScheduling)}>
          {isScheduling ? 'Cancel' : '+ Schedule Class'}
        </Button>
      </div>

      {isScheduling && (
        <div style={{
          backgroundColor: 'var(--color-bg-surface)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-6)',
          marginBottom: 'var(--space-6)',
        }}>
          <h3 style={{ margin: '0 0 var(--space-4)' }}>Schedule New Class Session</h3>
          <ClassSessionForm
            studentId="stu_general"
            onSubmit={handleScheduleSubmit}
            onCancel={() => setIsScheduling(false)}
            isLoading={formLoading}
          />
        </div>
      )}

      <ClassSchedule key={refreshKey} />
    </div>
  );
};
