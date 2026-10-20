import React, { useState } from 'react';
import { Student } from './studentTypes';
import { StudentSummary } from './StudentSummary';
import { Button } from '../../components/buttons/Button';
import { StudentNotes } from '../notes/StudentNotes';
import { EnrollmentList } from '../enrollments/EnrollmentList';
import { PackageList } from '../packages/PackageList';
import { FeeObligationList } from '../fees/FeeObligationList';
import { ClassSchedule } from '../classes/ClassSchedule';
import { MeetingLinkList } from '../meeting-links/MeetingLinkList';

export interface StudentProfilePageProps {
  student: Student;
  onBack: () => void;
  onEdit: () => void;
}

type TabType = 'enrollments' | 'packages' | 'fees' | 'classes' | 'meeting-links' | 'notes';

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  student,
  onBack,
  onEdit,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('enrollments');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'packages', label: 'Packages & Balances' },
    { id: 'fees', label: 'Fee Obligations' },
    { id: 'classes', label: 'Classes & Attendance' },
    { id: 'meeting-links', label: 'Meeting Links' },
    { id: 'notes', label: 'Student Notes' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Button variant="outline" onClick={onBack}>
          ← Back to Students
        </Button>
        <Button variant="primary" onClick={onEdit}>
          Edit Profile
        </Button>
      </div>

      <StudentSummary student={student} />

      <div style={{ display: 'flex', gap: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-4)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              background: 'none',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'enrollments' && <EnrollmentList studentId={student.student_id} />}
        {activeTab === 'packages' && <PackageList studentId={student.student_id} />}
        {activeTab === 'fees' && <FeeObligationList studentId={student.student_id} />}
        {activeTab === 'classes' && <ClassSchedule studentId={student.student_id} />}
        {activeTab === 'meeting-links' && <MeetingLinkList studentId={student.student_id} />}
        {activeTab === 'notes' && <StudentNotes studentId={student.student_id} />}
      </div>
    </div>
  );
};
