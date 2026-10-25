import React from 'react';
import { ClassSession } from '../classes/classTypes';
import { Student } from '../students/studentTypes';
import { MeetingLink } from '../meeting-links/meetingLinkTypes';
import { toInputDateFormat } from '../../lib/dateFormat';
import { getDateKeyInTz } from './calendarEventGenerator';
import { formatIsoTo12Hour } from '../../lib/time12Format';
import { Button } from '../../components/buttons/Button';

export interface TodayClassesSectionProps {
  classes: ClassSession[];
  students?: Student[];
  meetingLinks?: MeetingLink[];
  activeTz?: string;
}

export const TodayClassesSection: React.FC<TodayClassesSectionProps> = ({
  classes,
  students = [],
  meetingLinks = [],
  activeTz = 'Asia/Kolkata',
}) => {
  const todayKey = toInputDateFormat(new Date(), activeTz);

  // Filter actual dated sessions for today (NOT fabricated from recurring templates)
  const todaySessions = classes.filter((c) => {
    const raw = c.scheduled_start || c.start_time;
    if (!raw) return false;
    const parsed = new Date(String(raw).trim().replace(/T\s+(\d:)/, 'T0$1'));
    return getDateKeyInTz(parsed, activeTz) === todayKey;
  });

  todaySessions.sort((a, b) => {
    const sa = a.scheduled_start || a.start_time || '';
    const sb = b.scheduled_start || b.start_time || '';
    return sa.localeCompare(sb);
  });

  const getMeetingUrl = (studentId?: string, sessionUrl?: string) => {
    if (sessionUrl) return sessionUrl;
    const linkObj = meetingLinks.find((l) => l.student_id === studentId);
    return linkObj?.meeting_link_1 || linkObj?.meeting_link_2 || '';
  };

  const getSubject = (c: ClassSession) => {
    const stu = students.find((s) => s.student_id === c.student_id);
    return stu?.subject || c.topic || c.class_title || 'General';
  };

  // Find next imminent session
  const imminent = todaySessions[0];
  const others = todaySessions.slice(1);

  const isEligibleToJoin = (c?: ClassSession) => {
    if (!c) return false;
    const status = c.session_status || c.status;
    if (status === 'COMPLETED' || status === 'CANCELLED') return false;
    const url = getMeetingUrl(c.student_id, c.meeting_url);
    return Boolean(url);
  };

  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', boxShadow: 'var(--shadow-xs)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Today's Classes</h3>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>{todayKey} ({activeTz})</span>
      </div>

      {!imminent ? (
        <div style={{ padding: 'var(--space-4) 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          No classes scheduled for today.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {/* 1. Next/Most Imminent Class prominently highlighted */}
          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#eff6ff', border: '1.5px solid #60a5fa', borderRadius: 'var(--radius-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                Next Upcoming Class
              </div>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--color-text-main)', display: 'block' }}>
                {imminent.student_name || imminent.student_id} — {getSubject(imminent)}
              </span>
              <span style={{ fontSize: 'var(--font-size-xs)', color: '#1e40af', fontWeight: 500 }}>
                {formatIsoTo12Hour(imminent.scheduled_start || imminent.start_time, activeTz)}
                {imminent.scheduled_end ? ` – ${formatIsoTo12Hour(imminent.scheduled_end, activeTz)}` : ''} ({imminent.duration_minutes || 60} min)
              </span>
            </div>

            {isEligibleToJoin(imminent) ? (
              <a href={getMeetingUrl(imminent.student_id, imminent.meeting_url)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="md">Join Class ↗</Button>
              </a>
            ) : (
              <Button variant="secondary" size="md" disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                Join Class (Not eligible)
              </Button>
            )}
          </div>

          {/* 2. Other classes scheduled for today */}
          {others.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Other Classes Scheduled Today</span>
              {others.map((c, idx) => {
                const rawStart = c.scheduled_start || c.start_time;
                const time12 = formatIsoTo12Hour(rawStart, activeTz) + (c.scheduled_end ? ` – ${formatIsoTo12Hour(c.scheduled_end, activeTz)}` : '');
                const canJoin = isEligibleToJoin(c);
                const joinUrl = getMeetingUrl(c.student_id, c.meeting_url);
                return (
                  <div key={`${c.session_id || idx}_${c.student_id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border-subtle)', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-main)', display: 'block' }}>
                        {c.student_name || c.student_id} — {getSubject(c)}
                      </span>
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                        {time12} • {c.session_status || c.status || 'SCHEDULED'}
                      </span>
                    </div>
                    {canJoin ? (
                      <a href={joinUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                        <Button variant="secondary" size="sm">Join Class ↗</Button>
                      </a>
                    ) : (
                      <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-subtle)', fontStyle: 'italic' }}>
                        {joinUrl ? 'Scheduled' : 'No meeting link'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
