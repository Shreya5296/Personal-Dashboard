import React, { useState, useEffect, useRef } from 'react';
import { Package } from '../packages/packageTypes';
import { FormField } from '../../components/forms/FormField';
import formStyles from '../../components/forms/forms.module.css';
import { calculatePerClassRate, calculateProjectedLastClassDate, calculateAnnualPackageMetrics } from '../packages/packageCalculations';
import { AnnualPackageMetricsCard } from '../packages/AnnualPackageMetricsCard';

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
  firstClassDate?: string;
  schedules?: Array<{ day_of_week: string }>;
  disabled?: boolean;
}

export const EditStudentPackageSection: React.FC<EditStudentPackageSectionProps> = ({
  existingPackage, values, errors = {}, onChange, firstClassDate = '', schedules = [], disabled = false,
}) => {
  const hasExisting = Boolean(existingPackage);
  const consumed = Number(existingPackage?.consumed_classes || existingPackage?.classes_consumed || 0);
  const purchased = Number(values.classes_purchased || existingPackage?.classes_purchased || 0);
  const remaining = Math.max(0, purchased - consumed);
  const durLabel = existingPackage?.class_duration ? `${existingPackage.class_duration} min` : 'Not configured';

  const [, setIsManualOverride] = useState(false);
  const prevPriceRef = useRef(values.package_price);
  const prevClassesRef = useRef(values.classes_purchased);

  const startDate = firstClassDate || existingPackage?.start_date || '';
  const recurringDays = schedules.map((s) => s.day_of_week);
  const projectedLastDate = calculateProjectedLastClassDate(startDate, recurringDays, purchased);

  useEffect(() => {
    const priceChanged = prevPriceRef.current !== values.package_price;
    const classesChanged = prevClassesRef.current !== values.classes_purchased;

    if (priceChanged || classesChanged) {
      prevPriceRef.current = values.package_price;
      prevClassesRef.current = values.classes_purchased;
      setIsManualOverride(false);
      const rate = calculatePerClassRate(values.package_price, values.classes_purchased);
      onChange('per_class', rate > 0 ? String(rate) : '');
    }
  }, [values.package_price, values.classes_purchased, onChange]);

  useEffect(() => {
    if (projectedLastDate && projectedLastDate !== values.end_date) onChange('end_date', projectedLastDate);
  }, [projectedLastDate, values.end_date, onChange]);

  const isAnnual = values.plan_type.toLowerCase().includes('annual') || values.plan_type.toLowerCase().includes('early') || purchased >= 40;
  const annualMetrics = isAnnual && startDate && recurringDays.length > 0
    ? calculateAnnualPackageMetrics({ startDate, schedules, classesPurchased: purchased, packagePrice: values.package_price })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>3. Package & Class Plan</h4>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>Rate per class and projected last class date are calculated automatically.</p>
      </div>

      {hasExisting && (
        <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)' }}>
          <div style={{ fontWeight: 600, color: '#166534' }}>Current Package: {existingPackage?.package_name || existingPackage?.plan_type} ({existingPackage?.package_id})</div>
          <div style={{ color: '#15803d' }}>Classes: <strong>{consumed}</strong> done / <strong>{purchased}</strong> purchased ({remaining} remaining). Duration: <strong>{durLabel}</strong>.</div>
          <div style={{ marginTop: '6px', display: 'flex', gap: 'var(--space-4)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: values.mode === 'EDIT_EXISTING' ? 600 : 400 }}>
              <input type="radio" name="pkg_mode" checked={values.mode === 'EDIT_EXISTING'} onChange={() => onChange('mode', 'EDIT_EXISTING')} disabled={disabled} /> Edit Existing Package
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: values.mode === 'CREATE_NEW' ? 600 : 400 }}>
              <input type="radio" name="pkg_mode" checked={values.mode === 'CREATE_NEW'} onChange={() => onChange('mode', 'CREATE_NEW')} disabled={disabled} /> Assign New Package
            </label>
          </div>
        </div>
      )}

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
        <FormField label="Classes Purchased" error={errors.classes_purchased}>
          <input className={formStyles.input} type="number" min="1" step="1" value={values.classes_purchased} onChange={(e) => onChange('classes_purchased', e.target.value)} placeholder="e.g. 10" disabled={disabled} />
        </FormField>
        <FormField label="Per-Class Rate" error={errors.per_class}>
          <input className={formStyles.input} type="number" min="0" step="any" value={values.per_class} onChange={(e) => { setIsManualOverride(true); onChange('per_class', e.target.value); }} placeholder="Calculated automatically" disabled={disabled} />
        </FormField>
        <FormField label="Projected Last Class Date">
          <input className={formStyles.input} type="text" readOnly value={projectedLastDate || 'Calculated from schedule & classes'} disabled style={{ backgroundColor: 'var(--color-bg-subtle)', cursor: 'not-allowed' }} />
        </FormField>
      </div>

      {annualMetrics && <AnnualPackageMetricsCard metrics={annualMetrics} currency={values.currency} />}
    </div>
  );
};
