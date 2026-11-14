import React, { useState, useEffect } from 'react';
import { Student } from '../students/studentTypes';
import { fetchStudents } from '../students/studentApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

export interface RenewalStudentSelectStepProps {
  selectedStudent: Student | null;
  onSelectStudent: (student: Student) => void;
  token?: string | null;
}

export const RenewalStudentSelectStep: React.FC<RenewalStudentSelectStepProps> = ({
  selectedStudent, onSelectStudent, token,
}) => {
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 250);
  const [candidates, setCandidates] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const runSearch = async () => {
      setLoading(true);
      try {
        const all = await fetchStudents(debounced ? { query: debounced } : undefined, token);
        if (active) {
          const q = debounced.trim().toLowerCase();
          const filtered = all.filter((s) => {
            if (!q) return true;
            const name = (s.student_name || s.full_name || '').toLowerCase();
            const sid = (s.student_id || '').toLowerCase();
            const phone = (s.parent_phone || s.phone || '').toLowerCase();
            return name.includes(q) || sid.includes(q) || phone.includes(q);
          });
          setCandidates(filtered.slice(0, 8));
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    runSearch();
    return () => { active = false; };
  }, [debounced, token]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <label style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--color-text-main)' }}>
        Step 1: Select Student to Renew
      </label>
      <input
        type="search"
        placeholder="Search by student name, student ID (e.g. STU_006), or parent phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)', fontSize: 'var(--font-size-sm)',
          boxSizing: 'border-box',
        }}
      />
      {loading && <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Searching students…</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxHeight: '200px', overflowY: 'auto' }}>
        {candidates.map((s) => {
          const isSelected = selectedStudent?.student_id === s.student_id;
          return (
            <div
              key={s.student_id}
              onClick={() => onSelectStudent(s)}
              style={{
                padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)',
                border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border-subtle)',
                backgroundColor: isSelected ? 'var(--color-primary-subtle, #eff6ff)' : 'var(--color-bg-surface)',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <div>
                <strong style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)' }}>
                  {s.student_name || s.full_name}
                </strong>
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                  {s.student_id}
                </span>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  Parent: {s.parent_name || '—'} · Phone: {s.parent_phone || s.phone || '—'} · Subject: {s.subject || 'General'}
                </div>
              </div>
              <span style={{
                fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 'var(--radius-full)',
                backgroundColor: s.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                color: s.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
              }}>
                {s.status || 'ACTIVE'}
              </span>
            </div>
          );
        })}
      </div>
      {selectedStudent && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 'var(--font-size-sm)' }}>
          Selected student: <strong>{selectedStudent.student_name || selectedStudent.full_name}</strong> (<code>{selectedStudent.student_id}</code>). Permanent ID will be strictly preserved.
        </div>
      )}
    </div>
  );
};
