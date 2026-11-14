import React from 'react';
import { RenewalFormData } from './packageRenewalTypes';
import { calculatePerClassRate } from './packageCalculations';

export interface RenewalPackageDetailsStepProps {
  data: RenewalFormData;
  onChange: (field: keyof RenewalFormData, value: any) => void;
  errors?: Record<string, string>;
}

export const RenewalPackageDetailsStep: React.FC<RenewalPackageDetailsStepProps> = ({
  data, onChange, errors = {},
}) => {
  const handlePriceChange = (val: string) => {
    onChange('package_price', val);
    const count = Number(data.new_classes_purchased);
    if (count > 0 && val) {
      const perClass = calculatePerClassRate(Number(val), count);
      onChange('per_class', perClass > 0 ? String(perClass) : '');
    }
  };

  const handleClassesChange = (val: string) => {
    onChange('new_classes_purchased', val);
    const count = Number(val);
    const price = Number(data.package_price);
    if (count > 0 && price > 0) {
      const perClass = calculatePerClassRate(price, count);
      onChange('per_class', perClass > 0 ? String(perClass) : '');
    } else if (count > 0 && Number(data.per_class) > 0) {
      onChange('package_price', String(Math.round(count * Number(data.per_class) * 100) / 100));
    }
  };

  const handlePerClassChange = (val: string) => {
    onChange('per_class', val);
    const rate = Number(val);
    const count = Number(data.new_classes_purchased);
    if (rate > 0 && count > 0) onChange('package_price', String(Math.round(count * rate * 100) / 100));
  };

  const inputStyle = { width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', boxSizing: 'border-box' as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
        Step 3: Configure New Package Commercial Terms
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Plan Type</label>
          <select value={data.plan_type} onChange={(e) => onChange('plan_type', e.target.value)} style={inputStyle}>
            <option value="Per Class">Per Class</option>
            <option value="PACKAGE">Package</option>
            <option value="HOURLY">Hourly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Currency *</label>
          <select value={data.currency} onChange={(e) => onChange('currency', e.target.value)} style={inputStyle}>
            <option value="INR">INR (₹)</option>
            <option value="AUD">AUD (A$)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="EUR">EUR (€)</option>
            <option value="SGD">SGD (S$)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Newly Purchased Classes *</label>
          <input type="number" min="1" value={data.new_classes_purchased} onChange={(e) => handleClassesChange(e.target.value)} placeholder="e.g. 12" style={{ ...inputStyle, border: errors.new_classes_purchased ? '1px solid #ef4444' : inputStyle.border }} />
          {errors.new_classes_purchased && <span style={{ fontSize: '11px', color: '#ef4444' }}>{errors.new_classes_purchased}</span>}
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Class Duration</label>
          <select value={data.class_duration} onChange={(e) => onChange('class_duration', e.target.value)} style={inputStyle}>
            <option value="30">30 minutes</option>
            <option value="40">40 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Per-Class Fee ({data.currency})</label>
          <input type="number" step="0.01" value={data.per_class} onChange={(e) => handlePerClassChange(e.target.value)} placeholder="e.g. 10.50" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Total Package Price ({data.currency})</label>
          <input type="number" step="0.01" value={data.package_price} onChange={(e) => handlePriceChange(e.target.value)} placeholder="e.g. 126.00" style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Package Start Date</label>
          <input type="date" value={data.start_date} onChange={(e) => onChange('start_date', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600 }}>Package End Date</label>
          <input type="date" value={data.end_date} onChange={(e) => onChange('end_date', e.target.value)} style={inputStyle} />
        </div>
      </div>
    </div>
  );
};
