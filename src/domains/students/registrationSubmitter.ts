import { Student } from './studentTypes';
import { RegistrationFormData } from './registrationTypes';
import { createStudent, fetchStudents, updateStudent } from './studentApi';
import { createPackage, fetchPackages } from '../packages/packageApi';
import { saveSchedules } from '../classes/scheduleApi';
import { calculatePackageDates } from '../packages/packageCalculations';
import { generateProposedSessions } from '../classes/classGenerator';
import { batchScheduleClasses, fetchClasses } from '../classes/classApi';
import { startAsyncScheduling } from './asyncScheduleWorker';

export interface SubmitRegistrationResult {
  student: Student;
  message: string;
}

export async function submitRegistration(
  formData: RegistrationFormData,
  persistedStudent: Student | null,
  token: string | null,
  onStudentResolved?: (student: Student) => void
): Promise<SubmitRegistrationResult> {
  let activeStudent = persistedStudent;

  if (!activeStudent) {
    const existing = await fetchStudents({ query: formData.student.student_name }, token).catch(() => []);
    const match = existing.find((s) => (s.student_name || s.full_name || '').trim().toLowerCase() === formData.student.student_name.trim().toLowerCase());
    if (match) {
      activeStudent = match;
      await updateStudent(match.student_id, {
        student_name: formData.student.student_name, subject: formData.student.subject,
        student_phone: formData.student.student_phone.trim(), student_email: formData.student.student_email.trim(),
        parent_name: formData.parent.parent_name, parent_phone: formData.parent.parent_phone.trim(),
        parent_email: formData.parent.parent_email.trim(), status: 'ACTIVE',
      }, token).catch(() => {});
    } else {
      activeStudent = await createStudent({
        student_name: formData.student.student_name, subject: formData.student.subject,
        student_phone: formData.student.student_phone.trim(), student_email: formData.student.student_email.trim(),
        parent_name: formData.parent.parent_name, parent_phone: formData.parent.parent_phone.trim(),
        parent_email: formData.parent.parent_email.trim(), status: 'ACTIVE',
      }, token);
    }
    if (onStudentResolved) onStudentResolved(activeStudent);
  }

  const dur = Number(formData.pkg.class_duration) || 60;
  const count = Number(formData.pkg.classes_purchased || 0);
  const days = formData.schedules.map((s) => s.day_of_week);
  const pkgDates = calculatePackageDates(formData.first_class_date, days, count);

  let createdPkg = null;
  if (formData.pkg.package_price.trim() || formData.pkg.classes_purchased.trim()) {
    const existingPkgs = await fetchPackages(activeStudent.student_id, token).catch(() => []);
    if (existingPkgs.length > 0) {
      createdPkg = existingPkgs[0];
    } else {
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
  }

  if (formData.schedules.length > 0) {
    await saveSchedules(activeStudent.student_id, formData.schedules, token);
    if (count > 0 && formData.first_class_date) {
      const existingClasses = await fetchClasses(activeStudent.student_id, token).catch(() => []);
      const proposed = generateProposedSessions(formData.schedules, formData.first_class_date, count, existingClasses, activeStudent.student_id, dur);
      const needed = proposed.filter((p) => !p.isDuplicate);

      if (needed.length > 0) {
        const sessions = needed.map((p) => ({
          student_id: activeStudent!.student_id, student_name: activeStudent!.student_name,
          package_id: createdPkg?.package_id, class_date: p.dateStr,
          start_time: p.scheduledStart, scheduled_start: p.scheduledStart, scheduled_end: p.scheduledEnd,
          duration_minutes: p.durationMinutes, topic: `${activeStudent!.student_name} - Class Session`,
          class_title: `${activeStudent!.student_name} - Class Session`,
        }));

        try {
          await batchScheduleClasses(activeStudent.student_id, sessions, token);
        } catch (batchErr: unknown) {
          const bMsg = (batchErr as Error)?.message || '';
          if (bMsg.includes('Unknown operation') && bMsg.includes('classes.batchSchedule')) {
            await startAsyncScheduling({
              studentId: activeStudent.student_id, studentName: activeStudent.student_name,
              packageId: createdPkg?.package_id, firstClassDate: formData.first_class_date,
              schedules: formData.schedules, durationMinutes: dur, classesPurchased: count, token,
            });
            return {
              student: activeStudent,
              message: `Student ${activeStudent.student_name} (${activeStudent.student_id}) registered. Classes are being scheduled in background.`,
            };
          }
          throw batchErr;
        }
      }
    }
  }

  return {
    student: activeStudent,
    message: `Student ${activeStudent.student_name} (${activeStudent.student_id}) registered successfully.`,
  };
}
