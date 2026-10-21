import { StudentInput } from './studentTypes';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateStudentInput(input: Partial<StudentInput>): ValidationResult {
  const errors: Record<string, string> = {};

  const name = (input.student_name || input.full_name || '').trim();
  if (!name) {
    errors.student_name = 'Student name is required.';
    errors.full_name = 'Full name is required.';
  } else if (name.length > 100) {
    errors.student_name = 'Student name cannot exceed 100 characters.';
    errors.full_name = 'Student name cannot exceed 100 characters.';
  }

  if (input.parent_name !== undefined && !input.parent_name.trim()) {
    errors.parent_name = 'Parent name is required.';
  }

  if (input.parent_phone !== undefined && !input.parent_phone.trim()) {
    errors.parent_phone = 'Parent phone is required.';
    errors.phone = 'Parent phone is required.';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (input.parent_email && input.parent_email.trim()) {
    if (!emailRegex.test(input.parent_email.trim())) {
      errors.parent_email = 'Invalid parent email address format.';
    }
  }

  if (input.student_email && input.student_email.trim()) {
    if (!emailRegex.test(input.student_email.trim())) {
      errors.student_email = 'Invalid student email address format.';
    }
  }

  if (input.email && input.email.trim()) {
    if (!emailRegex.test(input.email.trim())) {
      errors.email = 'Invalid email address format.';
    }
  }

  if (input.subject && input.subject.trim().length > 100) {
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
