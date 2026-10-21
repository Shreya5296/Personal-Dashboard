import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Student } from './studentTypes';
import { archiveStudent, reactivateStudent } from './studentApi';
import { StudentSummary } from './StudentSummary';
import { Button } from '../../components/buttons/Button';
import { StudentNotes } from '../notes/StudentNotes';
import { EnrollmentList } from '../enrollments/EnrollmentList';
import { PackageList } from '../packages/PackageList';
import { FeeObligationList } from '../fees/FeeObligationList';
import { ClassSchedule } from '../classes/ClassSchedule';
import { MeetingLinkList } from '../meeting-links/MeetingLinkList';
import { fetchFeeObligations } from '../fees/feeApi';
import { fetchPayments } from '../payments/paymentApi';
import { calculateStudentCredits, CurrencyCreditSummary } from '../fees/creditCalculator';

export interface StudentProfilePageProps {
  student: Student;
  onBack: () => void;
  onEdit: () => void;
  onUpdate?: (updated: Student) => void;
}

type TabType = 'enrollments' | 'packages' | 'fees' | 'classes' | 'meeting-links' | 'notes';

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  student,
  onBack,
  onEdit,
  onUpdate,
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('enrollments');
  const [isArchiving, setIsArchiving] = useState(false);
  const [credits, setCredits] = useState<CurrencyCreditSummary[]>([]);

  useEffect(() => {
    Promise.all([
      fetchFeeObligations(student.student_id, token),
      fetchPayments(student.student_id, undefined, token).catch(() => []),
    ]).then(([f, p]) => setCredits(calculateStudentCredits(f, p, student.student_id)));
  }, [student.student_id, token]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'enrollments', label: 'Enrollments' },
    { id: 'packages', label: 'Packages & Balances' },
    { id: 'fees', label: 'Fee Obligations' },
    { id: 'classes', label: 'Classes & Attendance' },
    { id: 'meeting-links', label: 'Meeting Links' },
    { id: 'notes', label: 'Student Notes' },
  ];

  const handleToggleArchive = async () => {
    const isInactive = student.status === 'INACTIVE';
    const actionWord = isInactive ? 'reactivate' : 'archive';
    if (!confirm(`Are you sure you want to ${actionWord} this student?`)) return;

    setIsArchiving(true);
    try {
      const res = isInactive
        ? await reactivateStudent(student.student_id, token)
        : await archiveStudent(student.student_id, token);
      const updated = { ...student, ...res, status: isInactive ? 'ACTIVE' : 'INACTIVE' };
      if (onUpdate) onUpdate(updated);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Button variant="outline" onClick={onBack}>
          ← Back to Students
        </Button>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="outline" onClick={handleToggleArchive} isLoading={isArchiving}>
            {student.status === 'INACTIVE' ? 'Reactivate Student' : 'Archive Student'}
          </Button>
          <Button variant="primary" onClick={onEdit}>
            Edit Profile
          </Button>
        </div>
      </div>

      <StudentSummary student={student} credits={credits} />

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
