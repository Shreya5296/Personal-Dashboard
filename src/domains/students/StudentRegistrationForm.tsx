import React from 'react';
import { Student } from './studentTypes';
import { StudentDetailsSection } from './StudentDetailsSection';
import { ParentDetailsSection } from './ParentDetailsSection';
import { PackageDetailsSection } from './PackageDetailsSection';
import { ScheduleDetailsSection } from './ScheduleDetailsSection';
import { useStudentRegistrationForm } from './useStudentRegistrationForm';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/buttons/Button';

export interface StudentRegistrationFormProps {
  onSuccess: (student: Student, message: string) => Promise<void>;
  onCancel: () => void;
}

export const StudentRegistrationForm: React.FC<StudentRegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const { token } = useAuth();
  const {
    formData,
    setFormData,
    errors,
    serverError,
    persistedStudent,
    isSubmitting,
    handlePackageChange,
    addSchedule,
    removeSchedule,
    updateSchedule,
    handleSubmit,
  } = useStudentRegistrationForm(token, onSuccess);

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {serverError && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>
          ⚠️ {serverError}
        </div>
      )}
      <StudentDetailsSection
        values={formData.student}
        errors={errors.student}
        onChange={(f, v) => setFormData((p) => ({ ...p, student: { ...p.student, [f]: v } }))}
        disabled={Boolean(persistedStudent) || isSubmitting}
      />
      <ParentDetailsSection
        values={formData.parent}
        errors={errors.parent}
        onChange={(f, v) => setFormData((p) => ({ ...p, parent: { ...p.parent, [f]: v } }))}
        disabled={Boolean(persistedStudent) || isSubmitting}
      />
      <PackageDetailsSection
        values={formData.pkg}
        errors={errors.pkg}
        onChange={handlePackageChange}
        disabled={isSubmitting}
      />
      <ScheduleDetailsSection
        schedules={formData.schedules}
        classDuration={formData.pkg.class_duration}
        firstClassDate={formData.first_class_date}
        firstClassDateError={errors.first_class_date}
        onFirstClassDateChange={(d) => setFormData((p) => ({ ...p, first_class_date: d }))}
        errors={errors.schedules}
        onAdd={addSchedule}
        onRemove={removeSchedule}
        onChange={updateSchedule}
        disabled={isSubmitting}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>
          {persistedStudent ? 'Retry Saving Package / Schedule' : 'Create Student'}
        </Button>
      </div>
    </form>
  );
};
