import React, { useState, useRef, useEffect } from 'react';
import formStyles from '../../components/forms/forms.module.css';
import { SubjectDropdownMenu } from './SubjectDropdownMenu';
export { AVAILABLE_SUBJECTS, parseSubjectList } from './subjectConstants';

export interface SubjectMultiSelectProps {
  selectedSubjects: string[];
  onChange: (subjects: string[]) => void;
  disabled?: boolean;
  error?: string;
  id?: string;
}

export const SubjectMultiSelect: React.FC<SubjectMultiSelectProps> = ({
  selectedSubjects = [],
  onChange,
  disabled = false,
  error,
  id = 'subject_select',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleToggle = (subject: string) => {
    if (disabled) return;
    if (selectedSubjects.includes(subject)) {
      onChange(selectedSubjects.filter((s) => s !== subject));
    } else {
      onChange([...selectedSubjects, subject]);
    }
  };

  const handleRemove = (subject: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(selectedSubjects.filter((s) => s !== subject));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Escape') setIsOpen(false);
    else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      if (!isOpen) { e.preventDefault(); setIsOpen(true); }
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`${formStyles.input} ${error ? formStyles.inputError : ''}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '4px',
          minHeight: '38px',
          padding: '0.3125rem 2.25rem 0.3125rem 0.625rem',
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: disabled ? 'var(--color-bg-subtle)' : 'var(--color-bg-surface)',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        {selectedSubjects.length === 0 ? (
          <span style={{ color: 'var(--color-text-subtle)', fontSize: 'var(--font-size-sm)' }}>
            Select subjects…
          </span>
        ) : (
          selectedSubjects.map((subj) => (
            <span
              key={subj}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                backgroundColor: 'var(--color-primary-bg)',
                color: 'var(--color-primary)',
                border: '1px solid var(--color-primary-border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 500,
              }}
            >
              {subj}
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Remove ${subj}`}
                  onClick={(e) => handleRemove(subj, e)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '11px',
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  ✕
                </button>
              )}
            </span>
          ))
        )}
        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '10px', color: 'var(--color-text-muted)' }}>
          ▼
        </div>
      </div>

      {isOpen && !disabled && (
        <SubjectDropdownMenu selectedSubjects={selectedSubjects} onToggle={handleToggle} />
      )}
    </div>
  );
};
