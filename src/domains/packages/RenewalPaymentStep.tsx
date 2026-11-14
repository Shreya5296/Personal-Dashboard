import React from 'react';
import { RenewalPaymentInput } from './packageRenewalTypes';
import { formatCurrency } from '../../lib/currencyFormat';

export interface RenewalPaymentStepProps {
  payment: RenewalPaymentInput;
  packagePrice: string;
  currency: string;
  onChange: (payment: RenewalPaymentInput) => void;
}

export const RenewalPaymentStep: React.FC<RenewalPaymentStepProps> = ({
  payment, packagePrice, currency, onChange,
}) => {
  const pkgPriceNum = Number(packagePrice) || 0;
  const payAmtNum = Number(payment.amount) || 0;
  const isFullPayment = payAmtNum >= pkgPriceNum && pkgPriceNum > 0;
  const isPartialPayment = payAmtNum > 0 && payAmtNum < pkgPriceNum;

  const handleFullPay = () => {
    onChange({ ...payment, record_payment: true, amount: packagePrice });
  };

  const handleToggleRecord = (checked: boolean) => {
    onChange({
      ...payment,
      record_payment: checked,
      amount: checked ? (payment.amount || packagePrice) : '',
    });
  };

  const inputStyle = { width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '13px', boxSizing: 'border-box' as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <h4 style={{ margin: 0, fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
        Step 5: Record Payment for Renewal
      </h4>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
        <input
          type="checkbox"
          checked={payment.record_payment}
          onChange={(e) => handleToggleRecord(e.target.checked)}
        />
        Record payment transaction now
      </label>

      {payment.record_payment ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: '0.875rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Package Total: <strong>{formatCurrency(pkgPriceNum, true, currency)}</strong>
            </span>
            <button
              type="button"
              onClick={handleFullPay}
              style={{ padding: '3px 8px', fontSize: '11px', borderRadius: '4px', border: '1px solid var(--color-primary)', background: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}
            >
              Fill Full Amount
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Amount ({currency}) *</label>
              <input
                type="number"
                step="0.01"
                value={payment.amount}
                onChange={(e) => onChange({ ...payment, amount: e.target.value })}
                placeholder="0.00"
                style={inputStyle}
              />
              <span style={{ fontSize: '11px', color: isFullPayment ? '#16a34a' : isPartialPayment ? '#d97706' : 'var(--color-text-muted)' }}>
                {isFullPayment ? '✓ Full payment' : isPartialPayment ? '⚠️ Partial payment' : ''}
              </span>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Payment Date *</label>
              <input
                type="date"
                value={payment.payment_date}
                onChange={(e) => onChange({ ...payment, payment_date: e.target.value })}
                style={inputStyle}
              />
            </div>

            {currency !== 'INR' && (
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600 }}>INR Equivalent (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={payment.in_inr || ''}
                  onChange={(e) => onChange({ ...payment, in_inr: e.target.value })}
                  placeholder="e.g. 6930"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600 }}>Reference / Notes</label>
              <input
                type="text"
                value={payment.reference_number || ''}
                onChange={(e) => onChange({ ...payment, reference_number: e.target.value })}
                placeholder="e.g. Bank transfer, AUD-REC-902"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem', borderRadius: '4px', backgroundColor: '#f0f9ff', color: '#0369a1', fontSize: '12px' }}>
          ℹ️ Payment is optional upon renewal. You can record payments later under Finances without altering class credit entitlement.
        </div>
      )}
    </div>
  );
};
