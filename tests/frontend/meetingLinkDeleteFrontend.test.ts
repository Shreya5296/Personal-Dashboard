import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { deleteMeetingLink } from '../../src/domains/meeting-links/meetingLinkApi';
import { MeetingLinkTable } from '../../src/domains/meeting-links/MeetingLinkTable';
import { MeetingLinkButton } from '../../src/domains/meeting-links/MeetingLinkButton';
import { MeetingLink } from '../../src/domains/meeting-links/meetingLinkTypes';
import { handleMockApiRequest } from '../../src/api/mockDataStore';

describe('Frontend Meeting Link Delete Flow and Button Behavior', () => {
  const sampleLink: MeetingLink = {
    meeting_link_id: 'ml_STU_001',
    student_id: 'STU_001',
    student_name: 'Aarav Patel',
    meeting_link_1: 'https://meet.google.com/pri-link',
    meeting_link_2: 'https://zoom.us/j/sec-link',
    meeting_url: 'https://meet.google.com/pri-link',
    provider: 'GOOGLE_MEET',
  };

  it('renders Delete button for primary and secondary links with accessible labels', () => {
    const onDeleteMock = vi.fn();
    const html = renderToString(
      React.createElement(MeetingLinkTable, {
        links: [sampleLink],
        onEdit: vi.fn(),
        onCopy: vi.fn(),
        onDeleteLink: onDeleteMock,
        copiedKey: null,
      })
    );

    expect(html).toContain('Delete');
    expect(html).toContain('aria-label="Delete meeting link"');
    expect(html).toContain('https://meet.google.com/pri-link');
    expect(html).toContain('https://zoom.us/j/sec-link');
  });

  it('handles primary link deletion in mock data store, preserving secondary link', () => {
    // 1. Initial upsert
    handleMockApiRequest('meetingLinks.create', {
      student_id: 'STU_TEST_DEL',
      meeting_link_1: 'https://meet.google.com/link_a',
      meeting_link_2: 'https://zoom.us/j/link_b',
    }, 'req_setup');

    // 2. Delete primary link
    const delRes = handleMockApiRequest<MeetingLink>('meetingLinks.delete', {
      student_id: 'STU_TEST_DEL',
      field: 'meeting_link_1',
    }, 'req_del1');

    expect(delRes.ok).toBe(true);
    expect(delRes.data.meeting_link_1).toBe('');
    expect(delRes.data.meeting_link_2).toBe('https://zoom.us/j/link_b');
  });

  it('handles secondary link deletion in mock data store, preserving primary link', () => {
    handleMockApiRequest('meetingLinks.create', {
      student_id: 'STU_TEST_DEL2',
      meeting_link_1: 'https://meet.google.com/stay_link',
      meeting_link_2: 'https://zoom.us/j/remove_link',
    }, 'req_setup2');

    const delRes = handleMockApiRequest<MeetingLink>('meetingLinks.delete', {
      student_id: 'STU_TEST_DEL2',
      field: 'meeting_link_2',
    }, 'req_del2');

    expect(delRes.ok).toBe(true);
    expect(delRes.data.meeting_link_1).toBe('https://meet.google.com/stay_link');
    expect(delRes.data.meeting_link_2).toBe('');
  });

  it('handles deleting the only existing meeting link safely down to empty', () => {
    handleMockApiRequest('meetingLinks.create', {
      student_id: 'STU_TEST_DEL_ONLY',
      meeting_link_1: 'https://meet.google.com/lone_link',
      meeting_link_2: '',
    }, 'req_setup_only');

    const delRes = handleMockApiRequest<MeetingLink>('meetingLinks.delete', {
      student_id: 'STU_TEST_DEL_ONLY',
      field: 'meeting_link_1',
    }, 'req_del_only');

    expect(delRes.ok).toBe(true);
    expect(delRes.data.meeting_link_1).toBe('');
    expect(delRes.data.meeting_link_2).toBe('');
  });

  it('renders disabled delete button when disabled prop is passed', () => {
    const html = renderToString(
      React.createElement(MeetingLinkButton, {
        url: 'https://meet.google.com/abc',
        onDelete: vi.fn(),
        disabled: true,
      })
    );

    expect(html).toContain('disabled=""');
    expect(html).toContain('cursor:not-allowed');
  });

  it('preserves existing link copy functionality alongside delete action', () => {
    const onCopyMock = vi.fn();
    const html = renderToString(
      React.createElement(MeetingLinkButton, {
        url: 'https://meet.google.com/test-url',
        onCopy: onCopyMock,
        onDelete: vi.fn(),
      })
    );

    expect(html).toContain('Copy');
    expect(html).toContain('Delete');
  });
});
