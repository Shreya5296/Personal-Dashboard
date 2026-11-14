import React, { useState } from 'react';
import { useAuth } from '../../auth/AuthProvider';
import { Student } from '../students/studentTypes';
import { RenewalResult } from './packageRenewalTypes';
import { renewStudentPackage } from './renewalApi';
import { useStudentRenewalForm } from './useStudentRenewalForm';
import { RenewalStudentSelectStep } from './RenewalStudentSelectStep';
import { RenewalCurrentSummaryStep } from './RenewalCurrentSummaryStep';
import { RenewalPackageDetailsStep } from './RenewalPackageDetailsStep';
import { RenewalScheduleStep } from './RenewalScheduleStep';
import { RenewalPaymentStep } from './RenewalPaymentStep';
import { RenewalConfirmationStep } from './RenewalConfirmationStep';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';
import { backdropStyle, dialogStyle, headerStyle, closeButtonStyle } from '../finances/paymentModalStyles';

export interface StudentRenewalModalProps {
  initialStudent?: Student | null;
  onSuccess: (result: RenewalResult, message: string) => Promise<void>;
  onClose: () => void;
}

function getOrInitIdempKey(sid?: string): string {
  const k = `renewal_idemp_key_${sid || 'pending'}`;
  try {
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const fresh = `idemp_ren_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(k, fresh);
    return fresh;
  } catch (e) {
    return `idemp_ren_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function clearActiveIdempKey(sid?: string) {
  try { sessionStorage.removeItem(`renewal_idemp_key_${sid || 'pending'}`); } catch (e) {}
}

export const StudentRenewalModal: React.FC<StudentRenewalModalProps> = ({ initialStudent, onSuccess, onClose }) => {
  const { token } = useAuth();
  const { student, selectStudent, step, setStep, loadingSummary, summary, formData, setFormData } = useStudentRenewalForm(initialStudent, token);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const sid = student?.student_id || initialStudent?.student_id;
  const [idempKey, setIdempKey] = useState(() => getOrInitIdempKey(sid));

  const handleNext = () => {
    setServerError(null);
    if (step === 1 && !student) { setServerError('Please select a student to continue.'); return; }
    if (step === 3 && (!formData.new_classes_purchased || Number(formData.new_classes_purchased) <= 0)) {
      setServerError('Number of newly purchased classes must be greater than zero.'); return;
    }
    setStep((s) => Math.min(6, s + 1));
  };

  const handleBack = () => { setServerError(null); setStep((s) => Math.max(1, s - 1)); };

  const handleSafeClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!formData.confirmed) { setServerError('Please check the confirmation box to confirm the renewal.'); return; }
    setSubmitting(true);
    setServerError(null);
    const effectiveKey = idempKey || getOrInitIdempKey(sid);
    setIdempKey(effectiveKey);
    try {
      const res = await renewStudentPackage(formData, token, effectiveKey);
      clearActiveIdempKey(sid);
      await onSuccess(res, `Renewal confirmed for ${res.student_name}: ${res.new_classes_purchased} classes added. New available balance: ${res.new_available_balance} classes.`);
      onClose();
    } catch (err: unknown) {
      setServerError((err as Error).message || 'Renewal failed. Please check inputs and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" onClick={(e) => { if (!submitting && e.target === e.currentTarget) handleSafeClose(); }}>
      <div style={{ ...dialogStyle, maxWidth: '720px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div style={{ ...headerStyle, padding: '1.25rem 1.5rem', margin: 0, borderBottom: '1px solid var(--color-border-subtle)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Student Package Renewal &amp; Re-enrolment</h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Step {step} of 6 {student ? `· ${student.student_name || student.full_name} (${student.student_id})` : ''}
            </span>
          </div>
          <button type="button" style={closeButtonStyle} onClick={handleSafeClose} disabled={submitting} aria-label="Close dialog">✕</button>
        </div>

        <div style={{ overflowY: 'auto', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {serverError && <div style={{ padding: '0.625rem 0.875rem', backgroundColor: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '4px', fontSize: '13px' }}>⚠️ {serverError}</div>}
          {step === 1 && <RenewalStudentSelectStep selectedStudent={student} onSelectStudent={(s) => { selectStudent(s); setIdempKey(getOrInitIdempKey(s.student_id)); }} token={token} />}
          {loadingSummary && step > 1 && <LoadingState message="Loading student package & balance data…" />}
          {!loadingSummary && summary && (
            <>
              {step === 2 && <RenewalCurrentSummaryStep summary={summary} />}
              {step === 3 && <RenewalPackageDetailsStep data={formData} onChange={(f, v) => setFormData((p) => ({ ...p, [f]: v }))} />}
              {step === 4 && <RenewalScheduleStep schedules={formData.schedules} classDuration={formData.class_duration} startDate={formData.start_date} onChangeSchedules={(s) => setFormData((p) => ({ ...p, schedules: s }))} onStartDateChange={(d) => setFormData((p) => ({ ...p, start_date: d }))} />}
              {step === 5 && <RenewalPaymentStep payment={formData.payment} packagePrice={formData.package_price} currency={formData.currency} onChange={(pay) => setFormData((p) => ({ ...p, payment: pay }))} />}
              {step === 6 && <RenewalConfirmationStep summary={summary} data={formData} onConfirmChange={(c) => setFormData((p) => ({ ...p, confirmed: c }))} />}
            </>
          )}
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--color-bg-subtle)' }}>
          <div>{step > 1 && <Button variant="outline" size="sm" type="button" onClick={handleBack} disabled={submitting}>Back</Button>}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" size="sm" type="button" onClick={handleSafeClose} disabled={submitting}>Cancel</Button>
            {step < 6 ? (
              <Button variant="primary" size="sm" type="button" onClick={handleNext} disabled={step === 1 && !student}>Next Step</Button>
            ) : (
              <Button variant="primary" size="sm" type="button" onClick={handleSubmit} isLoading={submitting} disabled={!formData.confirmed || submitting}>Confirm &amp; Apply Renewal</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
