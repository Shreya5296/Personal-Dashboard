import { StudentInput } from './studentTypes';

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateStudentInput(input: Partial<StudentInput>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.full_name || !input.full_name.trim()) {
    errors.full_name = 'Full name is required.';
  } else if (input.full_name.trim().length > 100) {
    errors.full_name = 'Full name cannot exceed 100 characters.';
  }

  if (input.email && input.email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email.trim())) {
      errors.email = 'Invalid email address format.';
    }
  }

  if (input.parent_email && input.parent_email.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.parent_email.trim())) {
      errors.parent_email = 'Invalid parent email address format.';
    }
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
    if (key === 'first_name' || key === 'last_name') fieldErrors.full_name = msg;
    else if (key === 'parent_guardian_name') fieldErrors.parent_name = msg;
    else if (key === 'primary_phone') {
      fieldErrors.parent_phone = msg;
      fieldErrors.phone = msg;
    } else if (key === 'parent_email') {
      fieldErrors.email = msg;
      fieldErrors.parent_email = msg;
    } else {
      fieldErrors[key] = msg;
    }
  }
  return fieldErrors;
}
