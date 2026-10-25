import React from 'react';
import { AVAILABLE_SUBJECTS } from './subjectConstants';

export interface SubjectDropdownMenuProps {
  selectedSubjects: string[];
  onToggle: (subject: string) => void;
}

export const SubjectDropdownMenu: React.FC<SubjectDropdownMenuProps> = ({
  selectedSubjects,
  onToggle,
}) => {
  return (
    <div
      role="listbox"
      aria-multiselectable="true"
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        zIndex: 1000,
        maxHeight: '220px',
        overflowY: 'auto',
        padding: '4px 0',
      }}
    >
      {AVAILABLE_SUBJECTS.map((subj) => {
        const isSelected = selectedSubjects.includes(subj);
        return (
          <div
            key={subj}
            role="option"
            aria-selected={isSelected}
            tabIndex={0}
            onClick={() => onToggle(subj)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggle(subj);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 12px',
              fontSize: 'var(--font-size-sm)',
              cursor: 'pointer',
              backgroundColor: isSelected ? 'var(--color-primary-bg)' : 'transparent',
              color: isSelected ? 'var(--color-primary)' : 'var(--color-text-main)',
              fontWeight: isSelected ? 500 : 400,
            }}
            onMouseEnter={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--color-bg-subtle)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => {}}
              style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
            />
            <span>{subj}</span>
          </div>
        );
      })}
    </div>
  );
};
