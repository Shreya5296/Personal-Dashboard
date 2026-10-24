import React from 'react';
import { Student } from '../students/studentTypes';
import { PaymentFormValues, PaymentFormErrors } from './paymentFormValidation';
import { labelStyle, errorStyle } from './paymentModalStyles';
import formStyles from '../../components/forms/forms.module.css';

const SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'AED'];

export interface PaymentFormFieldsProps {
  values: PaymentFormValues;
  errors: PaymentFormErrors;
  students: Student[];
  studentSearch: string;
  onStudentSearchChange: (search: string) => void;
  onStudentChange: (studentId: string) => void;
  onValuesChange: (values: PaymentFormValues) => void;
}

export const PaymentFormFields: React.FC<PaymentFormFieldsProps> = ({
  values,
  errors,
  students,
  studentSearch,
  onStudentSearchChange,
  onStudentChange,
  onValuesChange,
}) => {
  const isForeign = values.currency.toUpperCase() !== 'INR';

  const filteredStudents = students.filter((s) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return (s.student_name || '').toLowerCase().includes(q) || s.student_id.toLowerCase().includes(q);
  });

  return (
    <>
      <div>
        <label style={labelStyle}>Student *</label>
        <input
          type="search"
          placeholder="Filter students…"
          value={studentSearch}
          onChange={(e) => onStudentSearchChange(e.target.value)}
          className={formStyles.input}
          style={{ marginBottom: '6px', fontSize: 'var(--font-size-xs)' }}
        />
        <select
          className={formStyles.select}
          value={values.student_id}
          onChange={(e) => onStudentChange(e.target.value)}
          aria-invalid={Boolean(errors.student_id)}
        >
          <option value="">-- Select Student --</option>
          {filteredStudents.map((s) => (
            <option key={s.student_id} value={s.student_id}>
              {s.student_name} ({s.student_id}){s.subject ? ` — ${s.subject}` : ''}
            </option>
          ))}
        </select>
        {errors.student_id && <div style={errorStyle}>{errors.student_id}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label style={labelStyle}>Payment Date *</label>
          <input
            type="date"
            className={formStyles.input}
            value={values.payment_date}
            onChange={(e) => onValuesChange({ ...values, payment_date: e.target.value })}
            aria-invalid={Boolean(errors.payment_date)}
          />
          {errors.payment_date && <div style={errorStyle}>{errors.payment_date}</div>}
        </div>
        <div>
          <label style={labelStyle}>Currency *</label>
          <select
            className={formStyles.select}
            value={values.currency}
            onChange={(e) => onValuesChange({ ...values, currency: e.target.value })}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isForeign ? '1fr 1fr' : '1fr', gap: 'var(--space-3)' }}>
        <div>
          <label style={labelStyle}>Amount ({values.currency}) *</label>
          <input
            type="number"
            min="0.01"
            step="any"
            placeholder="0.00"
            className={formStyles.input}
            value={values.amount}
            onChange={(e) => onValuesChange({ ...values, amount: e.target.value })}
            aria-invalid={Boolean(errors.amount)}
          />
          {errors.amount && <div style={errorStyle}>{errors.amount}</div>}
        </div>

        {isForeign && (
          <div>
            <label style={labelStyle}>Amount in INR (Manual) *</label>
            <input
              type="number"
              min="0.01"
              step="any"
              placeholder="Equivalent ₹ INR"
              className={formStyles.input}
              value={values.in_inr}
              onChange={(e) => onValuesChange({ ...values, in_inr: e.target.value })}
              aria-invalid={Boolean(errors.in_inr)}
            />
            {errors.in_inr && <div style={errorStyle}>{errors.in_inr}</div>}
          </div>
        )}
      </div>
    </>
  );
};
