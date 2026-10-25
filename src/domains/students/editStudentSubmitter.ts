import { Student, StudentInput } from './studentTypes';
import { PackageFormData } from './EditStudentPackageSection';
import { Package } from '../packages/packageTypes';
import { ScheduleItem } from './registrationTypes';
import { WeeklyScheduleEntry, saveSchedules } from '../classes/scheduleApi';
import { updateStudent } from './studentApi';
import { createMeetingLink } from '../meeting-links/meetingLinkApi';
import { createPackage, updatePackage } from '../packages/packageApi';
import { calculateEndTime } from '../classes/scheduleDurationCalculator';
import { formatCanonicalScheduleString } from './scheduleFormatter';
import { startAsyncScheduling } from './asyncScheduleWorker';

export interface SubmitEditStudentParams {
  student: Student;
  studentData: StudentInput;
  meetingLinks: { link1: string; link2: string };
  packageData: PackageFormData;
  existingPkg: Package | null;
  schedules: ScheduleItem[];
  firstClassDate?: string;
  autoSchedule?: boolean;
  dur?: number;
  token?: string | null;
}

export async function submitEditStudent(params: SubmitEditStudentParams): Promise<{
  updatedStudent: Student;
  successMessage: string;
}> {
  const {
    student, studentData, meetingLinks, packageData, existingPkg,
    schedules, firstClassDate, autoSchedule, dur, token,
  } = params;

  const preservedData = {
    ...studentData,
    status: studentData.status ? String(studentData.status).trim().toUpperCase() : 'ACTIVE',
    student_phone: studentData.student_phone !== undefined ? studentData.student_phone : (student.student_phone || ''),
    student_email: studentData.student_email !== undefined ? studentData.student_email : (student.student_email || ''),
    notes: studentData.notes !== undefined ? studentData.notes : (student.notes || ''),
  };

  const updatedStu = await updateStudent(student.student_id, preservedData, token);

  if (meetingLinks.link1.trim() || meetingLinks.link2.trim()) {
    await createMeetingLink({
      student_id: student.student_id,
      student_name: updatedStu.student_name,
      meeting_link_1: meetingLinks.link1.trim(),
      meeting_link_2: meetingLinks.link2.trim(),
      meeting_url: meetingLinks.link1.trim(),
      provider: 'GOOGLE_MEET',
    }, token);
  }

  const hasPkg = packageData.package_price.trim() || packageData.classes_purchased.trim() || packageData.class_duration;
  const durNum = dur || undefined;
  let currentPkgId = existingPkg?.package_id;

  const schedsToSave: WeeklyScheduleEntry[] = schedules.map((s) => ({
    schedule_id: (s.id && !s.id.startsWith('temp_') && !/^\d+$/.test(s.id)) ? s.id : undefined,
    day_of_week: s.day_of_week,
    start_time: s.start_time,
    end_time: s.end_time || calculateEndTime(s.start_time, dur || 60) || '',
  }));
  const schedStr = formatCanonicalScheduleString(schedsToSave);

  if (hasPkg) {
    const pkgTargetId = existingPkg?.package_id || student.student_id;
    if (packageData.mode === 'EDIT_EXISTING' && existingPkg) {
      await updatePackage(pkgTargetId, {
        student_id: student.student_id,
        plan_type: packageData.plan_type,
        currency: packageData.currency,
        package_price: Number(packageData.package_price || 0),
        per_class: Number(packageData.per_class || 0),
        total_classes: Number(packageData.classes_purchased || 0),
        classes_purchased: Number(packageData.classes_purchased || 0),
        class_duration: durNum,
        class_schedule: schedStr,
        start_date: firstClassDate || existingPkg.start_date,
        end_date: packageData.end_date,
      }, token);
    } else if (packageData.classes_purchased || packageData.package_price) {
      const created = await createPackage({
        student_id: student.student_id,
        student_name: updatedStu.student_name,
        package_name: `${updatedStu.student_name} ${packageData.plan_type}`,
        plan_type: packageData.plan_type,
        currency: packageData.currency,
        package_price: Number(packageData.package_price || 0),
        per_class: Number(packageData.per_class || 0),
        total_classes: Number(packageData.classes_purchased || 0),
        classes_purchased: Number(packageData.classes_purchased || 0),
        class_duration: durNum,
        class_schedule: schedStr,
        start_date: firstClassDate || new Date().toISOString().slice(0, 10),
        end_date: packageData.end_date,
      }, token);
      currentPkgId = created.package_id || student.student_id;
    }
  }

  await saveSchedules(student.student_id, schedsToSave, token);

  let successMessage = 'Student details saved successfully';

  if (autoSchedule && firstClassDate && schedsToSave.length > 0) {
    startAsyncScheduling({
      studentId: updatedStu.student_id,
      studentName: updatedStu.student_name,
      packageId: currentPkgId,
      firstClassDate,
      schedules: schedsToSave,
      durationMinutes: durNum,
      classesPurchased: Number(packageData.classes_purchased) || undefined,
      token,
    });
    successMessage = 'Class schedule saved. Scheduling classes now…';
  }

  return { updatedStudent: updatedStu, successMessage };
}
