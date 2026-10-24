import React from 'react';
import styles from './studentExpandedDetails.module.css';
import { Student } from './studentTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { Package } from '../packages/packageTypes';
import { StudentFinancialInfo } from './useStudentAggregates';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { MeetingLinkButton } from '../meeting-links/MeetingLinkButton';
import { Button } from '../../components/buttons/Button';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { formatWeeklySchedule } from './scheduleFormatter';

export interface StudentExpandedDetailsProps {
  student: Student;
  meetingLink?: MeetingLink;
  balance: { totalPurchased: number; totalConsumed: number; packages: Package[] };
  financials: StudentFinancialInfo;
  schedule?: WeeklyScheduleEntry[];
  onEditStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
}

export const StudentExpandedDetails: React.FC<StudentExpandedDetailsProps> = ({
  student,
  meetingLink,
  balance,
  financials,
  schedule = [],
  onEditStudent,
  onSelectStudent,
}) => {
  const primaryUrl = meetingLink?.meeting_link_1 || meetingLink?.meeting_url || '';
  const secondaryUrl = meetingLink?.meeting_link_2 || '';
  const remaining = Math.max(0, balance.totalPurchased - balance.totalConsumed);
  const primaryPkg = balance.packages[0];
  const scheduleText = formatWeeklySchedule(schedule);

  return (
    <div className={styles.container} onClick={(e) => e.stopPropagation()}>
      <div className={styles.detailsGrid}>
        {/* Row 1 - Col 1: Parent / Guardian */}
        <div className={styles.card}>
          <div className={styles.heading}>Parent / Guardian</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{student.parent_name || '—'}</div>
          <div className={styles.textWrap}>Phone: {student.parent_phone || student.phone || '—'}</div>
          <div className={styles.textWrap}>Email: {student.parent_email || '—'}</div>
        </div>

        {/* Row 1 - Col 2: Student Contact */}
        <div className={styles.card}>
          <div className={styles.heading}>Student Contact</div>
          <div className={styles.textWrap}>Email: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_email || '—'}</strong></div>
          <div className={styles.textWrap}>Phone: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_phone || '—'}</strong></div>
          <div style={{ color: 'var(--color-text-subtle)', marginTop: '2px' }}>ID: <code>{student.student_id}</code></div>
        </div>

        {/* Row 1 - Col 3: Class Schedule */}
        <div className={styles.card}>
          <div className={styles.heading}>Class Schedule</div>
          <div style={{ color: schedule.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-subtle)', fontStyle: schedule.length > 0 ? 'normal' : 'italic', fontWeight: 500 }}>
            {scheduleText}
          </div>
          {schedule.length > 0 && (
            <div style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {schedule.length} recurring {schedule.length === 1 ? 'slot' : 'slots'}/week
            </div>
          )}
        </div>

        {/* Row 2 - Col 1: Meeting Links (Placed in second row) */}
        <div className={styles.card}>
          <div className={styles.heading}>Meeting Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ minWidth: 0 }}>
              <span style={{ color: 'var(--color-text-subtle)', marginRight: '6px', fontSize: '11px' }}>Primary:</span>
              {primaryUrl ? <MeetingLinkButton url={primaryUrl} /> : <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link configured</span>}
            </div>
            <div style={{ minWidth: 0 }}>
              <span style={{ color: 'var(--color-text-subtle)', marginRight: '6px', fontSize: '11px' }}>Secondary:</span>
              {secondaryUrl ? <MeetingLinkButton url={secondaryUrl} /> : <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link configured</span>}
            </div>
          </div>
        </div>

        {/* Row 2 - Col 2: Package & Balance */}
        <div className={styles.card}>
          <div className={styles.heading}>Package & Balance</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{primaryPkg?.package_name || primaryPkg?.plan_type || 'No active plan'}</div>
          <div style={{ color: remaining > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)', fontWeight: 600, marginTop: '2px' }}>
            {remaining} classes remaining
          </div>
          {primaryPkg?.end_date && <div className={styles.textWrap}>Expires: {formatDate(primaryPkg.end_date)}</div>}
        </div>

        {/* Row 2 - Col 3: Financial Overview */}
        <div className={styles.card}>
          <div className={styles.heading}>Financial Overview</div>
          <div className={styles.textWrap}>Agreed: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(financials.totalInvoiced, true, financials.currency)}</strong></div>
          <div className={styles.textWrap}>Received: <strong style={{ color: '#059669' }}>{formatCurrency(financials.totalPaid, true, financials.currency)}</strong></div>
          <div style={{ color: financials.outstanding > 0 ? '#dc2626' : '#059669', fontWeight: 600, marginTop: '2px' }}>
            {financials.outstanding > 0 ? `Uncollected: ${formatCurrency(financials.outstanding, true, financials.currency)}` : 'Balance: Paid in full'}
          </div>
        </div>
      </div>

      <div className={styles.actionsRow}>
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
