/**
 * AuditService: Coordinates recording operational audit entries.
 * Sanitizes summaries to ensure no passwords, tokens, or credentials are logged.
 */

function recordAuditEvent(spreadsheet, registry, headerMapper, event) {
  try {
    var sheet = spreadsheet.getSheetByName(registry.SHEET_NAMES.AUDIT_LOG);
    if (!sheet) return null;

    // Sanitize summaries to strip any accidental token fields
    var safeBefore = sanitizeAuditPayload(event.before_summary);
    var safeAfter = sanitizeAuditPayload(event.after_summary);

    var cleanEvent = {
      audit_id: event.audit_id,
      occurred_at: event.occurred_at || new Date().toISOString(),
      actor_id: event.actor_id,
      actor_email: event.actor_email,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      action: event.action,
      before_summary: safeBefore,
      after_summary: safeAfter,
      request_id: event.request_id,
      outcome: event.outcome || 'SUCCESS',
      error_code: event.error_code || ''
    };

    var repoFn = (typeof appendAuditEvent === 'function')
      ? appendAuditEvent
      : (typeof require !== 'undefined' ? require('./AuditRepository.gs').appendAuditEvent : null);
    if (repoFn) {
      return repoFn(sheet, headerMapper, registry, cleanEvent);
    }
  } catch (err) {
    // Fail safe: audit failure must not silently crash without notice
    if (typeof console !== 'undefined' && console.error) {
      console.error('Audit logging error:', err);
    }
  }
  return null;
}

function sanitizeAuditPayload(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  var copy = {};
  for (var k in payload) {
    if (payload.hasOwnProperty(k)) {
      var lowerKey = k.toLowerCase();
      if (lowerKey.indexOf('token') !== -1 || lowerKey.indexOf('secret') !== -1 || lowerKey.indexOf('password') !== -1) {
        copy[k] = '[REDACTED]';
      } else {
        copy[k] = payload[k];
      }
    }
  }
  return copy;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    recordAuditEvent: recordAuditEvent,
    sanitizeAuditPayload: sanitizeAuditPayload
  };
}
