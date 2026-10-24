import React, { useState } from 'react';
import { Student } from './studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import { useStudentAggregates } from './useStudentAggregates';
import { StudentRow } from './StudentRow';
import { StudentTabs } from './StudentTabs';
import { StudentStatusTab, isStudentActive, filterStudentsByTab } from './studentStatusClassifier';
import { EmptyState } from '../../components/feedback/EmptyState';
import styles from '../../components/tables/tables.module.css';

export interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  onAutoSchedule?: (student: Student) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onEditStudent,
  onAutoSchedule,
}) => {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<StudentStatusTab>('ALL');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const studentIds = students.map((s) => s.student_id);
  const {
    getStudentBalance,
    getStudentSchedule,
    getStudentMeetingLink,
    getStudentFinancials,
  } = useStudentAggregates(studentIds, token);

  const activeCount = students.filter((s) => isStudentActive(s, getStudentBalance(s.student_id))).length;
  const inactiveCount = students.length - activeCount;

  const displayedStudents = filterStudentsByTab(students, activeTab, getStudentBalance);

  const handleToggleExpand = (sid: string) => {
    setExpandedStudentId((prev) => (prev === sid ? null : sid));
  };

  return (
    <div>
      <StudentTabs
        activeTab={activeTab}
        allCount={students.length}
        activeCount={activeCount}
        inactiveCount={inactiveCount}
        onTabChange={setActiveTab}
      />

      {displayedStudents.length === 0 ? (
        <EmptyState
          title={activeTab === 'ACTIVE' ? 'No active students' : activeTab === 'INACTIVE' ? 'No inactive students' : 'No students found'}
          description={
            activeTab === 'ACTIVE'
              ? 'No registered students have remaining classes available.'
              : activeTab === 'INACTIVE'
              ? 'No students currently have exhausted or inactive packages.'
              : 'No records match your search or filters.'
          }
        />
      ) : (
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
              {displayedStudents.map((student) => (
                <StudentRow
                  key={student.student_id}
                  student={student}
                  isExpanded={expandedStudentId === student.student_id}
                  onToggleExpand={handleToggleExpand}
                  onSelectStudent={onSelectStudent}
                  onEditStudent={onEditStudent}
                  onAutoSchedule={onAutoSchedule}
                  schedule={getStudentSchedule(student.student_id)}
                  balance={getStudentBalance(student.student_id)}
                  financials={getStudentFinancials(student.student_id)}
                  meetingLink={getStudentMeetingLink(student.student_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};