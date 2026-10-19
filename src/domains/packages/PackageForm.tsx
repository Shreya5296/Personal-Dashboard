import React, { useState } from 'react';
import { PackageInput } from './packageTypes';
import { FormField } from '../../components/forms/FormField';
import { Button } from '../../components/buttons/Button';
import { toInputDateFormat } from '../../lib/dateFormat';

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
  const [price, setPrice] = useState(10000);
  const [startDate, setStartDate] = useState(toInputDateFormat());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      student_id: studentId,
      package_name: packageName.trim(),
      total_classes: Number(totalClasses),
      price: Number(price),
      start_date: startDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <FormField label="Package Name" required>
        <input
          type="text"
          value={packageName}
          onChange={(e) => setPackageName(e.target.value)}
          placeholder="e.g. 10-Class Mathematics Pack"
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <FormField label="Total Classes" required>
          <input
            type="number"
            min={1}
            max={500}
            value={totalClasses}
            onChange={(e) => setTotalClasses(parseInt(e.target.value, 10) || 1)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
        <FormField label="Price (₹ INR)">
          <input
            type="number"
            min={0}
            step={100}
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
          />
        </FormField>
      </div>

      <FormField label="Start Date" required>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-strong)' }}
        />
      </FormField>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
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
