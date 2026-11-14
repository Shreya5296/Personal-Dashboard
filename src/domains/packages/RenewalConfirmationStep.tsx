import React from 'react';
import { RenewalFormData, RenewalStudentSummary } from './packageRenewalTypes';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatWeeklySchedule } from '../students/scheduleFormatter';

export interface RenewalConfirmationStepProps {
  summary: RenewalStudentSummary;
  data: RenewalFormData;
  onConfirmChange: (confirmed: boolean) => void;
}

export const RenewalConfirmationStep: React.FC<RenewalConfirmationStepProps> = ({
  summary, data, onConfirmChange,
}) => {
  const prevAvailable = summary.availableBalance;
  const newPurchased = Number(data.new_classes_purchased) || 0;
  const newAvailable = prevAvailable + newPurchased;
  const curr = data.currency || 'INR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
        Step 6: Renewal Confirmation Summary
      </h4>

      {/* Credit Rollover Math Card */}
      <div style={{
        padding: '0.875rem', borderRadius: 'var(--radius-md)',
        backgroundColor: '#f0fdf4', border: '1px solid #86efac', display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ fontWeight: 600, color: '#15803d', fontSize: '13px' }}>
          Cumulative Credit Rollover Formula:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', fontSize: '13px', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#166534' }}>Previous Balance</div>
            <strong style={{ fontSize: '1.125rem', color: '#15803d' }}>{prevAvailable}</strong>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>+</span>
          <div>
            <div style={{ fontSize: '11px', color: '#166534' }}>Newly Purchased</div>
            <strong style={{ fontSize: '1.125rem', color: '#15803d' }}>{newPurchased}</strong>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>=</span>
          <div>
            <div style={{ fontSize: '11px', color: '#166534' }}>New Available Balance</div>
            <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>{newAvailable} classes</strong>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '12px' }}>
        <div style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>Student Identity</div>
          <div>{data.student?.student_name || data.student?.full_name}</div>
          <div style={{ fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>ID: {data.student?.student_id}</div>
          <div style={{ color: '#15803d', fontWeight: 600, marginTop: '2px' }}>Status will be: ACTIVE</div>
        </div>

        <div style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>New Package Terms</div>
          <div>{data.plan_type} ({data.class_duration} min/session)</div>
          <div>Price: <strong>{formatCurrency(Number(data.package_price || 0), true, curr)}</strong></div>
          {data.per_class ? <div>Rate: {formatCurrency(Number(data.per_class), true, curr)}/class</div> : null}
        </div>

        <div style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>New Weekly Schedule</div>
          <div>{formatWeeklySchedule(data.schedules)}</div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Effective from: {data.start_date || 'immediate'}</div>
        </div>

        <div style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-bg-subtle)' }}>
          <div style={{ fontWeight: 600, marginBottom: '2px' }}>Payment Recording</div>
          {data.payment.record_payment && Number(data.payment.amount) > 0 ? (
            <div>
              <strong style={{ color: '#059669' }}>{formatCurrency(Number(data.payment.amount), true, data.payment.currency || curr)}</strong>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Date: {data.payment.payment_date}</div>
              {data.payment.in_inr ? <div style={{ fontSize: '11px' }}>INR: ₹{data.payment.in_inr}</div> : null}
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No payment recorded at this time.</div>
          )}
        </div>
      </div>

      {/* Confirmation Checkbox */}
      <label style={{
        display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
        padding: '10px 12px', borderRadius: 'var(--radius-md)',
        backgroundColor: data.confirmed ? '#eff6ff' : 'var(--color-bg-subtle)',
        border: data.confirmed ? '1px solid #3b82f6' : '1px solid var(--color-border)',
        fontSize: '13px', fontWeight: 500,
      }}>
        <input
          type="checkbox"
          checked={data.confirmed}
          onChange={(e) => onConfirmChange(e.target.checked)}
        />
        I confirm these renewal terms, credit rollover ({newAvailable} classes total), and schedule changes.
      </label>
    </div>
  );
};
