import React from 'react';
import { ScheduleItem } from './registrationTypes';
import { ScheduleItemRow } from './ScheduleItemRow';
import { Button } from '../../components/buttons/Button';
import formStyles from '../../components/forms/forms.module.css';

export interface ScheduleDetailsSectionProps {
  schedules: ScheduleItem[];
  classDuration?: number | string;
  firstClassDate?: string;
  autoSchedule?: boolean;
  errors?: Record<string, string>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: 'day_of_week' | 'start_time' | 'end_time', value: string) => void;
  onFirstClassDateChange?: (date: string) => void;
  onAutoScheduleChange?: (enabled: boolean) => void;
  disabled?: boolean;
}

export const ScheduleDetailsSection: React.FC<ScheduleDetailsSectionProps> = ({
  schedules,
  classDuration,
  firstClassDate = '',
  autoSchedule = false,
  errors = {},
  onAdd,
  onRemove,
  onChange,
  onFirstClassDateChange,
  onAutoScheduleChange,
  disabled = false,
}) => {
  const dur = Number(classDuration) || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
            4. Class Schedule & Auto-Scheduling
          </h4>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {dur > 0 ? `Duration: ${dur} min (end time calculated automatically)` : 'Duration: Not configured'}
          </span>
        </div>
        <Button variant="secondary" size="sm" type="button" onClick={onAdd} disabled={disabled}>
          + Add Schedule
        </Button>
      </div>

      {!dur && (
        <div style={{ padding: '6px 12px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 'var(--radius-md)', fontSize: '12px', color: '#92400e' }}>
          Select a <strong>Class Duration</strong> (30, 40, or 60 minutes) in Package Details above to calculate schedule end times.
        </div>
      )}

      {schedules.length === 0 ? (
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          No recurring schedule entries configured yet. Click "+ Add Schedule" to add class days and times.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {schedules.map((entry, idx) => (
            <ScheduleItemRow
              key={entry.id}
              entry={entry}
              idx={idx}
              errors={errors}
              onChange={onChange}
              onRemove={onRemove}
              disabled={disabled}
            />
          ))}
        </div>
      )}

      {schedules.length > 0 && onFirstClassDateChange && (
        <div style={{ marginTop: 'var(--space-2)', padding: '10px 14px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)' }}>
              First Class Date:
            </label>
            <input
              type="date"
              className={formStyles.input}
              style={{ maxWidth: '200px' }}
              value={firstClassDate}
              onChange={(e) => onFirstClassDateChange(e.target.value)}
              disabled={disabled}
            />
          </div>

          {onAutoScheduleChange && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-main)' }}>
              <input
                type="checkbox"
                checked={autoSchedule}
                onChange={(e) => onAutoScheduleChange(e.target.checked)}
                disabled={disabled || !firstClassDate}
              />
              <span style={{ fontWeight: 500 }}>
                Automatically schedule classes according to package
              </span>
            </label>
          )}

          {autoSchedule && (
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Generates dated class sessions from the selected first class date matching the remaining package classes.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
