import React from 'react';
import { CalendarViewMode } from './calendarTypes';
import { Button } from '../../components/buttons/Button';

export interface CalendarControlsBarProps {
  viewMode: CalendarViewMode;
  onChangeViewMode: (mode: CalendarViewMode) => void;
  titleText: string;
  countLabel?: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onRefresh: () => void;
}

export const CalendarControlsBar: React.FC<CalendarControlsBarProps> = ({
  viewMode,
  onChangeViewMode,
  titleText,
  countLabel,
  onPrev,
  onNext,
  onToday,
  onRefresh,
}) => {
  const prevLabel = viewMode === 'day' ? '‹ Prev Day' : viewMode === 'week' ? '‹ Prev Week' : '‹ Prev Month';
  const nextLabel = viewMode === 'day' ? 'Next Day ›' : viewMode === 'week' ? 'Next Week ›' : 'Next Month ›';
  const todayLabel = viewMode === 'day' ? 'Today' : viewMode === 'week' ? 'This Week' : 'This Month';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {/* View mode segmented buttons */}
        <div style={{ display: 'inline-flex', borderRadius: '6px', border: '1px solid var(--color-border-subtle, #cbd5e1)', padding: '2px', background: 'var(--color-bg-subtle, #f1f5f9)' }} role="tablist">
          {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={viewMode === mode}
              onClick={() => onChangeViewMode(mode)}
              style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: viewMode === mode ? 600 : 500,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                background: viewMode === mode ? '#ffffff' : 'transparent',
                color: viewMode === mode ? 'var(--color-text-main, #0f172a)' : 'var(--color-text-muted, #64748b)',
                boxShadow: viewMode === mode ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
                textTransform: 'capitalize',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Navigation buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="sm" onClick={onRefresh} aria-label="Refresh calendar">
            ↻ Refresh
          </Button>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', border: '1px solid var(--color-border-subtle, #cbd5e1)',
              borderRadius: 'var(--radius-md, 6px)', overflow: 'hidden', background: '#ffffff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}
            role="group"
            aria-label="Date navigation controls"
          >
            <button
              type="button" onClick={onPrev} aria-label={prevLabel} title={prevLabel}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '32px', padding: '0 10px', border: 'none', background: 'transparent', color: 'var(--color-text-main, #0f172a)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, borderRight: '1px solid var(--color-border-subtle, #cbd5e1)' }}
            >
              ‹
            </button>
            <button
              type="button" onClick={onToday} aria-label={todayLabel}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '32px', padding: '0 12px', border: 'none', background: 'transparent', color: 'var(--color-text-main, #0f172a)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              {todayLabel}
            </button>
            <button
              type="button" onClick={onNext} aria-label={nextLabel} title={nextLabel}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '32px', padding: '0 10px', border: 'none', background: 'transparent', color: 'var(--color-text-main, #0f172a)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, borderLeft: '1px solid var(--color-border-subtle, #cbd5e1)' }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* Date Title & Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--font-size-md, 15px)', fontWeight: 600, color: 'var(--color-text-main)' }}>
            {titleText}
          </span>
          {countLabel && (
            <span style={{ fontSize: 'var(--font-size-xs, 12px)', color: 'var(--color-text-muted)' }}>
              ({countLabel})
            </span>
          )}
        </div>

        {viewMode === 'week' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#ecfdf5', border: '1px solid #059669', borderRadius: '2px' }} />
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Dated Session</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', backgroundColor: '#f0fdf4', border: '1px dashed #10b981', borderRadius: '2px' }} />
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>Recurring Slot</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
