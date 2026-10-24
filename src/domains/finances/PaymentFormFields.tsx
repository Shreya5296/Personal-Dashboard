import React from 'react';
import { Student } from '../students/studentTypes';
import { PaymentFormValues, PaymentFormErrors } from './paymentFormValidation';
import { SearchableStudentSelect } from './SearchableStudentSelect';
import { errorStyle } from './paymentModalStyles';
import formStyles from '../../components/forms/forms.module.css';

const SUPPORTED_CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'AED'];

export interface PaymentFormFieldsProps {
  values: PaymentFormValues;
  errors: PaymentFormErrors;
  students: Student[];
  studentSearch?: string;
  onStudentSearchChange?: (search: string) => void;
  onStudentChange: (studentId: string) => void;
  onValuesChange: (values: PaymentFormValues) => void;
  disabled?: boolean;
}

export const PaymentFormFields: React.FC<PaymentFormFieldsProps> = ({
  values,
  errors,
  students,
  onStudentChange,
  onValuesChange,
  disabled = false,
}) => {
  const isForeign = values.currency.toUpperCase() !== 'INR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div>
        <SearchableStudentSelect
          students={students}
          selectedStudentId={values.student_id}
          onChange={onStudentChange}
          error={errors.student_id}
          disabled={disabled}
        />
        {errors.student_id && <div style={errorStyle}>{errors.student_id}</div>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <input
            type="date"
            aria-label="Payment date"
            placeholder="Payment date"
            className={`${formStyles.input} ${errors.payment_date ? formStyles.inputError : ''}`}
            value={values.payment_date}
            onChange={(e) => onValuesChange({ ...values, payment_date: e.target.value })}
            aria-invalid={Boolean(errors.payment_date)}
            disabled={disabled}
          />
          {errors.payment_date && <div style={errorStyle}>{errors.payment_date}</div>}
        </div>
        <div>
          <select
            aria-label="Currency"
            className={formStyles.select}
            style={{ paddingRight: '2.5rem' }}
            value={values.currency}
            onChange={(e) => onValuesChange({ ...values, currency: e.target.value })}
            disabled={disabled}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isForeign ? '1fr 1fr' : '1fr', gap: 'var(--space-3)' }}>
        <div>
          <input
            type="number"
            min="0.01"
            step="any"
            aria-label={isForeign ? 'Amount in original currency' : 'Amount in INR'}
            placeholder={isForeign ? 'Amount in original currency' : 'Amount in INR'}
            className={`${formStyles.input} ${errors.amount ? formStyles.inputError : ''}`}
            value={values.amount}
            onChange={(e) => onValuesChange({ ...values, amount: e.target.value })}
            aria-invalid={Boolean(errors.amount)}
            disabled={disabled}
          />
          {errors.amount && <div style={errorStyle}>{errors.amount}</div>}
        </div>

        {isForeign && (
          <div>
            <input
              type="number"
              min="0.01"
              step="any"
              aria-label="Amount in INR"
              placeholder="Amount in INR"
              className={`${formStyles.input} ${errors.in_inr ? formStyles.inputError : ''}`}
              value={values.in_inr}
              onChange={(e) => onValuesChange({ ...values, in_inr: e.target.value })}
              aria-invalid={Boolean(errors.in_inr)}
              disabled={disabled}
            />
            {errors.in_inr && <div style={errorStyle}>{errors.in_inr}</div>}
          </div>
        )}
      </div>
    </div>
  );
};
