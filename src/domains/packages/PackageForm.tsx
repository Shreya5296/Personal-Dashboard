import React, { useState } from 'react';
import { PackageInput } from './packageTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { toInputDateFormat } from '../../lib/dateFormat';
import formStyles from '../../components/forms/forms.module.css';

export interface PackageFormProps {
  studentId: string;
  onSubmit: (input: PackageInput) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PackageForm: React.FC<PackageFormProps> = ({
  studentId,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [packageName, setPackageName] = useState('10-Class Package');
  const [totalClasses, setTotalClasses] = useState(10);
  const [classDuration, setClassDuration] = useState<number>(60);
  const [price, setPrice] = useState(10000);
  const [startDate, setStartDate] = useState(toInputDateFormat());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      student_id: studentId,
      package_name: packageName.trim(),
      total_classes: Number(totalClasses),
      class_duration: classDuration,
      duration_minutes: classDuration,
      price: Number(price),
      start_date: startDate,
    });
  };

  return (
    <form noValidate onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Package Name" required>
        <input
          className={formStyles.input}
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          placeholder="e.g. 10-Class Mathematics Pack"
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Total Classes" required>
          <input
            className={formStyles.input}
            type="number"
            min={1}
            max={500}
            value={totalClasses}
            onChange={(e) => setTotalClasses(parseInt(e.target.value, 10) || 1)}
          />
        </FormField>
        <FormField label="Class Duration" required>
          <select
            className={formStyles.select}
            value={classDuration}
            onChange={(e) => setClassDuration(Number(e.target.value))}
          >
            <option value={30}>30 minutes</option>
            <option value={40}>40 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
        <FormField label="Price (₹ INR)">
          <input
            className={formStyles.input}
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
          />
        </FormField>
        <FormField label="Start Date" required>
          <input
            className={formStyles.input}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </FormField>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
        <Button variant="secondary" type="button" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" isLoading={isLoading}>
          Create Package
        </Button>
      </div>
    </form>
  );
};
