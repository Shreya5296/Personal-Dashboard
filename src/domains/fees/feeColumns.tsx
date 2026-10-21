import { Column } from '../../components/tables/DataTable';
import { FeeObligation } from './feeTypes';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { FeeStatus } from './FeeStatus';
import { Button } from '../../components/buttons/Button';

export interface FeeColumnActions {
  onPay: (fee: FeeObligation) => void;
  onVoid: (feeId: string) => void;
}

export function getFeeColumns(actions: FeeColumnActions): Column<FeeObligation>[] {
  return [
    { key: 'description', header: 'Description' },
    { key: 'amount_due', header: 'Amount Due', render: (f) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(f.amount_due)}</span> },
    { key: 'amount_paid', header: 'Paid', render: (f) => <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(f.amount_paid)}</span> },
    { key: 'outstanding_balance', header: 'Outstanding', render: (f) => <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: f.outstanding_balance > 0 ? 600 : 400, color: f.outstanding_balance > 0 ? 'var(--color-danger-text)' : 'inherit' }}>{formatCurrency(f.outstanding_balance)}</span> },
    { key: 'due_date', header: 'Due Date', render: (f) => formatDate(f.due_date) },
    { key: 'status', header: 'Status', render: (f) => <FeeStatus status={f.status} /> },
    {
      key: 'actions',
      header: 'Actions',
      render: (f) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {f.status !== 'VOID' && f.outstanding_balance > 0 && (
            <Button variant="primary" size="sm" onClick={() => actions.onPay(f)}>
              Pay
            </Button>
          )}
          {f.status !== 'VOID' && f.amount_paid === 0 && (
            <Button variant="outline" size="sm" onClick={() => actions.onVoid(f.fee_id || f.fee_obligation_id || '')}>
              Void
            </Button>
          )}
        </div>
      ),
    },
  ];
}
