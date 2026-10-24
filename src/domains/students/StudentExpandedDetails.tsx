import React from 'react';
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
  onAutoSchedule?: (student: Student) => void;
}

const headingStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '11px',
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '6px',
};

const textWrapStyle: React.CSSProperties = {
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  color: 'var(--color-text-muted)',
};

export const StudentExpandedDetails: React.FC<StudentExpandedDetailsProps> = ({
  student,
  meetingLink,
  balance,
  financials,
  schedule = [],
  onEditStudent,
  onSelectStudent,
  onAutoSchedule,
}) => {
  const primaryUrl = meetingLink?.meeting_link_1 || meetingLink?.meeting_url || '';
  const secondaryUrl = meetingLink?.meeting_link_2 || '';
  const remaining = Math.max(0, balance.totalPurchased - balance.totalConsumed);
  const primaryPkg = balance.packages[0];
  const scheduleText = formatWeeklySchedule(schedule);

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        <div style={{ minWidth: 0 }}>
          <div style={headingStyle}>Parent / Guardian</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{student.parent_name || '—'}</div>
          <div style={textWrapStyle}>Phone: {student.parent_phone || student.phone || '—'}</div>
          <div style={textWrapStyle}>Email: {student.parent_email || '—'}</div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={headingStyle}>Student Contact</div>
          <div style={textWrapStyle}>Email: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_email || '—'}</strong></div>
          <div style={textWrapStyle}>Phone: <strong style={{ color: 'var(--color-text-main)' }}>{student.student_phone || '—'}</strong></div>
          <div style={{ color: 'var(--color-text-subtle)', marginTop: '2px' }}>ID: <code>{student.student_id}</code></div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={headingStyle}>Class Schedule</div>
          <div style={{ color: schedule.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-subtle)', fontStyle: schedule.length > 0 ? 'normal' : 'italic', fontWeight: 500 }}>
            {scheduleText}
          </div>
          {schedule.length > 0 && (
            <div style={{ color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {schedule.length} recurring {schedule.length === 1 ? 'slot' : 'slots'}/week
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={headingStyle}>Meeting Links</div>
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

        <div style={{ minWidth: 0 }}>
          <div style={headingStyle}>Package & Balance</div>
          <div style={{ color: 'var(--color-text-main)', fontWeight: 600 }}>{primaryPkg?.package_name || primaryPkg?.plan_type || 'No active plan'}</div>
          <div style={{ color: remaining > 0 ? 'var(--color-success-text)' : 'var(--color-danger-text)', fontWeight: 600, marginTop: '2px' }}>
            {remaining} classes remaining
          </div>
          {primaryPkg?.end_date && <div style={textWrapStyle}>Expires: {formatDate(primaryPkg.end_date)}</div>}
        </div>

        <div style={{ minWidth: 0 }}>
          <div style={headingStyle}>Financial Overview</div>
          <div style={textWrapStyle}>Agreed: <strong style={{ color: 'var(--color-text-main)' }}>{formatCurrency(financials.totalInvoiced, true, financials.currency)}</strong></div>
          <div style={textWrapStyle}>Received: <strong style={{ color: '#059669' }}>{formatCurrency(financials.totalPaid, true, financials.currency)}</strong></div>
          <div style={{ color: financials.outstanding > 0 ? '#dc2626' : '#059669', fontWeight: 600, marginTop: '2px' }}>
            {financials.outstanding > 0 ? `Uncollected: ${formatCurrency(financials.outstanding, true, financials.currency)}` : 'Balance: Paid in full'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', paddingTop: 'var(--space-2)', borderTop: '1px solid var(--color-border-subtle)', flexWrap: 'wrap' }}>
        {onAutoSchedule && schedule.length > 0 && remaining > 0 && (
          <Button variant="secondary" size="sm" onClick={() => onAutoSchedule(student)}>
            🗓 Auto-Schedule Classes
          </Button>
        )}
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