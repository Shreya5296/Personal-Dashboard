import { useState } from 'react';
import { Student } from './studentTypes';
import { RegistrationFormData, RegistrationErrors } from './registrationTypes';
import { validateRegistrationForm } from './registrationValidation';
import { calculateEndTime } from '../classes/scheduleDurationCalculator';
import { createStudent } from './studentApi';
import { createPackage } from '../packages/packageApi';
import { saveSchedules } from '../classes/scheduleApi';
import { calculatePackageDates } from '../packages/packageCalculations';
import { generateProposedSessions } from '../classes/classGenerator';
import { batchScheduleClasses } from '../classes/classApi';

export function useStudentRegistrationForm(
  token: string | null,
  onSuccess: (student: Student, message: string) => Promise<void>
) {
  const [formData, setFormData] = useState<RegistrationFormData>({
    student: { student_name: '', subject: '', student_phone: '', student_email: '' },
    parent: { parent_name: '', parent_phone: '', parent_email: '' },
    pkg: { plan_type: 'Package', currency: 'INR', package_price: '', per_class: '', classes_purchased: '', class_duration: '60' },
    schedules: [],
    first_class_date: '',
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

      const count = Number(formData.pkg.classes_purchased || 0);
      const days = formData.schedules.map((s) => s.day_of_week);
      const pkgDates = calculatePackageDates(formData.first_class_date, days, count);

      let createdPkg = null;
      if (formData.pkg.package_price.trim() || formData.pkg.classes_purchased.trim()) {
        createdPkg = await createPackage({
          student_id: activeStudent.student_id, student_name: activeStudent.student_name,
          package_name: `${activeStudent.student_name} ${formData.pkg.plan_type}`,
          plan_type: formData.pkg.plan_type, currency: formData.pkg.currency,
          package_price: Number(formData.pkg.package_price || 0),
          per_class: Number(formData.pkg.per_class || 0),
          total_classes: count, classes_purchased: count, class_duration: dur,
          start_date: pkgDates.startDate || formData.first_class_date || new Date().toISOString().slice(0, 10),
          end_date: pkgDates.endDate || '', next_due_date: pkgDates.nextDueDate || '',
        }, token);
      }

      if (formData.schedules.length > 0) {
        await saveSchedules(activeStudent.student_id, formData.schedules, token);
        if (count > 0 && formData.first_class_date) {
          const proposed = generateProposedSessions(formData.schedules, formData.first_class_date, count, [], activeStudent.student_id, dur);
          const sessions = proposed.map((p) => ({
            student_id: activeStudent!.student_id, student_name: activeStudent!.student_name,
            package_id: createdPkg?.package_id, class_date: p.dateStr,
            start_time: p.scheduledStart, scheduled_start: p.scheduledStart, scheduled_end: p.scheduledEnd,
            duration_minutes: p.durationMinutes, topic: `${activeStudent!.student_name} - Class Session`,
            class_title: `${activeStudent!.student_name} - Class Session`,
          }));
          await batchScheduleClasses(activeStudent.student_id, sessions, token);
        }
      }

      await onSuccess(activeStudent, `Student ${activeStudent.student_name} (${activeStudent.student_id}) registered successfully.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setServerError(activeStudent ? `Student created (${activeStudent.student_id}), but details failed: ${msg}` : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData, setFormData, errors, serverError, persistedStudent, isSubmitting,
    handlePackageChange, addSchedule, removeSchedule, updateSchedule, handleSubmit,
  };
}
