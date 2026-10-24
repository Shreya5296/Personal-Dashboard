import React, { useState, useEffect } from 'react';
import { Student, StudentInput } from './studentTypes';
import { Package } from '../packages/packageTypes';
import { fetchSchedules, saveSchedules } from '../classes/scheduleApi';
import { fetchMeetingLinks, createMeetingLink } from '../meeting-links/meetingLinkApi';
import { fetchPackages, createPackage, updatePackage } from '../packages/packageApi';
import { updateStudent } from './studentApi';
import { useAuth } from '../../auth/AuthProvider';
import { validateStudentInput } from './studentValidation';
import { EditStudentPersonalSection } from './EditStudentPersonalSection';
import { EditStudentLinksSection } from './EditStudentLinksSection';
import { EditStudentPackageSection, PackageFormData } from './EditStudentPackageSection';
import { ScheduleDetailsSection } from './ScheduleDetailsSection';
import { ScheduleItem } from './registrationTypes';
import { Button } from '../../components/buttons/Button';
import { LoadingState } from '../../components/feedback/LoadingState';

export interface EditStudentFormProps {
  student: Student;
  onSuccess: (updated: Student, message: string) => Promise<void>;
  onCancel: () => void;
}

export const EditStudentForm: React.FC<EditStudentFormProps> = ({ student, onSuccess, onCancel }) => {
  const { token } = useAuth();
  const [loadingInitial, setLoadingInitial] = useState(true);
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

  const [meetingLinks, setMeetingLinks] = useState({ link1: '', link2: '' });
  const [existingPkg, setExistingPkg] = useState<Package | null>(null);
  const [packageData, setPackageData] = useState<PackageFormData>({
    mode: 'EDIT_EXISTING',
    plan_type: 'Package',
    currency: 'INR',
    package_price: '',
    per_class: '',
    classes_purchased: '',
    end_date: '',
  });
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchMeetingLinks(student.student_id, token).catch(() => []),
      fetchPackages(student.student_id, token).catch(() => []),
      fetchSchedules(student.student_id, token).catch(() => []),
    ]).then(([links, pkgs, scheds]) => {
      if (!isMounted) return;
      const ml = links.find((l) => l.student_id === student.student_id);
      if (ml) setMeetingLinks({ link1: ml.meeting_link_1 || ml.meeting_url || '', link2: ml.meeting_link_2 || '' });
      if (pkgs.length > 0) {
        const p = pkgs[0];
        setExistingPkg(p);
        setPackageData({
          mode: 'EDIT_EXISTING',
          package_id: p.package_id,
          plan_type: p.plan_type || 'Package',
          currency: p.currency || 'INR',
          package_price: p.package_price !== undefined ? String(p.package_price) : (p.price !== undefined ? String(p.price) : ''),
          per_class: p.per_class !== undefined ? String(p.per_class) : '',
          classes_purchased: p.classes_purchased !== undefined ? String(p.classes_purchased) : (p.total_classes !== undefined ? String(p.total_classes) : ''),
          end_date: p.end_date || p.expiry_date || '',
        });
      }
      setSchedules(scheds.map((s, idx) => ({ id: s.schedule_id || String(idx), day_of_week: s.day_of_week, start_time: s.start_time, end_time: s.end_time })));
      setLoadingInitial(false);
    });
    return () => { isMounted = false; };
  }, [student.student_id, token]);

  const addSchedule = () => setSchedules((prev) => [...prev, { id: String(Date.now()), day_of_week: 'MONDAY', start_time: '17:00', end_time: '18:00' }]);
  const removeSchedule = (id: string) => setSchedules((prev) => prev.filter((s) => s.id !== id));
  const updateSchedule = (id: string, f: 'day_of_week' | 'start_time' | 'end_time', v: string) => setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, [f]: v } : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const stuVal = validateStudentInput(studentData);
    if (!stuVal.isValid) { setErrors(stuVal.errors); return; }
    for (const s of schedules) {
      if (s.end_time <= s.start_time) { setServerError(`Schedule entry on ${s.day_of_week}: End time must be after start time.`); return; }
    }
    setIsSubmitting(true);
    try {
      const updatedStu = await updateStudent(student.student_id, studentData, token);
      if (meetingLinks.link1.trim() || meetingLinks.link2.trim()) {
        await createMeetingLink({ student_id: student.student_id, student_name: updatedStu.student_name, meeting_link_1: meetingLinks.link1.trim(), meeting_link_2: meetingLinks.link2.trim(), meeting_url: meetingLinks.link1.trim(), provider: 'GOOGLE_MEET' }, token);
      }
      const hasPkg = packageData.package_price.trim() || packageData.classes_purchased.trim();
      if (hasPkg) {
        if (packageData.mode === 'EDIT_EXISTING' && existingPkg) {
          await updatePackage(existingPkg.package_id, { plan_type: packageData.plan_type, currency: packageData.currency, package_price: Number(packageData.package_price || 0), per_class: Number(packageData.per_class || 0), total_classes: Number(packageData.classes_purchased || 0), classes_purchased: Number(packageData.classes_purchased || 0), end_date: packageData.end_date }, token);
        } else if (packageData.mode === 'CREATE_NEW' || !existingPkg) {
          await createPackage({ student_id: student.student_id, student_name: updatedStu.student_name, package_name: `${updatedStu.student_name} ${packageData.plan_type}`, plan_type: packageData.plan_type, currency: packageData.currency, package_price: Number(packageData.package_price || 0), per_class: Number(packageData.per_class || 0), total_classes: Number(packageData.classes_purchased || 0), classes_purchased: Number(packageData.classes_purchased || 0), start_date: new Date().toISOString().slice(0, 10), end_date: packageData.end_date }, token);
        }
      }
      await saveSchedules(student.student_id, schedules, token);
      await onSuccess(updatedStu, `Student ${updatedStu.student_name} (${updatedStu.student_id}) updated successfully.`);
    } catch (err: unknown) {
      setServerError((err as Error).message || 'Failed to update student details');
    } finally { setIsSubmitting(false); }
  };

  if (loadingInitial) return <LoadingState message="Loading student details, schedule, and packages…" />;

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {serverError && <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger-text)', fontSize: 'var(--font-size-sm)' }}>⚠️ {serverError}</div>}
      <EditStudentPersonalSection values={studentData} errors={errors} onChange={(f, v) => setStudentData((p) => ({ ...p, [f]: v }))} disabled={isSubmitting} />
      <EditStudentLinksSection meetingLink1={meetingLinks.link1} meetingLink2={meetingLinks.link2} errors={errors} onChange={(f, v) => setMeetingLinks((p) => ({ ...p, [f === 'meeting_link_1' ? 'link1' : 'link2']: v }))} disabled={isSubmitting} />
      <EditStudentPackageSection existingPackage={existingPkg} values={packageData} errors={errors} onChange={(f, v) => setPackageData((p) => ({ ...p, [f]: v }))} disabled={isSubmitting} />
      <ScheduleDetailsSection schedules={schedules} errors={errors} onAdd={addSchedule} onRemove={removeSchedule} onChange={updateSchedule} disabled={isSubmitting} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>Save Changes</Button>
      </div>
    </form>
  );
};