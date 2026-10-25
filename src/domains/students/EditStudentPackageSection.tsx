import React, { useState, useEffect, useRef } from 'react';
import { Package } from '../packages/packageTypes';
import { calculatePerClassRate, calculateProjectedLastClassDate, calculateAnnualPackageMetrics } from '../packages/packageCalculations';
import { isYearlyPackage, calculateYearlyOccurrencesCount } from '../packages/yearlyPackageCalculations';
import { AnnualPackageMetricsCard } from '../packages/AnnualPackageMetricsCard';
import { EditStudentPackageModeCard } from './EditStudentPackageModeCard';
import { EditStudentPackageFields } from './EditStudentPackageFields';

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
  const consumed = Number(existingPackage?.consumed_classes || existingPackage?.classes_consumed || 0);
  const purchased = Number(values.classes_purchased || existingPackage?.classes_purchased || 0);
  const remaining = Math.max(0, purchased - consumed);
  const durLabel = existingPackage?.class_duration ? `${existingPackage.class_duration} min` : 'Not configured';

  const [, setIsManualOverride] = useState(false);
  const prevPriceRef = useRef(values.package_price);
  const prevClassesRef = useRef(values.classes_purchased);

  const startDate = firstClassDate || existingPackage?.start_date || '';
  const recurringDays = schedules.map((s) => s.day_of_week);
  const isYearly = isYearlyPackage(values.plan_type);
  const yearlyCount = isYearly && startDate && values.end_date
    ? calculateYearlyOccurrencesCount(startDate, values.end_date, schedules)
    : 0;

  useEffect(() => {
    if (isYearly && yearlyCount > 0 && String(yearlyCount) !== values.classes_purchased) {
      onChange('classes_purchased', String(yearlyCount));
    }
  }, [isYearly, yearlyCount, values.classes_purchased, onChange]);

  const projectedLastDate = !isYearly ? calculateProjectedLastClassDate(startDate, recurringDays, purchased) : values.end_date;

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
    if (!isYearly && projectedLastDate && projectedLastDate !== values.end_date) {
      onChange('end_date', projectedLastDate);
    }
  }, [isYearly, projectedLastDate, values.end_date, onChange]);

  const annualMetrics = isYearly && startDate && recurringDays.length > 0
    ? calculateAnnualPackageMetrics({ startDate, schedules, classesPurchased: purchased, packagePrice: values.package_price })
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>3. Package & Class Plan</h4>
        <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {isYearly ? 'Yearly package class count is calculated automatically from date range and schedule.' : 'Rate per class and projected last class date are calculated automatically.'}
        </p>
      </div>

      <EditStudentPackageModeCard
        existingPackage={existingPackage}
        mode={values.mode}
        consumed={consumed}
        purchased={purchased}
        remaining={remaining}
        durLabel={durLabel}
        disabled={disabled}
        onModeChange={(m) => onChange('mode', m)}
      />

      <EditStudentPackageFields
        values={values}
        errors={errors}
        isYearly={isYearly}
        yearlyCount={yearlyCount}
        projectedLastDate={projectedLastDate}
        disabled={disabled}
        onChange={onChange}
        onManualRateOverride={() => setIsManualOverride(true)}
      />

      {annualMetrics && <AnnualPackageMetricsCard metrics={annualMetrics} currency={values.currency} />}
    </div>
  );
};
