import React, { useEffect } from 'react';
import { PackageDetails } from './registrationTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';
import { calculatePerClassRate } from '../packages/packageCalculations';

const PLAN_TYPES = ['Package', 'Annual / Early Childhood', 'Per Class', 'Hourly', 'Monthly'];
const CURRENCIES = ['INR', 'USD', 'GBP', 'EUR', 'CAD', 'AUD', 'SGD', 'AED'];
const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '40', label: '40 minutes' },
  { value: '60', label: '60 minutes' },
];

export interface PackageDetailsSectionProps {
  values: PackageDetails;
  errors?: Partial<Record<keyof PackageDetails, string>>;
  onChange: (field: keyof PackageDetails, value: string) => void;
  disabled?: boolean;
}

export const PackageDetailsSection: React.FC<PackageDetailsSectionProps> = ({
  values,
  errors,
  onChange,
  disabled = false,
}) => {
  const autoRate = calculatePerClassRate(values.package_price, values.classes_purchased);

  useEffect(() => {
    if (autoRate > 0 && String(autoRate) !== values.per_class) {
      onChange('per_class', String(autoRate));
    }
  }, [autoRate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        3. Package Details
      </h4>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Plan Type">
          <select
            className={formStyles.select}
            style={{ paddingRight: '2.5rem' }}
            value={values.plan_type}
            onChange={(e) => onChange('plan_type', e.target.value)}
            disabled={disabled}
          >
            {PLAN_TYPES.map((pt) => (
              <option key={pt} value={pt}>{pt}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Currency">
          <select
            className={formStyles.select}
            style={{ paddingRight: '2.5rem' }}
            value={values.currency}
            onChange={(e) => onChange('currency', e.target.value)}
            disabled={disabled}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Class Duration" error={errors?.class_duration}>
          <select
            className={`${formStyles.select} ${errors?.class_duration ? formStyles.inputError : ''}`}
            style={{ paddingRight: '2.5rem' }}
            value={values.class_duration || ''}
            onChange={(e) => onChange('class_duration', e.target.value)}
            disabled={disabled}
          >
            <option value="">Select duration…</option>
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Package Price" error={errors?.package_price}>
          <input
            type="number"
            min="0"
            step="any"
            className={`${formStyles.input} ${errors?.package_price ? formStyles.inputError : ''}`}
            placeholder="e.g. 25000"
            value={values.package_price}
            onChange={(e) => onChange('package_price', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Classes Purchased" error={errors?.classes_purchased}>
          <input
            type="number"
            min="1"
            step="1"
            className={`${formStyles.input} ${errors?.classes_purchased ? formStyles.inputError : ''}`}
            placeholder="e.g. 20"
            value={values.classes_purchased}
            onChange={(e) => onChange('classes_purchased', e.target.value)}
            disabled={disabled}
          />
        </FormField>
        <FormField label="Per-Class Rate (Calculated)">
          <input
            type="text"
            readOnly
            className={formStyles.input}
            value={autoRate > 0 ? `${values.currency} ${autoRate}` : 'Calculated automatically'}
            disabled
            style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed' }}
          />
        </FormField>
      </div>
    </div>
  );
};
