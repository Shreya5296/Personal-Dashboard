import React from 'react';
import { ScheduleItem } from './registrationTypes';
import { Button } from '../../components/buttons/Button';
import formStyles from '../../components/forms/forms.module.css';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export interface ScheduleItemRowProps {
  entry: ScheduleItem;
  idx: number;
  errors?: Record<string, string>;
  onChange: (id: string, field: 'day_of_week' | 'start_time' | 'end_time', value: string) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export const ScheduleItemRow: React.FC<ScheduleItemRowProps> = ({
  entry,
  idx,
  errors = {},
  onChange,
  onRemove,
  disabled = false,
}) => {
  const dayErr = errors[`entry_${entry.id}_day`];
  const startErr = errors[`entry_${entry.id}_start`];
  const endErr = errors[`entry_${entry.id}_end`];
  const timeErr = errors[`entry_${entry.id}_time`];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '8px 12px',
        backgroundColor: 'var(--color-bg-subtle)',
        borderRadius: 'var(--radius-md)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 140px' }}>
        <select
          className={formStyles.select}
          style={{ paddingRight: '2.5rem' }}
          value={entry.day_of_week}
          onChange={(e) => onChange(entry.id, 'day_of_week', e.target.value)}
          disabled={disabled}
          aria-label={`Schedule entry ${idx + 1} day`}
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        {dayErr && <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{dayErr}</span>}
      </div>

      <div style={{ flex: '1 1 120px' }}>
        <input
          type="time"
          className={formStyles.input}
          value={entry.start_time}
          onChange={(e) => onChange(entry.id, 'start_time', e.target.value)}
          disabled={disabled}
          aria-label={`Schedule entry ${idx + 1} start time`}
        >
        </input>
        {startErr && <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{startErr}</span>}
      </div>

      <div style={{ flex: '1 1 130px' }}>
        <div
          style={{
            padding: '0.45rem 0.65rem',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            color: entry.end_time ? 'var(--color-text-main)' : 'var(--color-text-muted)',
            lineHeight: '1.25rem',
            whiteSpace: 'nowrap',
          }}
          title="End time is automatically calculated from duration"
        >
          {entry.end_time ? `End: ${entry.end_time}` : 'End: --:--'}
        </div>
        {endErr && <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{endErr}</span>}
      </div>

      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => onRemove(entry.id)}
        disabled={disabled}
        aria-label={`Remove schedule entry ${idx + 1}`}
      >
        ✕ Remove
      </Button>

      {timeErr && (
        <div style={{ width: '100%', fontSize: '11px', color: 'var(--color-danger)' }}>
          {timeErr}
        </div>
      )}
    </div>
  );
};
