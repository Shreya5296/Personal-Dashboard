import React from 'react';
import { Student } from './studentTypes';
import { WeeklyScheduleEntry } from '../classes/scheduleApi';
import { Package } from '../packages/packageTypes';
import { StudentFinancialInfo } from './useStudentAggregates';
import { formatClassBalance } from './classBalanceFormatter';
import { formatWeeklySchedule } from './scheduleFormatter';
import { StudentCell } from './StudentCell';
import { StudentExpandedDetails } from './StudentExpandedDetails';
import { Button } from '../../components/buttons/Button';

export interface StudentRowProps {
  student: Student;
  isExpanded: boolean;
  onToggleExpand: (studentId: string) => void;
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  schedule: WeeklyScheduleEntry[];
  balance: { totalPurchased: number; totalConsumed: number; packages: Package[] };
  financials: StudentFinancialInfo;
  meetingLink?: any;
  onAutoSchedule?: (student: Student) => void;
}

const cellEllipsis: React.CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  maxWidth: '200px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'inline-block',
};

export const StudentRow: React.FC<StudentRowProps> = ({
  student,
  isExpanded,
  onToggleExpand,
  onSelectStudent,
  onEditStudent,
  schedule,
  balance,
  financials,
  meetingLink,
  onAutoSchedule,
}) => {
  const scheduleText = formatWeeklySchedule(schedule);
  const classBalanceText = formatClassBalance(balance.totalConsumed, balance.totalPurchased);

  return (
    <>
      <tr
        onClick={() => onToggleExpand(student.student_id)}
        style={{
          cursor: 'pointer',
          backgroundColor: isExpanded ? 'var(--color-bg-subtle)' : undefined,
          transition: 'background-color 100ms ease',
        }}
        aria-expanded={isExpanded}
      >
        <td style={{ width: '28%' }}>
          <StudentCell student={student} />
        </td>

        <td style={{ width: '22%' }}>
          <span
            title={student.subject || 'General'}
            style={{
              ...cellEllipsis,
              fontWeight: 500,
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-bg-subtle)',
              color: 'var(--color-text-muted)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            {student.subject || 'General'}
          </span>
        </td>

        <td style={{ width: '26%' }}>
          <span
            title={scheduleText}
            style={{
              ...cellEllipsis,
              color: schedule.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-subtle)',
              fontStyle: schedule.length > 0 ? 'normal' : 'italic',
            }}
          >
            {scheduleText}
          </span>
        </td>

        <td style={{ width: '14%' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums' }}>
            {classBalanceText}
          </span>
        </td>

        <td style={{ width: '10%', textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onEditStudent(student);
              }}
            >
              Edit
            </Button>
            <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)', userSelect: 'none' }}>
              {isExpanded ? '▲' : '▼'}
            </span>
          </div>
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <StudentExpandedDetails
              student={student}
              meetingLink={meetingLink}
              balance={balance}
              financials={financials}
              schedule={schedule}
              onEditStudent={onEditStudent}
              onSelectStudent={onSelectStudent}
              onAutoSchedule={onAutoSchedule}
            />
          </td>
        </tr>
      )}
    </>
  );
};
