import React from 'react';
import { Package } from '../packages/packageTypes';

export interface EditStudentPackageModeCardProps {
  existingPackage?: Package | null;
  mode: 'EDIT_EXISTING' | 'CREATE_NEW';
  consumed: number;
  purchased: number;
  remaining: number;
  durLabel: string;
  disabled?: boolean;
  onModeChange: (mode: 'EDIT_EXISTING' | 'CREATE_NEW') => void;
}

export const EditStudentPackageModeCard: React.FC<EditStudentPackageModeCardProps> = ({
  existingPackage,
  mode,
  consumed,
  purchased,
  remaining,
  durLabel,
  disabled = false,
  onModeChange,
}) => {
  if (!existingPackage) return null;

  return (
    <div style={{ padding: '8px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', fontSize: 'var(--font-size-xs)' }}>
      <div style={{ fontWeight: 600, color: '#166534' }}>
        Current Package: {existingPackage.package_name || existingPackage.plan_type} ({existingPackage.package_id})
      </div>
      <div style={{ color: '#15803d' }}>
        Classes: <strong>{consumed}</strong> done / <strong>{purchased}</strong> purchased ({remaining} remaining). Duration: <strong>{durLabel}</strong>.
      </div>
      <div style={{ marginTop: '6px', display: 'flex', gap: 'var(--space-4)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: mode === 'EDIT_EXISTING' ? 600 : 400 }}>
          <input type="radio" name="pkg_mode" checked={mode === 'EDIT_EXISTING'} onChange={() => onModeChange('EDIT_EXISTING')} disabled={disabled} /> Edit Existing Package
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontWeight: mode === 'CREATE_NEW' ? 600 : 400 }}>
          <input type="radio" name="pkg_mode" checked={mode === 'CREATE_NEW'} onChange={() => onModeChange('CREATE_NEW')} disabled={disabled} /> Assign New Package
        </label>
      </div>
    </div>
  );
};
