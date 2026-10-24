import React from 'react';
import { Student } from './studentTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { Package } from '../packages/packageTypes';
import { StudentFinancialInfo } from './useStudentAggregates';
import { MeetingLinkButton } from '../meeting-links/MeetingLinkButton';
import { Button } from '../../components/buttons/Button';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';

export interface StudentExpandedDetailsProps {
  student: Student;
  meetingLink?: MeetingLink;
  balance: { totalPurchased: number; totalConsumed: number; packages: Package[] };
  financials: StudentFinancialInfo;
  onEditStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
}

export const StudentExpandedDetails: React.FC<StudentExpandedDetailsProps> = ({
  student,
  meetingLink,
  balance,
  financials,
  onEditStudent,
  onSelectStudent,
}) => {
  const primaryUrl = meetingLink?.meeting_link_1 || meetingLink?.meeting_url || '';
  const secondaryUrl = meetingLink?.meeting_link_2 || '';
  const remaining = Math.max(0, balance.totalPurchased - balance.totalConsumed);
  const primaryPkg = balance.packages[0];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        padding: 'var(--space-4) var(--space-5)',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid var(--color-border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        fontSize: 'var(--font-size-xs)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        {/* Parent & Contact Details */}
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Parent / Guardian
          </span>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{student.parent_name || '—'}</div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>Phone: {student.parent_phone || student.phone || '—'}</div>
          <div style={{ color: 'var(--color-text-muted)' }}>Email: {student.parent_email || '—'}</div>
        </div>

        {/* Student Contact */}
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Student Contact
          </span>
          <div style={{ color: 'var(--color-text-muted)' }}>Email: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_email || '—'}</strong></div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>Phone: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_phone || '—'}</strong></div>
          <div style={{ color: 'var(--color-text-subtle)', marginTop: '2px' }}>ID: <code>{student.student_id}</code></div>
        </div>

        {/* Meeting Links */}
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Meeting Links
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div>
              <span style={{ color: 'var(--color-text-subtle)', marginRight: '6px' }}>Primary:</span>
              {primaryUrl ? <MeetingLinkButton url={primaryUrl} /> : <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link configured</span>}
            </div>
            <div>
              <span style={{ color: 'var(--color-text-subtle)', marginRight: '6px' }}>Secondary:</span>
              {secondaryUrl ? <MeetingLinkButton url={secondaryUrl} /> : <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link configured</span>}
            </div>
          </div>
        </div>

        {/* Package & Balance */}
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Package & Balance
          </span>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{primaryPkg?.package_name || primaryPkg?.plan_type || 'No active plan'}</div>
          <div style={{ color: remaining > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)', fontWeight: 600, marginTop: '2px' }}>
            {remaining} classes remaining
          </div>
          {primaryPkg?.end_date && <div style={{ color: 'var(--color-text-muted)' }}>Expires: {formatDate(primaryPkg.end_date)}</div>}
        </div>

        {/* Financial Details */}
        <div>
          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Financial Overview
          </span>
          <div style={{ color: 'var(--color-text-muted)' }}>Agreed: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(financials.totalInvoiced, true, financials.currency)}</strong></div>
          <div style={{ color: 'var(--color-text-muted)', marginTop: '2px' }}>Received: <strong style={{ color: '#059669' }}>{formatCurrency(financials.totalPaid, true, financials.currency)}</strong></div>
          <div style={{ color: financials.outstanding > 0 ? '#dc2626' : '#059669', fontWeight: 600, marginTop: '2px' }}>
            {financials.outstanding > 0 ? `Uncollected: ${formatCurrency(financials.outstanding, true, financials.currency)}` : 'Balance: Paid in full'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)' }}>
        <Button variant="secondary" size="sm" onClick={() => onSelectStudent(student)}>
          View Full Profile
        </Button>
        <Button variant="outline" size="sm" onClick={() => onEditStudent(student)}>
          Edit Details
        </Button>
      </div>
    </div>
  );
};
