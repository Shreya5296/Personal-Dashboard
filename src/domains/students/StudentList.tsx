import React, { useState } from 'react';
import { Student } from './studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import { useStudentAggregates } from './useStudentAggregates';
import { StudentRow } from './StudentRow';
import { EmptyState } from '../../components/feedback/EmptyState';
import styles from '../../components/tables/tables.module.css';

export interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onEditStudent,
}) => {
  const { token } = useAuth();
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const studentIds = students.map((s) => s.student_id);
  const {
    getStudentBalance,
    getStudentSchedule,
    getStudentMeetingLink,
    getStudentFinancials,
  } = useStudentAggregates(studentIds, token);

  if (students.length === 0) {
    return (
      <EmptyState
        title="No students found"
        description="No records match your search or filters. Try adjusting your query or add a new student."
      />
    );
  }

  const handleToggleExpand = (sid: string) => {
    setExpandedStudentId((prev) => (prev === sid ? null : sid));
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: '28%' }}>Student</th>
            <th style={{ width: '22%' }}>Subject</th>
            <th style={{ width: '26%' }}>Class Schedule</th>
            <th style={{ width: '14%' }}>Classes</th>
            <th style={{ width: '10%', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <StudentRow
              key={student.student_id}
              student={student}
              isExpanded={expandedStudentId === student.student_id}
              onToggleExpand={handleToggleExpand}
              onSelectStudent={onSelectStudent}
              onEditStudent={onEditStudent}
              schedule={getStudentSchedule(student.student_id)}
              balance={getStudentBalance(student.student_id)}
              financials={getStudentFinancials(student.student_id)}
              meetingLink={getStudentMeetingLink(student.student_id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
