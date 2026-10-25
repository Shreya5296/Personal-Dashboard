import { useState } from 'react';
import { Student } from './studentTypes';
import { RegistrationFormData, RegistrationErrors } from './registrationTypes';
import { validateRegistrationForm } from './registrationValidation';
import { calculateEndTime } from '../classes/scheduleDurationCalculator';
import { submitRegistration } from './registrationSubmitter';

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
      const d = field === 'class_duration' ? Number(value) : 0;
      const nextScheds = d ? prev.schedules.map((s) => ({ ...s, end_time: calculateEndTime(s.start_time, d) || s.end_time })) : prev.schedules;
      return { ...prev, pkg: nextPkg, schedules: nextScheds };
    });
  };

  const addSchedule = () => {
    const end = calculateEndTime('17:00', dur) || '18:00';
    setFormData((p) => ({ ...p, schedules: [...p.schedules, { id: String(Date.now()), day_of_week: 'MONDAY', start_time: '17:00', end_time: end }] }));
  };
  const removeSchedule = (id: string) => setFormData((p) => ({ ...p, schedules: p.schedules.filter((s) => s.id !== id) }));
  const updateSchedule = (id: string, field: 'day_of_week' | 'start_time' | 'end_time', value: string) => {
    setFormData((p) => ({ ...p, schedules: p.schedules.map((s) => (s.id !== id ? s : field === 'start_time' ? { ...s, start_time: value, end_time: calculateEndTime(value, dur) || s.end_time } : { ...s, [field]: value })) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const { isValid, errors: valErrors } = validateRegistrationForm(formData);
    if (!isValid) { setErrors(valErrors); return; }

    setIsSubmitting(true);
    let currentStudent = persistedStudent;

    try {
      const result = await submitRegistration(formData, persistedStudent, token, (stu) => {
        currentStudent = stu;
        setPersistedStudent(stu);
      });
      setPersistedStudent(result.student);
      await onSuccess(result.student, result.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setServerError(currentStudent ? `Student created (${currentStudent.student_id}), but details failed: ${msg}` : msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData, setFormData, errors, serverError, persistedStudent, isSubmitting,
    handlePackageChange, addSchedule, removeSchedule, updateSchedule, handleSubmit,
  };
}
