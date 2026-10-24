import { Package } from '../packages/packageTypes';

export interface PaymentFormValues {
  student_id: string;
  payment_date: string;
  amount: string;
  currency: string;
  in_inr: string;
}

export interface PaymentFormErrors {
  student_id?: string;
  payment_date?: string;
  amount?: string;
  currency?: string;
  in_inr?: string;
}

export function validatePaymentForm(values: PaymentFormValues): {
  isValid: boolean;
  errors: PaymentFormErrors;
} {
  const errors: PaymentFormErrors = {};

  if (!values.student_id || !values.student_id.trim()) {
    errors.student_id = 'Please select a student.';
  }

  if (!values.payment_date || !values.payment_date.trim()) {
    errors.payment_date = 'Payment date is required.';
  }

  const numAmount = Number(values.amount);
  if (!values.amount || isNaN(numAmount) || numAmount <= 0) {
    errors.amount = 'Amount must be greater than zero.';
  }

  if (!values.currency || !values.currency.trim()) {
    errors.currency = 'Currency is required.';
  }

  const isForeign = values.currency && values.currency.trim().toUpperCase() !== 'INR';
  if (isForeign) {
    const numInInr = Number(values.in_inr);
    if (!values.in_inr || isNaN(numInInr) || numInInr <= 0) {
      errors.in_inr = 'Manual INR equivalent is required for foreign-currency payments.';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function resolveStudentPackageCurrency(
  studentId: string,
  packages: Package[],
  defaultCurrency = 'INR'
): string {
  if (!studentId) return defaultCurrency;
  const studentPackages = packages.filter((p) => p.student_id === studentId);
  const currencies = Array.from(
    new Set(
      studentPackages
        .map((p) => (p.currency ? p.currency.trim().toUpperCase() : ''))
        .filter(Boolean)
    )
  );

  if (currencies.length === 1 && currencies[0]) {
    return currencies[0];
  }
  return defaultCurrency;
}
