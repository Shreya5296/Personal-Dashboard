import React from 'react';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { calculateEndTime } from '../classes/scheduleDurationCalculator';
import { Button } from '../../components/buttons/Button';

export interface RenewalScheduleStepProps {
  schedules: WeeklyScheduleEntry[];
  classDuration: string;
  startDate: string;
  onChangeSchedules: (schedules: WeeklyScheduleEntry[]) => void;
  onStartDateChange: (date: string) => void;
}

const WEEKDAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const RenewalScheduleStep: React.FC<RenewalScheduleStepProps> = ({
  schedules, classDuration, startDate, onChangeSchedules, onStartDateChange,
}) => {
  const dur = Number(classDuration) || 60;

  const handleAddSlot = () => {
    const defaultDay = WEEKDAYS.find((d) => !schedules.some((s) => s.day_of_week === d)) || 'MONDAY';
    onChangeSchedules([
      ...schedules,
      { day_of_week: defaultDay, start_time: '16:00', end_time: calculateEndTime('16:00', dur) || '17:00' },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    onChangeSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: 'day_of_week' | 'start_time', value: string) => {
    const updated = schedules.map((slot, i) => {
      if (i !== index) return slot;
      if (field === 'start_time') {
        return { ...slot, start_time: value, end_time: calculateEndTime(value, dur) || slot.end_time };
      }
      return { ...slot, [field]: value };
    });
    onChangeSchedules(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
          Step 4: Configure New Weekly Schedule ({dur} min duration)
        </h4>
        <Button variant="outline" size="sm" type="button" onClick={handleAddSlot}>+ Add Day/Slot</Button>
      </div>

      <div>
        <label style={{ fontSize: '12px', fontWeight: 600 }}>Effective Schedule Start Date *</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', boxSizing: 'border-box' }}
        />
        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
          New recurring sessions will be generated starting from this date.
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {schedules.length === 0 ? (
          <div style={{ padding: '0.75rem', borderRadius: '4px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
            No schedule slots added yet. Click &ldquo;+ Add Day/Slot&rdquo; to configure days &amp; times (e.g. Tue and Fri at 4:00 PM).
          </div>
        ) : (
          schedules.map((slot, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-surface)' }}>
              <select
                value={slot.day_of_week}
                onChange={(e) => handleSlotChange(idx, 'day_of_week', e.target.value)}
                style={{ flex: 1, padding: '5px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '12px' }}
              >
                {WEEKDAYS.map((w) => (
                  <option key={w} value={w}>{w.charAt(0) + w.slice(1).toLowerCase()}</option>
                ))}
              </select>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Time:</span>
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => handleSlotChange(idx, 'start_time', e.target.value)}
                  style={{ padding: '4px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '12px' }}
                />
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>– {slot.end_time || calculateEndTime(slot.start_time, dur)}</span>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveSlot(idx)}
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}
                title="Remove slot"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
