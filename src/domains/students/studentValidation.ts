import { StudentInput } from './studentTypes';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateStudentInput(input: Partial<StudentInput>): ValidationResult {
  const errors: Record<string, string> = {};

  const name = String(input.student_name || input.full_name || '').trim();
  if (!name) {
    errors.student_name = 'Student name is required.';
    errors.full_name = 'Full name is required.';
  } else if (name.length > 100) {
    errors.student_name = 'Student name cannot exceed 100 characters.';
    errors.full_name = 'Student name cannot exceed 100 characters.';
  }

  const pName = input.parent_name !== undefined ? String(input.parent_name).trim() : null;
  if (pName !== null && !pName) {
    errors.parent_name = 'Parent name is required.';
  }

  const pPhone = input.parent_phone !== undefined ? String(input.parent_phone).trim() : (input.phone !== undefined ? String(input.phone).trim() : null);
  if (pPhone !== null && !pPhone) {
    errors.parent_phone = 'Parent phone is required.';
    errors.phone = 'Parent phone is required.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const pEmail = input.parent_email !== undefined ? String(input.parent_email).trim() : '';
  if (pEmail && !emailRegex.test(pEmail)) {
    errors.parent_email = 'Invalid parent email address format.';
  }

  const sEmail = input.student_email !== undefined ? String(input.student_email).trim() : '';
  if (sEmail && !emailRegex.test(sEmail)) {
    errors.student_email = 'Invalid student email address format.';
  }

  const email = input.email !== undefined ? String(input.email).trim() : '';
  if (email && !emailRegex.test(email)) {
    errors.email = 'Invalid email address format.';
  }

  const subj = input.subject !== undefined ? String(input.subject).trim() : '';
  if (subj && subj.length > 100) {
    errors.subject = 'Subject cannot exceed 100 characters.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function mapApiErrorsToFields(details: Record<string, unknown>): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const [key, val] of Object.entries(details)) {
    const msg = String(val);
    if (key === 'student_name' || key === 'first_name' || key === 'last_name') {
      fieldErrors.student_name = msg;
      fieldErrors.full_name = msg;
    } else if (key === 'parent_name' || key === 'parent_guardian_name') {
      fieldErrors.parent_name = msg;
    } else if (key === 'parent_phone' || key === 'primary_phone' || key === 'phone') {
      fieldErrors.parent_phone = msg;
      fieldErrors.phone = msg;
    } else if (key === 'parent_email') {
      fieldErrors.parent_email = msg;
      fieldErrors.email = msg;
    } else if (key === 'student_email') {
      fieldErrors.student_email = msg;
    } else {
      fieldErrors[key] = msg;
    }
  }
  return fieldErrors;
}
