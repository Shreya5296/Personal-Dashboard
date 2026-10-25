import React from 'react';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';
import { PackageFormData } from './EditStudentPackageSection';

export interface EditStudentPackageFieldsProps {
  values: PackageFormData;
  errors?: Record<string, string>;
  isYearly: boolean;
  yearlyCount: number;
  projectedLastDate: string;
  disabled?: boolean;
  onChange: (field: keyof PackageFormData, value: string) => void;
  onManualRateOverride: () => void;
}

export const EditStudentPackageFields: React.FC<EditStudentPackageFieldsProps> = ({
  values, errors = {}, isYearly, yearlyCount, projectedLastDate, disabled = false, onChange, onManualRateOverride,
}) => {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Plan Type" error={errors.plan_type}>
          <select className={formStyles.select} value={values.plan_type} onChange={(e) => onChange('plan_type', e.target.value)} disabled={disabled}>
            <option value="Package">Package (Class Block)</option>
            <option value="Annual / Early Childhood">Annual / Early Childhood Package</option>
            <option value="Monthly">Monthly Retainer</option>
            <option value="Per-Class">Per-Class Billing</option>
          </select>
        </FormField>
        <FormField label="Currency" error={errors.currency}>
          <select className={formStyles.select} value={values.currency} onChange={(e) => onChange('currency', e.target.value)} disabled={disabled}>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </FormField>
        <FormField label="Class Duration" error={errors.class_duration}>
          <select className={formStyles.select} value={values.class_duration || ''} onChange={(e) => onChange('class_duration', e.target.value)} disabled={disabled}>
            <option value="">Select duration…</option>
            <option value="30">30 minutes</option>
            <option value="40">40 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Package Price" error={errors.package_price}>
          <input className={formStyles.input} type="number" min="0" step="any" value={values.package_price} onChange={(e) => onChange('package_price', e.target.value)} placeholder="e.g. 15000" disabled={disabled} />
        </FormField>
        <FormField label={isYearly ? 'Classes (Calculated)' : 'Classes Purchased'} error={errors.classes_purchased}>
          <input
            className={formStyles.input}
            type={isYearly ? 'text' : 'number'}
            min={isYearly ? undefined : 1}
            step={isYearly ? undefined : 1}
            readOnly={isYearly}
            value={isYearly ? (yearlyCount > 0 ? `${yearlyCount} classes` : 'Provide dates & schedule') : values.classes_purchased}
            onChange={(e) => !isYearly && onChange('classes_purchased', e.target.value)}
            placeholder={isYearly ? 'Auto-calculated' : 'e.g. 10'}
            disabled={disabled}
            style={isYearly ? { backgroundColor: 'var(--color-bg-subtle)', fontWeight: 600 } : undefined}
          />
        </FormField>
        <FormField label="Per-Class Rate" error={errors.per_class}>
          <input className={formStyles.input} type="number" min="0" step="any" value={values.per_class} onChange={(e) => { onManualRateOverride(); onChange('per_class', e.target.value); }} placeholder="Calculated automatically" disabled={disabled} />
        </FormField>
        <FormField label={isYearly ? 'Package End Date' : 'Projected Last Class Date'} required={isYearly}>
          {isYearly ? (
            <input className={formStyles.input} type="date" value={values.end_date || ''} onChange={(e) => onChange('end_date', e.target.value)} disabled={disabled} />
          ) : (
            <input className={formStyles.input} type="text" readOnly value={projectedLastDate || 'Calculated from schedule & classes'} disabled style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed' }} />
          )}
        </FormField>
      </div>
    </>
  );
};
