import { describe, it, expect, beforeEach } from 'vitest';
import { MockSpreadsheet } from '../mocks/MockSpreadsheet';

// @ts-ignore
import SheetRegistry from '../../02-backend/apps-script/sheets/SheetRegistry.gs';
// @ts-ignore
import SpreadsheetBootstrap from '../../02-backend/apps-script/sheets/SpreadsheetBootstrap.gs';

// Load backend modules via CommonJS
// @ts-ignore
const { MeetingLinks_deleteSlot, MeetingLinks_deactivate } = require('../../02-backend/apps-script/meeting-links/MeetingLinkService.gs');
// @ts-ignore
const { registerMeetingLinkOperations } = require('../../02-backend/apps-script/meeting-links/MeetingLinkHandlers.gs');

describe('Backend Meeting Link Delete Operations', () => {
  let spreadsheet: MockSpreadsheet;
  const registry: Record<string, Function> = {};
  const mockRouter = {
    registerOperation: (name: string, fn: Function) => {
      registry[name] = fn;
    },
  };

  beforeEach(() => {
    spreadsheet = new MockSpreadsheet();
    SpreadsheetBootstrap.bootstrapSpreadsheet(spreadsheet, SheetRegistry, '1.0.0');
    registerMeetingLinkOperations(mockRouter);

    const sheet = spreadsheet.getSheetByName('MeetingLinks');
    // Pre-populate with two student records
    sheet!.appendRow(['STU_001', 'Aarav Patel', 'https://meet.google.com/link1', 'https://zoom.us/j/link2']);
    sheet!.appendRow(['STU_002', 'Diya Sharma', 'https://meet.google.com/only_link', '']);
  });

  it('deletes only meeting_link_1 for a student, preserving meeting_link_2 and identity', () => {
    const res = MeetingLinks_deleteSlot(spreadsheet, {
      student_id: 'STU_001',
      field: 'meeting_link_1',
    });

    expect(res.success).toBe(true);
    expect(res.data.meeting_link_1).toBe('');
    expect(res.data.meeting_link_2).toBe('https://zoom.us/j/link2');
    expect(res.data.student_id).toBe('STU_001');
    expect(res.data.student_name).toBe('Aarav Patel');

    const sheet = spreadsheet.getSheetByName('MeetingLinks');
    expect(sheet!.rows[1]).toEqual(['STU_001', 'Aarav Patel', '', 'https://zoom.us/j/link2']);
    // Other student untouched
    expect(sheet!.rows[2]).toEqual(['STU_002', 'Diya Sharma', 'https://meet.google.com/only_link', '']);
  });

  it('deletes only meeting_link_2 for a student, preserving meeting_link_1', () => {
    const res = MeetingLinks_deleteSlot(spreadsheet, {
      student_id: 'STU_001',
      field: 'meeting_link_2',
    });

    expect(res.success).toBe(true);
    expect(res.data.meeting_link_1).toBe('https://meet.google.com/link1');
    expect(res.data.meeting_link_2).toBe('');

    const sheet = spreadsheet.getSheetByName('MeetingLinks');
    expect(sheet!.rows[1]).toEqual(['STU_001', 'Aarav Patel', 'https://meet.google.com/link1', '']);
  });

  it('deletes the only existing meeting link (meeting_link_1 for STU_002) without deleting the student record', () => {
    const res = MeetingLinks_deleteSlot(spreadsheet, {
      student_id: 'STU_002',
      field: 'meeting_link_1',
    });

    expect(res.success).toBe(true);
    expect(res.data.meeting_link_1).toBe('');
    expect(res.data.meeting_link_2).toBe('');

    const sheet = spreadsheet.getSheetByName('MeetingLinks');
    expect(sheet!.rows).toHaveLength(3); // header + 2 student rows remain
    expect(sheet!.rows[2]).toEqual(['STU_002', 'Diya Sharma', '', '']);
  });

  it('handles slot-based aliases: slot 1 and slot 2 (or primary / secondary)', () => {
    const resSlot1 = MeetingLinks_deleteSlot(spreadsheet, { student_id: 'STU_001', slot: 'primary' });
    expect(resSlot1.success).toBe(true);
    expect(resSlot1.data.meeting_link_1).toBe('');

    const resSlot2 = MeetingLinks_deleteSlot(spreadsheet, { student_id: 'STU_001', slot: 2 });
    expect(resSlot2.success).toBe(true);
    expect(resSlot2.data.meeting_link_2).toBe('');
  });

  it('rejects invalid field names with INVALID_FIELD', () => {
    const res = MeetingLinks_deleteSlot(spreadsheet, {
      student_id: 'STU_001',
      field: 'meeting_link_3', // forbidden
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe('INVALID_FIELD');
  });

  it('rejects missing or empty student ID with VALIDATION_ERROR', () => {
    const res = MeetingLinks_deleteSlot(spreadsheet, {
      student_id: '',
      field: 'meeting_link_1',
    });

    expect(res.success).toBe(false);
    expect(res.code).toBe('VALIDATION_ERROR');
  });

  it('handles nonexistent student safely without crashing or corrupting data', () => {
    const res = MeetingLinks_deleteSlot(spreadsheet, {
      student_id: 'STU_NONEXISTENT',
      field: 'meeting_link_1',
    });

    expect(res.success).toBe(true);
    expect(res.data.student_id).toBe('STU_NONEXISTENT');
  });

  it('executes through registered router operations meetingLinks.delete and meetingLinks.deactivate', () => {
    const delRes = registry['meetingLinks.delete']({
      spreadsheet,
      payload: { student_id: 'STU_001', field: 'meeting_link_1' },
      actorId: 'usr_admin',
    });
    expect(delRes.success).toBe(true);
    expect(delRes.data.meeting_link_1).toBe('');

    const deactRes = registry['meetingLinks.deactivate']({
      spreadsheet,
      payload: { student_id: 'STU_001', slot: 2 },
      actorId: 'usr_admin',
    });
    expect(deactRes.success).toBe(true);
    expect(deactRes.data.meeting_link_2).toBe('');
  });
});
