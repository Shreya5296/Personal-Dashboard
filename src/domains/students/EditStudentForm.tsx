import React, { useState } from 'react';
import { Student, StudentInput } from './studentTypes';
import { WeeklyScheduleEntry, saveSchedules } from '../classes/scheduleApi';
import { createMeetingLink } from '../meeting-links/meetingLinkApi';
import { createPackage, updatePackage } from '../packages/packageApi';
import { updateStudent } from './studentApi';
import { useAuth } from '../../auth/AuthProvider';
import { validateStudentInput } from './studentValidation';
import { calculateEndTime, isValidClassDuration } from '../classes/scheduleDurationCalculator';
import { EditStudentPersonalSection } from './EditStudentPersonalSection';
import { EditStudentLinksSection } from './EditStudentLinksSection';
import { EditStudentPackageSection, PackageFormData } from './EditStudentPackageSection';
import { ScheduleDetailsSection } from './ScheduleDetailsSection';
import { useEditStudentInitialData } from './useEditStudentInitialData';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';

export interface EditStudentFormProps {
  student: Student;
  onSuccess: (updated: Student, message: string) => Promise<void>;
  onCancel: () => void;
}

export const EditStudentForm: React.FC<EditStudentFormProps> = ({ student, onSuccess, onCancel }) => {
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [studentData, setStudentData] = useState<StudentInput>({
    student_name: student.student_name || student.full_name || '',
    subject: student.subject || '',
    parent_name: student.parent_name || '',
    parent_phone: student.parent_phone || student.phone || '',
    parent_email: student.parent_email || '',
    student_phone: student.student_phone || '',
    student_email: student.student_email || student.email || '',
    status: student.status || 'ACTIVE',
    notes: student.notes || '',
  });

  const {
    loadingInitial, meetingLinks, setMeetingLinks,
    existingPkg, packageData, setPackageData, schedules, setSchedules
  } = useEditStudentInitialData(student, token);

  const handlePackageChange = (field: keyof PackageFormData, value: string) => {
    setPackageData((p) => ({ ...p, [field]: value }));
    if (field === 'class_duration' && value) {
      const d = Number(value);
      setSchedules((prev) => prev.map((s) => ({ ...s, end_time: calculateEndTime(s.start_time, d) || s.end_time })));
    }
  };

  const addSchedule = () => {
    const d = Number(packageData.class_duration) || 60;
    setSchedules((prev) => [...prev, { id: String(Date.now()), day_of_week: 'MONDAY', start_time: '17:00', end_time: calculateEndTime('17:00', d) || '18:00' }]);
  };
  const removeSchedule = (id: string) => setSchedules((prev) => prev.filter((s) => s.id !== id));
  const updateSchedule = (id: string, f: 'day_of_week' | 'start_time' | 'end_time', v: string) => {
    const d = Number(packageData.class_duration) || 60;
    setSchedules((prev) => prev.map((s) => (s.id === id ? (f === 'start_time' ? { ...s, start_time: v, end_time: calculateEndTime(v, d) || s.end_time } : { ...s, [f]: v }) : s)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setServerError(null);
    const stuVal = validateStudentInput(studentData);
    if (!stuVal.isValid) {
      setErrors(stuVal.errors);
      setServerError(Object.values(stuVal.errors)[0] || 'Please fix validation errors.');
      return;
    }
    const dur = Number(packageData.class_duration) || 0;
    if (schedules.length > 0 && !isValidClassDuration(dur)) {
      setServerError('Please select a valid Class Duration (30, 40, or 60 min) in Package Details before saving schedules.');
      return;
    }
    for (const s of schedules) {
      const calcEnd = s.end_time || calculateEndTime(s.start_time, dur || 60);
      if (!s.start_time || !calcEnd || calcEnd <= s.start_time) {
        setServerError(`Schedule entry on ${s.day_of_week}: End time must be after start time.`);
        return;
      }
    }
    setIsSubmitting(true);
    try {
      const preservedData = { ...studentData, student_phone: student.student_phone || student.phone || '', student_email: student.student_email || student.email || '', notes: student.notes || '' };
      const updatedStu = await updateStudent(student.student_id, preservedData, token);
      if (meetingLinks.link1.trim() || meetingLinks.link2.trim()) {
        await createMeetingLink({ student_id: student.student_id, student_name: updatedStu.student_name, meeting_link_1: meetingLinks.link1.trim(), meeting_link_2: meetingLinks.link2.trim(), meeting_url: meetingLinks.link1.trim(), provider: 'GOOGLE_MEET' }, token);
      }
      const hasPkg = packageData.package_price.trim() || packageData.classes_purchased.trim() || packageData.class_duration;
      const durNum = dur || undefined;
      if (hasPkg) {
        if (packageData.mode === 'EDIT_EXISTING' && existingPkg) {
          await updatePackage(existingPkg.package_id, { plan_type: packageData.plan_type, currency: packageData.currency, package_price: Number(packageData.package_price || 0), per_class: Number(packageData.per_class || 0), total_classes: Number(packageData.classes_purchased || 0), classes_purchased: Number(packageData.classes_purchased || 0), class_duration: durNum, end_date: packageData.end_date }, token);
        } else if (packageData.classes_purchased || packageData.package_price) {
          await createPackage({ student_id: student.student_id, student_name: updatedStu.student_name, package_name: `${updatedStu.student_name} ${packageData.plan_type}`, plan_type: packageData.plan_type, currency: packageData.currency, package_price: Number(packageData.package_price || 0), per_class: Number(packageData.per_class || 0), total_classes: Number(packageData.classes_purchased || 0), classes_purchased: Number(packageData.classes_purchased || 0), class_duration: durNum, start_date: new Date().toISOString().slice(0, 10), end_date: packageData.end_date }, token);
        }
      }
      const schedsToSave: WeeklyScheduleEntry[] = schedules.map((s) => ({
        schedule_id: (s.id && !s.id.startsWith('temp_') && !/^\d+$/.test(s.id)) ? s.id : undefined,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time || calculateEndTime(s.start_time, dur || 60) || '',
      }));
      await saveSchedules(student.student_id, schedsToSave, token);
      await onSuccess(updatedStu, 'Student details saved successfully');
    } catch (err: unknown) {
      setServerError((err as Error).message || 'Failed to update student details');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingInitial) return <LoadingState message="Loading student details, schedule, and packages…" />;

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {serverError && <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>⚠️ {serverError}</div>}
      <EditStudentPersonalSection values={studentData} errors={errors} onChange={(f, v) => setStudentData((p) => ({ ...p, [f]: v }))} disabled={isSubmitting} />
      <EditStudentLinksSection meetingLink1={meetingLinks.link1} meetingLink2={meetingLinks.link2} errors={errors} onChange={(f, v) => setMeetingLinks((p) => ({ ...p, [f === 'meeting_link_1' ? 'link1' : 'link2']: v }))} disabled={isSubmitting} />
      <EditStudentPackageSection existingPackage={existingPkg} values={packageData} errors={errors} onChange={handlePackageChange} disabled={isSubmitting} />
      <ScheduleDetailsSection schedules={schedules} classDuration={packageData.class_duration} errors={errors} onAdd={addSchedule} onRemove={removeSchedule} onChange={updateSchedule} disabled={isSubmitting} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>Save Changes</Button>
      </div>
    </form>
  );
};
