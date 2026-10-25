import React, { useState } from 'react';
import { Student } from './studentTypes';
import { RegistrationFormData, RegistrationErrors } from './registrationTypes';
import { validateRegistrationForm } from './registrationValidation';
import { calculateEndTime } from '../classes/scheduleDurationCalculator';
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
    pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '', class_duration: '60' },
    schedules: [],
  });

  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [persistedStudent, setPersistedStudent] = useState<Student | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dur = Number(formData.pkg.class_duration) || 60;

  const handlePackageChange = (field: string, value: string) => {
    setFormData((prev) => {
      const nextPkg = { ...prev.pkg, [field]: value };
      if (field === 'class_duration') {
        const d = Number(value);
        const nextScheds = prev.schedules.map((s) => ({
          ...s,
          end_time: d ? calculateEndTime(s.start_time, d) || s.end_time : s.end_time,
        }));
        return { ...prev, pkg: nextPkg, schedules: nextScheds };
      }
      return { ...prev, pkg: nextPkg };
    });
  };

  const addSchedule = () => {
    const start = '17:00';
    const end = calculateEndTime(start, dur) || '18:00';
    setFormData((prev) => ({
      ...prev,
      schedules: [...prev.schedules, { id: String(Date.now()), day_of_week: 'MONDAY', start_time: start, end_time: end }],
    }));
  };

  const removeSchedule = (id: string) => {
    setFormData((prev) => ({ ...prev, schedules: prev.schedules.filter((s) => s.id !== id) }));
  };

  const updateSchedule = (id: string, field: 'day_of_week' | 'start_time' | 'end_time', value: string) => {
    setFormData((prev) => ({
      ...prev,
      schedules: prev.schedules.map((s) => (s.id !== id ? s : field === 'start_time'
        ? { ...s, start_time: value, end_time: calculateEndTime(value, dur) || s.end_time }
        : { ...s, [field]: value })),
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
          student_phone: formData.student.student_phone.trim(),
          student_email: formData.student.student_email.trim(),
          parent_name: formData.parent.parent_name,
          parent_phone: formData.parent.parent_phone,
          parent_email: formData.parent.parent_email,
          status: 'ACTIVE',
        }, token);
        setPersistedStudent(activeStudent);
      }

      if (formData.pkg.package_price.trim() || formData.pkg.classes_purchased.trim()) {
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
          class_duration: Number(formData.pkg.class_duration) || 60,
          start_date: new Date().toISOString().slice(0, 10),
        }, token);
      }

      if (formData.schedules.length > 0) {
        await saveSchedules(activeStudent.student_id, formData.schedules, token);
      }

      await onSuccess(activeStudent, `Student ${activeStudent.student_name} (${activeStudent.student_id}) registered successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setServerError(activeStudent ? `Student created (${activeStudent.student_id}), but details failed: ${msg}` : msg);
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
      <PackageDetailsSection values={formData.pkg} errors={errors.pkg} onChange={handlePackageChange} disabled={isSubmitting} />
      <ScheduleDetailsSection schedules={formData.schedules} classDuration={formData.pkg.class_duration} errors={errors.schedules} onAdd={addSchedule} onRemove={removeSchedule} onChange={updateSchedule} disabled={isSubmitting} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>{persistedStudent ? 'Retry Saving Package / Schedule' : 'Create Student'}</Button>
      </div>
    </form>
  );
};
