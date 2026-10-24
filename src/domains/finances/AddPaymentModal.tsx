import React, { useState, useEffect } from 'react';
import { Package } from '../packages/packageTypes';
import { Student } from '../students/studentTypes';
import { fetchStudents } from '../students/studentApi';
import { recordPayment } from '../payments/paymentApi';
import { toInputDateFormat } from '../../lib/dateFormat';
import { formatCurrency } from '../../lib/currencyFormat';
import { Button } from '../../components/buttons/Button';
import {
  PaymentFormValues,
  PaymentFormErrors,
  validatePaymentForm,
  resolveStudentPackageCurrency,
} from './paymentFormValidation';
import { PaymentFormFields } from './PaymentFormFields';
import {
  backdropStyle,
  dialogStyle,
  headerStyle,
  closeButtonStyle,
  serverErrorStyle,
  actionRowStyle,
} from './paymentModalStyles';

export interface AddPaymentModalProps {
  isOpen: boolean;
  token?: string | null;
  packages: Package[];
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  token,
  packages,
  onClose,
  onSuccess,
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [values, setValues] = useState<PaymentFormValues>({
    student_id: '',
    payment_date: toInputDateFormat(),
    amount: '',
    currency: 'INR',
    in_inr: '',
  });
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    fetchStudents({}, token).then((data) => setStudents(data)).catch(() => {});
  }, [isOpen, token]);

  if (!isOpen) return null;

  const handleStudentChange = (stuId: string) => {
    const cur = resolveStudentPackageCurrency(stuId, packages);
    setValues((prev) => ({
      ...prev,
      student_id: stuId,
      currency: cur,
      in_inr: cur === 'INR' ? '' : prev.in_inr,
    }));
    setErrors((prev) => ({ ...prev, student_id: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const { isValid, errors: valErrors } = validatePaymentForm(values);
    if (!isValid) {
      setErrors(valErrors);
      return;
    }

    const selectedStudent = students.find((s) => s.student_id === values.student_id);
    const studentName = selectedStudent ? selectedStudent.student_name : values.student_id;
    const isForeign = values.currency.toUpperCase() !== 'INR';
    const numAmount = Number(values.amount);
    const numInInr = isForeign ? Number(values.in_inr) : numAmount;

    setIsSubmitting(true);
    try {
      await recordPayment(
        {
          student_id: values.student_id,
          student_name: studentName,
          amount: numAmount,
          currency: values.currency.toUpperCase(),
          in_inr: numInInr,
          payment_date: values.payment_date,
          payment_method: 'RECORDED',
        },
        token
      );
      const formattedAmt = formatCurrency(numAmount, true, values.currency.toUpperCase());
      await onSuccess(`Payment of ${formattedAmt} for ${studentName} recorded successfully.`);
    } catch (err: unknown) {
      setServerError((err as Error).message || 'Failed to record payment. Please check inputs and retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={backdropStyle} role="dialog" aria-modal="true" aria-labelledby="add-payment-title">
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <h3 id="add-payment-title" style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Record Student Payment</h3>
          <button type="button" onClick={onClose} disabled={isSubmitting} style={closeButtonStyle} aria-label="Close">✕</button>
        </div>

        {serverError && <div style={serverErrorStyle}>⚠️ {serverError}</div>}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <PaymentFormFields
            values={values}
            errors={errors}
            students={students}
            onStudentChange={handleStudentChange}
            onValuesChange={setValues}
            disabled={isSubmitting}
          />
          <div style={actionRowStyle}>
            <Button variant="secondary" type="button" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={isSubmitting}>Save Payment</Button>
          </div>
        </form>
      </div>
    </div>
  );
};
