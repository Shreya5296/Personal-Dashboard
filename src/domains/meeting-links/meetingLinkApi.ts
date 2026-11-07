import { sendApiRequest } from '../../api/apiClient';
import { MeetingLink, MeetingLinkInput } from './meetingLinkTypes';

export async function fetchMeetingLinks(
  studentId?: string,
  token?: string | null
): Promise<MeetingLink[]> {
  const payload: Record<string, unknown> = {};
  if (studentId) payload.student_id = studentId;

  const response = await sendApiRequest<MeetingLink[]>(
    'meetingLinks.list',
    payload,
    { token }
  );
  return response.data || [];
}

export async function createMeetingLink(
  input: MeetingLinkInput,
  token?: string | null
): Promise<MeetingLink> {
  const payload = {
    ...input,
    link_label: input.link_label || input.label || 'Standard Class Link',
  };
  const response = await sendApiRequest<MeetingLink>(
    'meetingLinks.create',
    payload as unknown as Record<string, unknown>,
    { token }
  );
  return response.data!;
}

export async function updateMeetingLink(
  meetingLinkId: string,
  input: Partial<MeetingLinkInput> & { status?: string },
  token?: string | null
): Promise<MeetingLink> {
  const response = await sendApiRequest<MeetingLink>(
    'meetingLinks.update',
    { meeting_link_id: meetingLinkId, ...input },
    { token }
  );
  return response.data!;
}

export async function deleteMeetingLink(
  studentId: string,
  field: 'meeting_link_1' | 'meeting_link_2',
  token?: string | null
): Promise<MeetingLink> {
  const response = await sendApiRequest<MeetingLink>(
    'meetingLinks.delete',
    { student_id: studentId, field },
    { token }
  );
  return response.data!;
}
