export const AVAILABLE_SUBJECTS = [
  'English',
  'Math',
  'Science',
  'Social Science',
  'Hindi',
  'Geeta',
] as const;

export type AvailableSubject = (typeof AVAILABLE_SUBJECTS)[number];

export function parseSubjectList(subject?: string | string[] | null): string[] {
  if (!subject) return [];
  if (Array.isArray(subject)) return subject.map((s) => String(s).trim()).filter(Boolean);
  return String(subject)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
