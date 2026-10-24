import React from 'react';
import { Package } from '../packages/packageTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';

export interface PackageFormData {
  package_id?: string;
  mode: 'EDIT_EXISTING' | 'CREATE_NEW';
  plan_type: string;
  currency: string;
  package_price: string;
  per_class: string;
  classes_purchased: string;
  class_duration: string;
  end_date: string;
}

export interface EditStudentPackageSectionProps {
  existingPackage?: Package | null;
  values: PackageFormData;
  errors?: Record<string, string>;
  onChange: (field: keyof PackageFormData, value: string) => void;
  disabled?: boolean;
}

const DURATION_OPTIONS = [
  { value: '30', label: '30 minutes' },
  { value: '40', label: '40 minutes' },
  { value: '60', label: '60 minutes' },
];

export const EditStudentPackageSection: React.FC<EditStudentPackageSectionProps> = ({
  existingPackage,
  values,
  errors = {},
  onChange,
  disabled = false,
}) => {
  const hasExisting = Boolean(existingPackage);
  const consumed = Number(existingPackage?.consumed_classes || existingPackage?.classes_consumed || 0);
  const purchased = Number(existingPackage?.classes_purchased || existingPackage?.total_classes || 0);
  const remaining = Math.max(0, purchased - consumed);
  const durLabel = existingPackage?.class_duration ? `${existingPackage.class_duration} min` : 'Not configured';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
          3. Package & Class Plan
        </h4>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          View and edit class package, class duration, rate per class, and total purchased sessions.
        </p>
      </div>

      {hasExisting && (
        <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)' }}>
          <div style={{ fontWeight: 600, color: '#166534', marginBottom: '2px' }}>
            Current Active Package: {existingPackage?.package_name || existingPackage?.plan_type} ({existingPackage?.package_id})
          </div>
          <div style={{ color: '#15803d' }}>
            Classes: <strong>{consumed}</strong> done / <strong>{purchased}</strong> purchased ({remaining} remaining). Duration: <strong>{durLabel}</strong>.
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: values.mode === 'EDIT_EXISTING' ? 600 : 400 }}>
              <input type="radio" name="pkg_mode" checked={values.mode === 'EDIT_EXISTING'} onChange={() => onChange('mode', 'EDIT_EXISTING')} disabled={disabled} />
              Edit Existing Package
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: values.mode === 'CREATE_NEW' ? 600 : 400 }}>
              <input type="radio" name="pkg_mode" checked={values.mode === 'CREATE_NEW'} onChange={() => onChange('mode', 'CREATE_NEW')} disabled={disabled} />
              Assign New Package
            </label>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Plan Type" error={errors.plan_type}>
          <select className={formStyles.select} value={values.plan_type} onChange={(e) => onChange('plan_type', e.target.value)} disabled={disabled}>
            <option value="Package">Package (Class Block)</option>
            <option value="Monthly">Monthly Retainer</option>
            <option value="Per-Class">Per-Class Billing</option>
            <option value="Custom">Custom Plan</option>
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
            <option value="">Not configured — select duration</option>
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Package Price" error={errors.package_price}>
          <input className={formStyles.input} type="number" min="0" step="any" value={values.package_price} onChange={(e) => onChange('package_price', e.target.value)} placeholder="e.g. 15000" disabled={disabled} />
        </FormField>
        <FormField label="Classes Purchased" error={errors.classes_purchased}>
          <input className={formStyles.input} type="number" min="1" step="1" value={values.classes_purchased} onChange={(e) => onChange('classes_purchased', e.target.value)} placeholder="e.g. 10" disabled={disabled} />
        </FormField>
        <FormField label="Per-Class Rate" error={errors.per_class}>
          <input className={formStyles.input} type="number" min="0" step="any" value={values.per_class} onChange={(e) => onChange('per_class', e.target.value)} placeholder="e.g. 1500" disabled={disabled} />
        </FormField>
        <FormField label="Package Expiry Date" error={errors.end_date}>
          <input className={formStyles.input} type="date" value={values.end_date} onChange={(e) => onChange('end_date', e.target.value)} disabled={disabled} />
        </FormField>
      </div>
    </div>
  );
};
