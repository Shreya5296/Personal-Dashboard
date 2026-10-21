import React, { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Student } from './studentTypes';
import { archiveStudent, reactivateStudent } from './studentApi';
import { StudentSummary } from './StudentSummary';
import { Button } from '../../components/buttons/Button';
import { ConfirmDialog } from '../../components/overlays/ConfirmDialog';
import { ArrowLeftIcon } from '../../components/icons/ActionIcons';
import { StudentNotes } from '../notes/StudentNotes';
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

type TabType = 'packages' | 'fees' | 'classes' | 'meeting-links' | 'notes';

export const StudentProfilePage: React.FC<StudentProfilePageProps> = ({
  student,
  onBack,
  onEdit,
  onUpdate,
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('packages');
  const [isArchiving, setIsArchiving] = useState(false);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);
  const [credits, setCredits] = useState<CurrencyCreditSummary[]>([]);

  useEffect(() => {
    Promise.all([
      fetchFeeObligations(student.student_id, token).catch(() => []),
      fetchPayments(student.student_id, undefined, token).catch(() => []),
    ]).then(([f, p]) => setCredits(calculateStudentCredits(f, p, student.student_id)));
  }, [student.student_id, token]);

  const tabs: { id: TabType; label: string }[] = [
    { id: 'packages', label: 'Packages & Balances' },
    { id: 'fees', label: 'Fee Obligations' },
    { id: 'classes', label: 'Classes & Attendance' },
    { id: 'meeting-links', label: 'Meeting Links' },
    { id: 'notes', label: 'Student Notes' },
  ];

  const handleToggleArchive = async () => {
    const isInactive = student.status === 'INACTIVE';
    setIsArchiving(true);
    try {
      const res = isInactive
        ? await reactivateStudent(student.student_id, token)
        : await archiveStudent(student.student_id, token);
      const updated = { ...student, ...res, status: isInactive ? 'ACTIVE' : 'INACTIVE' };
      if (onUpdate) onUpdate(updated);
      setShowConfirmArchive(false);
    } finally {
      setIsArchiving(false);
    }
  };

  const isInactive = student.status === 'INACTIVE';
  const actionWord = isInactive ? 'reactivate' : 'archive';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeftIcon size={14} /> Back to Directory
        </Button>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="outline" size="sm" onClick={() => setShowConfirmArchive(true)}>
            {isInactive ? 'Reactivate Student' : 'Archive Student'}
          </Button>
          <Button variant="primary" size="sm" onClick={onEdit}>
            Edit Profile
          </Button>
        </div>
      </div>

      <StudentSummary student={student} credits={credits} />

      <div style={{ display: 'flex', gap: 'var(--space-1)', borderBottom: '1px solid var(--color-border-subtle)', marginBottom: 'var(--space-5)', overflowX: 'auto' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.625rem 1rem',
                border: 'none',
                background: 'none',
                fontWeight: isActive ? 600 : 500,
                fontSize: 'var(--font-size-sm)',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'color 120ms ease, border-color 120ms ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div>
        {activeTab === 'packages' && <PackageList studentId={student.student_id} />}
        {activeTab === 'fees' && <FeeObligationList studentId={student.student_id} />}
        {activeTab === 'classes' && <ClassSchedule studentId={student.student_id} />}
        {activeTab === 'meeting-links' && <MeetingLinkList studentId={student.student_id} />}
        {activeTab === 'notes' && <StudentNotes studentId={student.student_id} />}
      </div>

      <ConfirmDialog
        isOpen={showConfirmArchive}
        title={`${isInactive ? 'Reactivate' : 'Archive'} Student Record?`}
        message={`Are you sure you want to ${actionWord} ${student.student_name || student.full_name}? ${isInactive ? 'They will reappear in active directories.' : 'They will be moved to inactive records.'}`}
        confirmLabel={isInactive ? 'Reactivate' : 'Archive'}
        isDestructive={!isInactive}
        isLoading={isArchiving}
        onConfirm={handleToggleArchive}
        onCancel={() => setShowConfirmArchive(false)}
      />
    </div>
  );
};
