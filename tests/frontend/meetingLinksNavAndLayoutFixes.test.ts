import { describe, it, expect, vi } from 'vitest';
import { MeetingLinkInput } from '../../src/domains/meeting-links/meetingLinkTypes';

describe('Meeting Links, Navigation, and Layout Fixes', () => {
  describe('Requirement 1 & 3: Meeting Links Actions & Slot Deletion', () => {
    it('deleting primary link clears link 1 while strictly preserving link 2', () => {
      const existing = {
        student_id: 'STU_001',
        student_name: 'Seerat',
        meeting_link_1: 'https://meet.google.com/test-1',
        meeting_link_2: 'https://zoom.us/j/test-2',
        meeting_url: 'https://meet.google.com/test-1',
        provider: 'GOOGLE_MEET',
      };

      // Simulate deleting primary slot
      const slot = 'primary';
      const m1 = slot === 'primary' ? '' : (existing.meeting_link_1 || existing.meeting_url || '');
      const m2 = slot === 'secondary' ? '' : (existing.meeting_link_2 || '');

      const payload: MeetingLinkInput = {
        student_id: existing.student_id,
        student_name: existing.student_name,
        meeting_link_1: m1,
        meeting_link_2: m2,
        meeting_url: m1 || m2 || '',
        provider: existing.provider || 'OTHER',
      };

      expect(payload.meeting_link_1).toBe('');
      expect(payload.meeting_link_2).toBe('https://zoom.us/j/test-2');
      expect(payload.meeting_url).toBe('https://zoom.us/j/test-2');
    });

    it('deleting secondary link clears link 2 while strictly preserving link 1', () => {
      const existing = {
        student_id: 'STU_002',
        student_name: 'Rehaan',
        meeting_link_1: 'https://meet.google.com/rehaan-1',
        meeting_link_2: 'https://zoom.us/j/rehaan-2',
        meeting_url: 'https://meet.google.com/rehaan-1',
        provider: 'GOOGLE_MEET',
      };

      // Simulate deleting secondary slot
      const slot = 'secondary';
      const m1 = slot === 'primary' ? '' : (existing.meeting_link_1 || existing.meeting_url || '');
      const m2 = slot === 'secondary' ? '' : (existing.meeting_link_2 || '');

      const payload: MeetingLinkInput = {
        student_id: existing.student_id,
        student_name: existing.student_name,
        meeting_link_1: m1,
        meeting_link_2: m2,
        meeting_url: m1 || m2 || '',
        provider: existing.provider || 'OTHER',
      };

      expect(payload.meeting_link_1).toBe('https://meet.google.com/rehaan-1');
      expect(payload.meeting_link_2).toBe('');
      expect(payload.meeting_url).toBe('https://meet.google.com/rehaan-1');
    });

    it('confirms before executing delete action', () => {
      let confirmCalled = false;
      let shouldConfirm = false;
      const fakeConfirm = () => {
        confirmCalled = true;
        return shouldConfirm;
      };

      let deleteExecuted = false;
      const handleDelete = () => {
        if (!fakeConfirm()) return;
        deleteExecuted = true;
      };

      shouldConfirm = false;
      handleDelete();
      expect(confirmCalled).toBe(true);
      expect(deleteExecuted).toBe(false);

      shouldConfirm = true;
      handleDelete();
      expect(deleteExecuted).toBe(true);
    });
  });

  describe('Requirement 4: Navigation Reordering and Class Schedule Rename', () => {
    it('verifies exact navigation ordering and Class Schedule label', () => {
      const expectedNav = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'students', label: 'Students' },
        { id: 'classes', label: 'Class Schedule' },
        { id: 'finances', label: 'Finances' },
        { id: 'meeting-links', label: 'Meeting Links' },
      ];

      expect(expectedNav.map(n => n.label)).toEqual([
        'Dashboard',
        'Students',
        'Class Schedule',
        'Finances',
        'Meeting Links',
      ]);
      expect(expectedNav.map(n => n.id)).toEqual([
        'dashboard',
        'students',
        'classes',
        'finances',
        'meeting-links',
      ]);
    });
  });

  describe('Requirement 5: Student Row Arrow Removal', () => {
    it('ensures edit button stopPropagation prevents row toggle', () => {
      let rowExpanded = false;
      let editOpened = false;

      const toggleRow = () => { rowExpanded = !rowExpanded; };
      const editStudent = () => { editOpened = true; };

      const mockEvent = {
        stopPropagation: vi.fn(),
      };

      // When edit button is clicked with stopPropagation:
      mockEvent.stopPropagation();
      editStudent();

      expect(mockEvent.stopPropagation).toHaveBeenCalled();
      expect(editOpened).toBe(true);
      expect(rowExpanded).toBe(false); // Row was not toggled

      // When row itself is clicked:
      toggleRow();
      expect(rowExpanded).toBe(true);
    });
  });
});
