import React, { useState, useEffect } from 'react';
import { Student } from '../students/studentTypes';
import { WeeklyScheduleEntry, fetchSchedules } from './scheduleApi';
import { ClassSession } from './classTypes';
import { fetchClasses, scheduleClass } from './classApi';
import { fetchPackages } from '../packages/packageApi';
import { ProposedSession, generateProposedSessions } from './classGenerator';
import { AutoSchedulePreviewTable } from './AutoSchedulePreviewTable';
import { Button } from '../../components/buttons/Button';
import { FormField } from '../../components/forms/FormField';
import { useAuth } from '../../auth/AuthProvider';
import formStyles from '../../components/forms/forms.module.css';

export interface AutoScheduleModalProps {
  student: Student;
  schedule?: WeeklyScheduleEntry[];
  packageId?: string;
  remainingClasses?: number;
  onClose: () => void;
  onSuccess: (count: number) => Promise<void>;
}

export const AutoScheduleModal: React.FC<AutoScheduleModalProps> = ({
  student,
  schedule: initialSchedule,
  packageId: initialPackageId,
  remainingClasses: initialRemaining,
  onClose,
  onSuccess,
}) => {
  const { token } = useAuth();
  const [schedule, setSchedule] = useState<WeeklyScheduleEntry[]>(initialSchedule || []);
  const [packageId, setPackageId] = useState<string | undefined>(initialPackageId);
  const [startDate, setStartDate] = useState('');
  const [count, setCount] = useState(String(Math.max(1, initialRemaining || 10)));
  const [existingSessions, setExistingSessions] = useState<ClassSession[]>([]);
  const [proposed, setProposed] = useState<ProposedSession[] | null>(null);
  const [allowConflicts, setAllowConflicts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchClasses(undefined, token).catch(() => []),
      initialSchedule ? Promise.resolve(initialSchedule) : fetchSchedules(student.student_id, token).catch(() => []),
      fetchPackages(student.student_id, token).catch(() => []),
    ]).then(([cls, scheds, pkgs]) => {
      setExistingSessions(cls);
      setSchedule(scheds);
      if (pkgs.length > 0 && !initialPackageId) {
        setPackageId(pkgs[0].package_id);
        const p = pkgs[0];
        const rem = Math.max(0, Number(p.classes_purchased || p.total_classes || 0) - Number(p.consumed_classes || p.classes_consumed || 0));
        if (rem > 0 && !initialRemaining) setCount(String(rem));
      }
    });
  }, [student.student_id, token]);

  const handlePreview = () => {
    setError(null);
    if (!startDate) { setError('Start date is required.'); return; }
    const num = parseInt(count, 10);
    if (isNaN(num) || num <= 0) { setError('Number of classes must be a positive integer.'); return; }
    const generated = generateProposedSessions(schedule, startDate, num, existingSessions, student.student_id);
    if (generated.length === 0) { setError('No sessions could be generated. Check schedule days and start date.'); return; }
    setProposed(generated);
  };

  const conflictCount = proposed?.filter((p) => p.hasConflict).length || 0;

  const handleCommit = async () => {
    if (!proposed?.length) return;
    if (conflictCount > 0 && !allowConflicts) { setError('Please acknowledge conflicts to proceed, or revise dates.'); return; }
    setIsSubmitting(true);
    setError(null);
    try {
      for (const s of proposed) {
        await scheduleClass({
          student_id: student.student_id,
          student_name: student.student_name,
          package_id: packageId,
          class_title: `${student.subject || 'Class'} Session`,
          start_time: s.scheduledStart,
          scheduled_start: s.scheduledStart,
          scheduled_end: s.scheduledEnd,
          duration_minutes: s.durationMinutes,
        }, token);
      }
      await onSuccess(proposed.length);
      onClose();
    } catch (err: unknown) { setError((err as Error).message || 'Failed to create sessions'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }}>
      <div style={{ backgroundColor: 'var(--color-bg-surface)', borderRadius: 'var(--radius-xl)', padding: '1.5rem', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Auto-Schedule Purchased Classes</h3>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>Generate dates for {student.student_name} ({student.student_id}) from recurring schedule.</p>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--color-text-subtle)' }}>✕</button>
        </div>
        {error && <div style={{ padding: '8px 12px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '11px' }}>⚠️ {error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          <FormField label="First Class Date" required>
            <input type="date" className={formStyles.input} value={startDate} onChange={(e) => { setStartDate(e.target.value); setProposed(null); }} />
          </FormField>
          <FormField label="Sessions to Generate" required>
            <input type="number" min="1" max="100" className={formStyles.input} value={count} onChange={(e) => { setCount(e.target.value); setProposed(null); }} />
          </FormField>
        </div>
        {!proposed ? (
          <Button variant="secondary" onClick={handlePreview}>Preview Proposed Dates</Button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: 600 }}>Proposed Sessions ({proposed.length})</span>
              <Button variant="ghost" size="sm" onClick={() => setProposed(null)}>Change Dates</Button>
            </div>
            <AutoSchedulePreviewTable sessions={proposed} />
            {conflictCount > 0 && (
              <div style={{ padding: '8px 10px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius-md)', fontSize: '11px' }}>
                <div style={{ color: '#b45309', fontWeight: 600, marginBottom: '2px' }}>⚠️ {conflictCount} potential session conflict(s) detected.</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#92400e', cursor: 'pointer' }}>
                  <input type="checkbox" checked={allowConflicts} onChange={(e) => setAllowConflicts(e.target.checked)} />
                  I acknowledge these conflicts and want to proceed with scheduling.
                </label>
              </div>
            )}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-3)' }}>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          {proposed && (
            <Button variant="primary" onClick={handleCommit} isLoading={isSubmitting} disabled={conflictCount > 0 && !allowConflicts}>
              Confirm & Schedule {proposed.length} Classes
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};