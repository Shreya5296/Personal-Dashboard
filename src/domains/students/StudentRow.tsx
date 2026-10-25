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
}

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
        <td style={{ width: '27%' }}>
          <StudentCell student={student} onSelect={onSelectStudent} />
        </td>

        <td style={{ width: '19%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '100%' }}>
            {(student.subject ? student.subject.split(',') : ['General']).map((subj, i) => (
              <span
                key={i}
                title={subj.trim()}
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 500,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  color: 'var(--color-text-muted)',
                  border: '1px solid var(--color-border-subtle)',
                  whiteSpace: 'nowrap',
                }}
              >
                {subj.trim()}
              </span>
            ))}
          </div>
        </td>

        <td style={{ width: '29%' }}>
          <span
            title={scheduleText}
            style={{
              fontSize: 'var(--font-size-xs)',
              color: schedule.length > 0 ? 'var(--color-text-main)' : 'var(--color-text-subtle)',
              fontStyle: schedule.length > 0 ? 'normal' : 'italic',
              width: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              display: 'block',
            }}
          >
            {scheduleText}
          </span>
        </td>

        <td style={{ width: '13%' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-main)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
            {classBalanceText}
          </span>
        </td>

        <td style={{ width: '12%', textAlign: 'right' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', minWidth: '48px' }}>
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
            />
          </td>
        </tr>
      )}
    </>
  );
};
