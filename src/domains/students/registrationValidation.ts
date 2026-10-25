import { RegistrationFormData, RegistrationErrors } from './registrationTypes';
import { isValidClassDuration, calculateEndTime } from '../classes/scheduleDurationCalculator';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validateRegistrationForm(data: RegistrationFormData): {
  isValid: boolean;
  errors: RegistrationErrors;
} {
  const errors: RegistrationErrors = {};
  let valid = true;

  // 1. Student Details
  const studentErrors: Record<string, string> = {};
  if (!data.student.student_name.trim()) {
    studentErrors.student_name = 'Student name is required.';
    valid = false;
  }
  if (data.student.student_email.trim() && !EMAIL_REGEX.test(data.student.student_email.trim())) {
    studentErrors.student_email = 'Invalid student email format.';
    valid = false;
  }
  if (Object.keys(studentErrors).length > 0) errors.student = studentErrors;

  // 2. Parent Details
  const parentErrors: Record<string, string> = {};
  if (!data.parent.parent_name.trim()) {
    parentErrors.parent_name = 'Parent name is required.';
    valid = false;
  }
  if (!data.parent.parent_phone.trim()) {
    parentErrors.parent_phone = 'Parent phone is required.';
    valid = false;
  }
  if (data.parent.parent_email.trim() && !EMAIL_REGEX.test(data.parent.parent_email.trim())) {
    parentErrors.parent_email = 'Invalid parent email format.';
    valid = false;
  }
  if (Object.keys(parentErrors).length > 0) errors.parent = parentErrors;

  // 3. Package Details
  const pkgErrors: Record<string, string> = {};
  const hasPkgInput = Boolean(
    data.pkg.package_price.trim() || data.pkg.per_class.trim() || data.pkg.classes_purchased.trim() || data.pkg.class_duration
  );

  if (data.pkg.class_duration && !isValidClassDuration(Number(data.pkg.class_duration))) {
    pkgErrors.class_duration = 'Class duration must be 30, 40, or 60 minutes.';
    valid = false;
  } else if (data.schedules.length > 0 && !isValidClassDuration(Number(data.pkg.class_duration)) && data.schedules.some((s) => !s.end_time)) {
    pkgErrors.class_duration = 'Class duration (30, 40, or 60 min) is required to configure schedules.';
    valid = false;
  }

  if (hasPkgInput) {
    if (data.pkg.package_price.trim()) {
      const p = Number(data.pkg.package_price);
      if (isNaN(p) || p < 0) {
        pkgErrors.package_price = 'Package price must be a non-negative number.';
        valid = false;
      }
    }
    if (data.pkg.per_class.trim()) {
      const pc = Number(data.pkg.per_class);
      if (isNaN(pc) || pc < 0) {
        pkgErrors.per_class = 'Per class rate must be a non-negative number.';
        valid = false;
      }
    }
    if (data.pkg.classes_purchased.trim()) {
      const cp = Number(data.pkg.classes_purchased);
      if (isNaN(cp) || cp <= 0 || !Number.isInteger(cp)) {
        pkgErrors.classes_purchased = 'Purchased classes must be a positive whole number.';
        valid = false;
      }
    }
  }
  if (Object.keys(pkgErrors).length > 0) errors.pkg = pkgErrors;

  // 4. Class Schedules
  const scheduleErrors: Record<string, string> = {};
  const dur = Number(data.pkg.class_duration);
  data.schedules.forEach((entry) => {
    if (!entry.day_of_week) {
      scheduleErrors[`entry_${entry.id}_day`] = 'Select a day of the week.';
      valid = false;
    }
    if (!TIME_REGEX.test(entry.start_time)) {
      scheduleErrors[`entry_${entry.id}_start`] = 'Valid start time required (HH:MM).';
      valid = false;
    } else if (isValidClassDuration(dur)) {
      const calcEnd = calculateEndTime(entry.start_time, dur);
      if (!calcEnd) {
        scheduleErrors[`entry_${entry.id}_time`] = 'Class cannot cross midnight. Please select an earlier start time.';
        valid = false;
      }
    }
    if (entry.end_time && !TIME_REGEX.test(entry.end_time)) {
      scheduleErrors[`entry_${entry.id}_end`] = 'Valid end time required (HH:MM).';
      valid = false;
    }
    if (!scheduleErrors[`entry_${entry.id}_time`] && TIME_REGEX.test(entry.start_time) && TIME_REGEX.test(entry.end_time) && entry.end_time <= entry.start_time) {
      scheduleErrors[`entry_${entry.id}_time`] = 'End time must be after start time.';
      valid = false;
    }
  });
  if (Object.keys(scheduleErrors).length > 0) errors.schedules = scheduleErrors;

  // 5. First Class Date
  if (!data.first_class_date || !data.first_class_date.trim()) {
    errors.first_class_date = 'First class date is required.';
    valid = false;
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(data.first_class_date.trim())) {
    errors.first_class_date = 'Invalid date format (YYYY-MM-DD required).';
    valid = false;
  } else {
    const today = new Date().toISOString().slice(0, 10);
    if (data.first_class_date < today) {
      errors.first_class_date = 'First class date cannot be in the past.';
      valid = false;
    } else if (data.schedules && data.schedules.length > 0) {
      const [y, m, d] = data.first_class_date.split('-').map(Number);
      const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const firstClassDay = dayNames[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
      const configuredDays = data.schedules.map((s) => s.day_of_week).filter(Boolean);
      if (configuredDays.length > 0 && !configuredDays.includes(firstClassDay)) {
        errors.first_class_date = `First class date (${data.first_class_date}) is a ${firstClassDay}, but configured recurring days are ${configuredDays.join(', ')}.`;
        valid = false;
      }
    }
  }

  return { isValid: valid, errors };
}
