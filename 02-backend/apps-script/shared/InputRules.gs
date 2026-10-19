/**
 * InputRules: String and URL validation rules.
 */

function trimString(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  var cleaned = phone.replace(/[\s\-()]/g, '');
  return cleaned.length >= 7 && cleaned.length <= 16;
}

function isValidMeetingUrl(url) {
  if (!url || typeof url !== 'string') return false;
  var trimmed = url.trim();
  if (trimmed.indexOf('https://') !== 0) return false;
  try {
    var parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    trimString: trimString,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone,
    isValidMeetingUrl: isValidMeetingUrl
  };
}
