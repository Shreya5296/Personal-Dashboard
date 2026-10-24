import React, { useState, useRef, useEffect } from 'react';
import { Student } from '../students/studentTypes';
import formStyles from '../../components/forms/forms.module.css';

export interface SearchableStudentSelectProps {
  students: Student[];
  selectedStudentId: string;
  onChange: (studentId: string) => void;
  error?: string;
  disabled?: boolean;
}

export const SearchableStudentSelect: React.FC<SearchableStudentSelectProps> = ({
  students,
  selectedStudentId,
  onChange,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedStudent = students.find((s) => s.student_id === selectedStudentId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = students.filter((s) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    const name = (s.student_name || s.full_name || '').toLowerCase();
    return name.includes(q) || s.student_id.toLowerCase().includes(q);
  });

  const handleSelect = (s: Student) => {
    onChange(s.student_id);
    setQuery('');
    setIsOpen(false);
  };

  const displayValue = isOpen
    ? query
    : selectedStudent
    ? `${selectedStudent.student_name || selectedStudent.full_name || 'Unnamed'} — ${selectedStudent.student_id}`
    : '';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label="Select or search student..."
          placeholder="Select or search student..."
          className={`${formStyles.input} ${error ? formStyles.inputError : ''}`}
          style={{ paddingRight: '2.5rem' }}
          disabled={disabled}
          value={displayValue}
          onFocus={() => { setQuery(''); setIsOpen(true); }}
          onChange={(e) => { setQuery(e.target.value); if (!isOpen) setIsOpen(true); }}
        />
        <div style={{ position: 'absolute', right: '14px', pointerEvents: 'none', fontSize: '10px', color: 'var(--color-text-muted)' }}>
          ▼
        </div>
      </div>

      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: 'var(--color-bg-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              No matching students found
            </div>
          ) : (
            filtered.map((s) => {
              const isSelected = s.student_id === selectedStudentId;
              const name = s.student_name || s.full_name || 'Unnamed';
              return (
                <div
                  key={s.student_id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(s)}
                  style={{
                    padding: '8px 12px',
                    fontSize: 'var(--font-size-sm)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--color-primary-bg)' : 'transparent',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)'; }}
                  onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <span style={{ fontWeight: 500 }}>
                    {name} — <span style={{ fontFamily: 'monospace', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{s.student_id}</span>
                  </span>
                  {s.subject && <span style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>{s.subject}</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
