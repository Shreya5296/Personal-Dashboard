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
