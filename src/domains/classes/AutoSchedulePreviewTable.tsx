import React from 'react';
import { ProposedSession } from './classGenerator';
import styles from '../../components/tables/tables.module.css';

export interface AutoSchedulePreviewTableProps {
  sessions: ProposedSession[];
}

export const AutoSchedulePreviewTable: React.FC<AutoSchedulePreviewTableProps> = ({ sessions }) => {
  return (
    <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
      <table className={styles.table} style={{ fontSize: '11px', margin: 0 }}>
        <thead>
          <tr>
            <th style={{ width: '10%' }}>#</th>
            <th style={{ width: '25%' }}>Date</th>
            <th style={{ width: '20%' }}>Day</th>
            <th style={{ width: '20%' }}>Time</th>
            <th style={{ width: '25%' }}>Conflict Status</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s, idx) => (
            <tr
              key={`${s.dateStr}_${s.startTime}_${idx}`}
              style={{ backgroundColor: s.hasConflict ? '#fef2f2' : undefined }}
            >
              <td style={{ fontWeight: 600 }}>{idx + 1}</td>
              <td style={{ fontFamily: 'monospace' }}>{s.dateStr}</td>
              <td>{s.dayName}</td>
              <td style={{ fontFamily: 'monospace' }}>{s.startTime} – {s.endTime}</td>
              <td>
                {s.hasConflict ? (
                  <span style={{ color: '#dc2626', fontWeight: 600 }} title={s.conflictDetails}>
                    ⚠️ {s.isDuplicate ? 'Duplicate' : 'Conflict'}
                  </span>
                ) : (
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Clear</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};