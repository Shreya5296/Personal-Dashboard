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
  const response = await sendApiRequest<MeetingLink>(
    'meetingLinks.create',
    input as unknown as Record<string, unknown>,
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
