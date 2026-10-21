import React from 'react';
import { Student } from './studentTypes';
import { DataTable } from '../../components/tables/DataTable';
import { EmptyState } from '../../components/feedback/EmptyState';
import { getStudentColumns } from './studentColumns';

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
  if (students.length === 0) {
    return (
      <EmptyState
        title="No students found"
        description="No records match your search or filters. Try adjusting your query or add a new student."
      />
    );
  }

  const columns = getStudentColumns({ onSelectStudent, onEditStudent });

  return <DataTable columns={columns} data={students} keyExtractor={(s) => s.student_id} />;
};
