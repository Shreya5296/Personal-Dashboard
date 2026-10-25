import React, { useState, useEffect } from 'react';
import { Student } from './studentTypes';
import { useAuth } from '../../auth/AuthProvider';
import { useStudentAggregates } from './useStudentAggregates';
import { StudentRow } from './StudentRow';
import { StudentTabs } from './StudentTabs';
import { StudentStatusTab, isStudentActive, filterStudentsByTab } from './studentStatusClassifier';
import { EmptyState } from '../../components/feedback/EmptyState';
import { STUDENT_TABLE_COLUMNS } from './studentTableLayout';
import styles from '../../components/tables/tables.module.css';

export interface StudentListProps {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  onEditStudent: (student: Student) => void;
  activeTab?: StudentStatusTab;
  onTabChange?: (tab: StudentStatusTab) => void;
  onDisplayedCountChange?: (count: number) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  onSelectStudent,
  onEditStudent,
  activeTab: controlledTab,
  onTabChange,
  onDisplayedCountChange,
}) => {
  const { token } = useAuth();
  const [internalTab, setInternalTab] = useState<StudentStatusTab>('ACTIVE');
  const activeTab = controlledTab ?? internalTab;
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const studentIds = students.map((s) => s.student_id);
  const {
    getStudentBalance,
    getStudentLastCompletedDate,
    getStudentSchedule,
    getStudentMeetingLink,
    getStudentFinancials,
  } = useStudentAggregates(studentIds, token);

  const activeCount = students.filter((s) =>
    isStudentActive(s, {
      balance: getStudentBalance(s.student_id),
      lastCompletedDate: getStudentLastCompletedDate(s.student_id),
    })
  ).length;
  const inactiveCount = students.length - activeCount;

  const displayedStudents = filterStudentsByTab(
    students,
    activeTab,
    getStudentBalance,
    getStudentLastCompletedDate
  );

  useEffect(() => {
    onDisplayedCountChange?.(displayedStudents.length);
  }, [displayedStudents.length, onDisplayedCountChange]);

  const handleTabSelect = (tab: StudentStatusTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

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
        onTabChange={handleTabSelect}
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
          <table className={`${styles.table} ${styles.tableFixed}`}>
            <colgroup>
              <col style={{ width: STUDENT_TABLE_COLUMNS.student }} />
              <col style={{ width: STUDENT_TABLE_COLUMNS.subject }} />
              <col style={{ width: STUDENT_TABLE_COLUMNS.schedule }} />
              <col style={{ width: STUDENT_TABLE_COLUMNS.classes }} />
              <col style={{ width: STUDENT_TABLE_COLUMNS.actions }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: STUDENT_TABLE_COLUMNS.student }}>Student</th>
                <th style={{ width: STUDENT_TABLE_COLUMNS.subject }}>Subject</th>
                <th style={{ width: STUDENT_TABLE_COLUMNS.schedule }}>Class Schedule</th>
                <th style={{ width: STUDENT_TABLE_COLUMNS.classes }}>Classes</th>
                <th style={{ width: STUDENT_TABLE_COLUMNS.actions, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedStudents.map((student) => {
                const bal = getStudentBalance(student.student_id);
                const lastCompleted = getStudentLastCompletedDate(student.student_id);
                const isAct = isStudentActive(student, { balance: bal, lastCompletedDate: lastCompleted });
                return (
                  <StudentRow
                    key={student.student_id}
                    student={student}
                    isActive={isAct}
                    isExpanded={expandedStudentId === student.student_id}
                    onToggleExpand={handleToggleExpand}
                    onSelectStudent={onSelectStudent}
                    onEditStudent={onEditStudent}
                    schedule={getStudentSchedule(student.student_id)}
                    balance={bal}
                    financials={getStudentFinancials(student.student_id)}
                    meetingLink={getStudentMeetingLink(student.student_id)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
