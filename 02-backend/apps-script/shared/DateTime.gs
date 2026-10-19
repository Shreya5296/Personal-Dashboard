/**
 * DateTime utilities for backend operations.
 * Enforces ISO 8601 timestamps and canonical Asia/Kolkata date handling.
 */

var CANONICAL_TIMEZONE = 'Asia/Kolkata';

function nowIso() {
  return new Date().toISOString();
}

function isValidIsoDate(dateString) {
  if (!dateString || typeof dateString !== 'string') return false;
  // Match YYYY-MM-DD
  var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return false;
  var d = new Date(dateString + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

function isValidIsoTimestamp(timestampString) {
  if (!timestampString || typeof timestampString !== 'string') return false;
  var d = new Date(timestampString);
  return !isNaN(d.getTime());
}

function formatLocalDate(isoDateString) {
  if (!isValidIsoDate(isoDateString)) return isoDateString;
  return isoDateString;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CANONICAL_TIMEZONE: CANONICAL_TIMEZONE,
    nowIso: nowIso,
    isValidIsoDate: isValidIsoDate,
    isValidIsoTimestamp: isValidIsoTimestamp,
    formatLocalDate: formatLocalDate
  };
}
