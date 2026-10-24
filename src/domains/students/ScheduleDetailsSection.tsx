import React from 'react';
import { ScheduleItem } from './registrationTypes';
import { Button } from '../../components/buttons/Button';
import formStyles from '../../components/forms/forms.module.css';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export interface ScheduleDetailsSectionProps {
  schedules: ScheduleItem[];
  errors?: Record<string, string>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, field: 'day_of_week' | 'start_time' | 'end_time', value: string) => void;
  disabled?: boolean;
}

export const ScheduleDetailsSection: React.FC<ScheduleDetailsSectionProps> = ({
  schedules,
  errors = {},
  onAdd,
  onRemove,
  onChange,
  disabled = false,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
          4. Class Schedule (Recurring Weekly)
        </h4>
        <Button variant="secondary" size="sm" type="button" onClick={onAdd} disabled={disabled}>
          + Add Schedule
        </Button>
      </div>

      {schedules.length === 0 ? (
        <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          No recurring schedule entries configured yet. Click "+ Add Schedule" to add class days and times.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {schedules.map((entry, idx) => {
            const dayErr = errors[`entry_${entry.id}_day`];
            const startErr = errors[`entry_${entry.id}_start`];
            const endErr = errors[`entry_${entry.id}_end`];
            const timeErr = errors[`entry_${entry.id}_time`];

            return (
              <div
                key={entry.id}
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
                  />
                  {startErr && <span style={{ fontSize: '11px', color: 'var(--color-danger)' }}>{startErr}</span>}
                </div>

                <div style={{ flex: '1 1 120px' }}>
                  <input
                    type="time"
                    className={formStyles.input}
                    value={entry.end_time}
                    onChange={(e) => onChange(entry.id, 'end_time', e.target.value)}
                    disabled={disabled}
                    aria-label={`Schedule entry ${idx + 1} end time`}
                  />
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
          })}
        </div>
      )}
    </div>
  );
};
