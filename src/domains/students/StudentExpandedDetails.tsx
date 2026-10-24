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
import { formatOutstandingBalance } from '../../lib/balanceFormat';

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
  student, meetingLink, balance, financials, schedule = [], onEditStudent, onSelectStudent,
}) => {
  const primaryUrl = meetingLink?.meeting_link_1 || meetingLink?.meeting_url || '';
  const secondaryUrl = meetingLink?.meeting_link_2 || '';
  const remaining = Math.max(0, balance.totalPurchased - balance.totalConsumed);
  const primaryPkg = balance.packages[0];
  const scheduleText = formatWeeklySchedule(schedule);
  const out = formatOutstandingBalance(financials.outstanding, financials.currency);

  return (
    <div className={styles.container} onClick={(e) => e.stopPropagation()}>
      <div className={styles.identityBanner}>
        <div className={styles.studentMeta}>
          <span className={styles.studentName}>{student.student_name || student.full_name}</span>
          <span className={styles.idBadge}>{student.student_id}</span>
          {student.subject && <span className={styles.subjectBadge}>{student.subject}</span>}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--radius-full)', backgroundColor: student.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2', color: student.status === 'ACTIVE' ? '#15803d' : '#b91c1c' }}>
          {student.status || 'ACTIVE'}
        </span>
      </div>

      <div className={styles.detailsGrid}>
        <div className={styles.section}>
          <div className={styles.heading}>Parent / Guardian</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{student.parent_name || '—'}</div>
          <div className={styles.textWrap}>Phone: {student.parent_phone || student.phone || '—'}</div>
          <div className={styles.textWrap}>Email: {student.parent_email || '—'}</div>
        </div>

        <div className={styles.section}>
          <div className={styles.heading}>Student Contact</div>
          <div className={styles.textWrap}>Email: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_email || '—'}</strong></div>
          <div className={styles.textWrap}>Phone: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_phone || '—'}</strong></div>
          <div style={{ color: 'var(--color-text-subtle)' }}>Subject: {student.subject || '—'}</div>
        </div>

        <div className={styles.section}>
          <div className={styles.heading}>Class Schedule</div>
          <div style={{ color: schedule.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-subtle)', fontStyle: schedule.length > 0 ? 'normal' : 'italic', fontWeight: 500 }}>
            {scheduleText}
          </div>
          {schedule.length > 0 && <div style={{ color: 'var(--color-text-muted)' }}>{schedule.length} recurring {schedule.length === 1 ? 'slot' : 'slots'}/week</div>}
        </div>

        <div className={styles.section}>
          <div className={styles.heading}>Meeting Links</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div>
              <span style={{ color: 'var(--color-text-subtle)', marginRight: '6px', fontSize: '11px' }}>Primary:</span>
              {primaryUrl ? <MeetingLinkButton url={primaryUrl} /> : <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link configured</span>}
            </div>
            <div>
              <span style={{ color: 'var(--color-text-subtle)', marginRight: '6px', fontSize: '11px' }}>Secondary:</span>
              {secondaryUrl ? <MeetingLinkButton url={secondaryUrl} /> : <span style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>No link configured</span>}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.heading}>Package & Balance</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{primaryPkg?.package_name || primaryPkg?.plan_type || 'No active plan'}</div>
          <div style={{ color: remaining > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)', fontWeight: 600 }}>
            {remaining} classes remaining
          </div>
          {primaryPkg?.end_date && <div className={styles.textWrap}>Projected End: {formatDate(primaryPkg.end_date)}</div>}
        </div>

        <div className={styles.section}>
          <div className={styles.heading}>Financial Overview</div>
          <div className={styles.textWrap}>Agreed: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(financials.totalInvoiced, true, financials.currency)}</strong></div>
          <div className={styles.textWrap}>Received: <strong style={{ color: '#059669' }}>{formatCurrency(financials.totalPaid, true, financials.currency)}</strong></div>
          <div style={{ marginTop: '2px' }}>
            <span style={{ color: 'var(--color-text-muted)', marginRight: '4px' }}>Outstanding:</span>
            <strong style={{ color: out.color }}>{out.text}</strong>
          </div>
        </div>
      </div>

      <div className={styles.actionsRow}>
        <Button variant="secondary" size="sm" onClick={() => onSelectStudent(student)}>View Full Profile</Button>
        <Button variant="outline" size="sm" onClick={() => onEditStudent(student)}>Edit Details</Button>
      </div>
    </div>
  );
};
