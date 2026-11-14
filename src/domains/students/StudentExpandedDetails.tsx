import React from 'react';
import styles from './studentExpandedDetails.module.css';
import { Student } from './studentTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { Package } from '../packages/packageTypes';
import { StudentFinancialInfo } from './useStudentAggregates';
import { WeeklyScheduleEntry, cleanTime } from '../classes/scheduleApi';
import { MeetingLinkButton } from '../meeting-links/MeetingLinkButton';
import { Button } from '../../components/buttons/Button';
import { formatCurrency } from '../../lib/currencyFormat';
import { formatDate } from '../../lib/dateFormat';
import { formatTimeTo12Hour } from '../../lib/time12Format';
import { formatOutstandingBalance } from '../../lib/balanceFormat';

export interface StudentExpandedDetailsProps {
  student: Student;
  meetingLink?: MeetingLink;
  balance: { totalPurchased: number; totalConsumed: number; packages: Package[] };
  financials: StudentFinancialInfo;
  schedule?: WeeklyScheduleEntry[];
  onEditStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
  onRenewStudent?: (student: Student) => void;
}

export const StudentExpandedDetails: React.FC<StudentExpandedDetailsProps> = ({
  student, meetingLink, balance, financials, schedule = [], onEditStudent, onSelectStudent, onRenewStudent,
}) => {
  const primaryUrl = meetingLink?.meeting_link_1 || meetingLink?.meeting_url || '';
  const secondaryUrl = meetingLink?.meeting_link_2 || '';
  const remaining = Math.max(0, balance.totalPurchased - balance.totalConsumed);
  const primaryPkg = balance.packages[0];
  const out = formatOutstandingBalance(financials.outstanding, financials.currency);
  const inrEquiv = financials.currency !== 'INR'
    ? (financials.inInr && financials.inInr > 0 ? formatCurrency(financials.inInr, true, 'INR') : 'Not available')
    : null;

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
          {schedule.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {schedule.map((slot, i) => {
                const day = slot.day_of_week.charAt(0).toUpperCase() + slot.day_of_week.slice(1).toLowerCase();
                const s12 = formatTimeTo12Hour(cleanTime(slot.start_time));
                const e12 = slot.end_time ? formatTimeTo12Hour(cleanTime(slot.end_time)) : '';
                return (
                  <div key={i} style={{ color: 'var(--color-text-main)', fontSize: '12px', fontWeight: 500 }}>
                    {day} — {e12 ? `${s12}–${e12}` : s12}
                  </div>
                );
              })}
              <div style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '2px' }}>
                {schedule.length} recurring {schedule.length === 1 ? 'slot' : 'slots'}/week
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-subtle)', fontStyle: 'italic', fontSize: '12px' }}>
              No configured schedule
            </div>
          )}
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
          <div className={styles.heading}>Package Details</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>
            {primaryPkg?.plan_type || primaryPkg?.package_name || 'No active plan'}
            {primaryPkg?.class_duration ? ` (${primaryPkg.class_duration} min)` : ''}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Classes: <strong style={{ color: 'var(--color-text-main)' }}>{balance.totalPurchased}</strong> purchased · <strong>{balance.totalConsumed}</strong> consumed · <strong style={{ color: remaining > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)' }}>{remaining} remaining</strong>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            Dates: {primaryPkg?.start_date ? formatDate(primaryPkg.start_date) : '—'} – {primaryPkg?.end_date ? formatDate(primaryPkg.end_date) : '—'}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.heading}>Financial Overview</div>
          <div className={styles.textWrap}>Agreed: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(financials.totalInvoiced, true, financials.currency)}</strong></div>
          <div className={styles.textWrap}>Received: <strong style={{ color: '#059669' }}>{formatCurrency(financials.totalPaid, true, financials.currency)}</strong></div>
          {inrEquiv && <div className={styles.textWrap} style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>INR equiv: {inrEquiv}</div>}
          <div style={{ marginTop: '2px' }}>
            <span style={{ color: 'var(--color-text-muted)', marginRight: '4px' }}>Outstanding:</span>
            <strong style={{ color: out.color }}>{out.text}</strong>
          </div>
        </div>
      </div>

      <div className={styles.actionsRow}>
        <Button variant="secondary" size="sm" onClick={() => onSelectStudent(student)}>View Full Profile</Button>
        <Button variant="outline" size="sm" onClick={() => onEditStudent(student)}>Edit Details</Button>
        {onRenewStudent && <Button variant="primary" size="sm" onClick={() => onRenewStudent(student)}>Renew Package</Button>}
      </div>
    </div>
  );
};
