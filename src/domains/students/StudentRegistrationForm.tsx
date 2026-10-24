import React, { useState } from 'react';
import { Student } from './studentTypes';
import { RegistrationFormData, RegistrationErrors } from './registrationTypes';
import { validateRegistrationForm } from './registrationValidation';
import { StudentDetailsSection } from './StudentDetailsSection';
import { ParentDetailsSection } from './ParentDetailsSection';
import { PackageDetailsSection } from './PackageDetailsSection';
import { ScheduleDetailsSection } from './ScheduleDetailsSection';
import { createStudent } from './studentApi';
import { createPackage } from '../packages/packageApi';
import { saveSchedules } from '../classes/scheduleApi';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/buttons/Button';

export interface StudentRegistrationFormProps {
  onSuccess: (student: Student, message: string) => Promise<void>;
  onCancel: () => void;
}

export const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState<RegistrationFormData>({
    student: { student_name: '', subject: '', student_phone: '', student_email: '' },
    parent: { parent_name: '', parent_phone: '', parent_email: '' },
    pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '' },
    schedules: [],
  });

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [persistedStudent, setPersistedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addSchedule = () => {
    setFormData((prev) => ({
      ...prev,
      schedules: [...prev.schedules, { id: String(Date.now()), day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' }],
    }));
  };

  const removeSchedule = (id: string) => {
    setFormData((prev) => ({ ...prev, schedules: prev.schedules.filter((s) => s.id !== id) }));
  };

  const updateSchedule = (id: string, field: 'day_of_week' | 'start_time' | 'end_time', value: string) => {
    setFormData((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const { isValid, errors: valErrors } = validateRegistrationForm(formData);
    if (!isValid) { setErrors(valErrors); return; }

    setIsSubmitting(true);
    let activeStudent = persistedStudent;

    try {
      if (!activeStudent) {
        activeStudent = await createStudent({
          student_name: formData.student.student_name,
          subject: formData.student.subject,
          student_phone: formData.student.student_phone,
          student_email: formData.student.student_email,
          parent_name: formData.parent.parent_name,
          parent_phone: formData.parent.parent_phone,
          parent_email: formData.parent.parent_email,
          status: 'ACTIVE',
        }, token);
        setPersistedStudent(activeStudent);
      }

      const hasPkg = formData.pkg.package_price.trim() || formData.pkg.classes_purchased.trim();
      if (hasPkg) {
        await createPackage({
          student_id: activeStudent.student_id,
          student_name: activeStudent.student_name,
          package_name: `${activeStudent.student_name} ${formData.pkg.plan_type}`,
          plan_type: formData.pkg.plan_type,
          currency: formData.pkg.currency,
          package_price: Number(formData.pkg.package_price || 0),
          per_class: Number(formData.pkg.per_class || 0),
          total_classes: Number(formData.pkg.classes_purchased || 0),
          classes_purchased: Number(formData.pkg.classes_purchased || 0),
          start_date: new Date().toISOString().slice(0, 10),
        }, token);
      }

      if (formData.schedules.length > 0) {
        await saveSchedules(activeStudent.student_id, formData.schedules, token);
      }

      await onSuccess(activeStudent, `Student ${activeStudent.student_name} (${activeStudent.student_id}) registered successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (activeStudent) {
        setServerError(`Student was created with permanent ID ${activeStudent.student_id}, but package/schedule saving failed: ${msg}. You can fix the details and retry.`);
      } else {
        setServerError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {serverError && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {serverError}
        </div>
      )}

      <StudentDetailsSection values={formData.student} errors={errors.student} onChange={(f, v) => setFormData((p) => ({ ...p, student: { ...p.student, [f]: v } }))} disabled={Boolean(persistedStudent) || isSubmitting} />
      <ParentDetailsSection values={formData.parent} errors={errors.parent} onChange={(f, v) => setFormData((p) => ({ ...p, parent: { ...p.parent, [f]: v } }))} disabled={Boolean(persistedStudent) || isSubmitting} />
      <PackageDetailsSection values={formData.pkg} errors={errors.pkg} onChange={(f, v) => setFormData((p) => ({ ...p, pkg: { ...p.pkg, [f]: v } }))} disabled={isSubmitting} />
      <ScheduleDetailsSection schedules={formData.schedules} errors={errors.schedules} onAdd={addSchedule} onRemove={removeSchedule} onChange={updateSchedule} disabled={isSubmitting} />

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>{persistedStudent ? 'Retry Saving Package / Schedule' : 'Create Student'}</Button>
      </div>
    </form>
  );
};
