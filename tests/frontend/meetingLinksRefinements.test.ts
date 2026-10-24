import { describe, it, expect } from 'vitest';
import { detectMeetingPlatform } from '../../src/domains/meeting-links/platformDetector';

describe('Meeting Links Refinements — Platform Identification', () => {
  it('correctly identifies Google Meet URLs', () => {
    const meet1 = detectMeetingPlatform('https://meet.google.com/abc-defg-hij');
    expect(meet1?.platform).toBe('GOOGLE_MEET');
    expect(meet1?.label).toBe('Google Meet');

    const meet2 = detectMeetingPlatform('https://meet.google.com/xyz-1234-abc?authuser=0');
    expect(meet2?.platform).toBe('GOOGLE_MEET');
    expect(meet2?.label).toBe('Google Meet');

    const meetSub = detectMeetingPlatform('https://custom.meet.google.com/session');
    expect(meetSub?.platform).toBe('GOOGLE_MEET');
    expect(meetSub?.label).toBe('Google Meet');
  });

  it('correctly identifies Zoom URLs across supported domains', () => {
    const zoom1 = detectMeetingPlatform('https://zoom.us/j/1234567890');
    expect(zoom1?.platform).toBe('ZOOM');
    expect(zoom1?.label).toBe('Zoom');

    const zoomSub = detectMeetingPlatform('https://us04web.zoom.us/j/987654321?pwd=securePassword123');
    expect(zoomSub?.platform).toBe('ZOOM');
    expect(zoomSub?.label).toBe('Zoom');

    const zoomGov = detectMeetingPlatform('https://agency.zoomgov.com/j/555666777');
    expect(zoomGov?.platform).toBe('ZOOM');
    expect(zoomGov?.label).toBe('Zoom');
  });

  it('correctly classifies unrecognized platforms as Other meeting platform', () => {
    const teams = detectMeetingPlatform('https://teams.microsoft.com/l/meetup-join/19%3ameeting');
    expect(teams?.platform).toBe('OTHER');
    expect(teams?.label).toBe('Other meeting platform');

    const webex = detectMeetingPlatform('https://company.webex.com/meet/teacher');
    expect(webex?.platform).toBe('OTHER');
    expect(webex?.label).toBe('Other meeting platform');

    const custom = detectMeetingPlatform('https://tutoring-portal.example.com/room/101');
    expect(custom?.platform).toBe('OTHER');
    expect(custom?.label).toBe('Other meeting platform');
  });

  it('does not misclassify domains containing platform names in other positions', () => {
    const phishing = detectMeetingPlatform('https://zoom.us.malicious-site.com/login');
    expect(phishing?.platform).toBe('OTHER');
    expect(phishing?.label).toBe('Other meeting platform');

    const meetPhish = detectMeetingPlatform('https://meet.google.com.phish.org/session');
    expect(meetPhish?.platform).toBe('OTHER');
    expect(meetPhish?.label).toBe('Other meeting platform');
  });

  it('returns null for empty, placeholder, or invalid inputs', () => {
    expect(detectMeetingPlatform('')).toBeNull();
    expect(detectMeetingPlatform('   ')).toBeNull();
    expect(detectMeetingPlatform('-')).toBeNull();
    expect(detectMeetingPlatform('—')).toBeNull();
    expect(detectMeetingPlatform(null)).toBeNull();
    expect(detectMeetingPlatform(undefined)).toBeNull();
    expect(detectMeetingPlatform('not a url')).toBeNull();
    expect(detectMeetingPlatform('javascript:alert(1)')).toBeNull();
  });

  it('classifies primary and secondary links independently', () => {
    const primaryUrl = 'https://meet.google.com/stu-room-1';
    const secondaryUrl = 'https://zoom.us/j/987654321';

    const pInfo = detectMeetingPlatform(primaryUrl);
    const sInfo = detectMeetingPlatform(secondaryUrl);

    expect(pInfo?.label).toBe('Google Meet');
    expect(sInfo?.label).toBe('Zoom');
  });
});
