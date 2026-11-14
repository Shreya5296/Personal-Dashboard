import React from 'react';
import { RenewalStudentSummary } from './packageRenewalTypes';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { formatWeeklySchedule } from '../students/scheduleFormatter';

export interface RenewalCurrentSummaryStepProps {
  summary: RenewalStudentSummary;
}

export const RenewalCurrentSummaryStep: React.FC<RenewalCurrentSummaryStepProps> = ({ summary }) => {
  const { package: pkg, cumulativePurchased, cumulativeConsumed, availableBalance, payments, schedules } = summary;
  const curr = pkg?.currency || 'INR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
        Step 2: Current Package & Balance Status
      </h4>

      {/* Credit Balance Card */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)',
        padding: '0.875rem', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border-subtle)', textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Cumulative Purchased</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums' }}>
            {cumulativePurchased}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Classes Consumed</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
            {cumulativeConsumed}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Current Available Balance</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: availableBalance > 0 ? '#16a34a' : '#d97706', fontVariantNumeric: 'tabular-nums' }}>
            {availableBalance} classes
          </div>
        </div>
      </div>

      {/* Latest Package Configuration vs Cumulative Balance */}
      <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', fontSize: '12px' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
          Latest Package Configuration: {pkg?.plan_type || 'Per Class'} ({pkg?.class_duration || 60} mins)
        </div>
        <div style={{ color: 'var(--color-text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
          <div>Price: <strong>{formatCurrency(Number(pkg?.package_price || pkg?.price || 0), true, curr)}</strong></div>
          <div>Per Class: <strong>{pkg?.per_class ? formatCurrency(Number(pkg.per_class), true, curr) : '—'}</strong></div>
          <div>Dates: {pkg?.start_date ? formatDate(pkg.start_date) : '—'} to {pkg?.end_date ? formatDate(pkg.end_date) : '—'}</div>
          <div>Status: <strong style={{ color: availableBalance > 0 ? '#15803d' : '#b91c1c' }}>{availableBalance > 0 ? 'Active Credits' : 'Exhausted'}</strong></div>
        </div>
        <div style={{ marginTop: '6px', fontSize: '11px', color: '#0369a1', backgroundColor: '#f0f9ff', padding: '4px 8px', borderRadius: '4px' }}>
          ℹ️ Cumulative Balance ({availableBalance} remaining) will carry forward into newly purchased classes.
        </div>
      </div>

      {/* Existing Schedule */}
      <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', fontSize: '12px' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '2px' }}>Current Recurring Schedule</div>
        <div style={{ color: schedules.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-muted)', fontStyle: schedules.length > 0 ? 'normal' : 'italic' }}>
          {formatWeeklySchedule(schedules)}
        </div>
      </div>

      {/* Previous Payments */}
      <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', fontSize: '12px' }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text-main)', marginBottom: '4px' }}>
          Payment History ({payments.length} transaction{payments.length === 1 ? '' : 's'})
        </div>
        {payments.length === 0 ? (
          <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No payment records recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '100px', overflowY: 'auto' }}>
            {payments.map((p, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)' }}>
                <span>{p.payment_date ? formatDate(p.payment_date) : '—'}</span>
                <strong style={{ color: '#059669' }}>{formatCurrency(Number(p.amount), true, p.currency || curr)}</strong>
                {p.in_inr ? <span style={{ fontSize: '10px' }}>(₹{p.in_inr})</span> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
