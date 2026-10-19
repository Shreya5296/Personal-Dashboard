/**
 * AuditRepository: Appends operational audit events to the AuditLog sheet.
 */

function appendAuditEvent(sheet, headerMapper, sheetRegistry, event) {
  if (!sheet) return null;
  var headers = sheetRegistry.getExpectedHeaders(sheetRegistry.SHEET_NAMES.AUDIT_LOG);

  var record = {
    audit_id: event.audit_id || ('aud_' + Date.now().toString(36)),
    occurred_at: event.occurred_at || new Date().toISOString(),
    actor_id: event.actor_id || 'system',
    actor_email: event.actor_email || '',
    entity_type: event.entity_type || 'SYSTEM',
    entity_id: event.entity_id || '',
    action: event.action || 'MUTATION',
    before_summary: event.before_summary ? (typeof event.before_summary === 'object' ? JSON.stringify(event.before_summary) : String(event.before_summary)) : '',
    after_summary: event.after_summary ? (typeof event.after_summary === 'object' ? JSON.stringify(event.after_summary) : String(event.after_summary)) : '',
    request_id: event.request_id || '',
    outcome: event.outcome || 'SUCCESS',
    error_code: event.error_code || ''
  };

  var appendFn = (typeof appendRecord === 'function')
    ? appendRecord
    : (typeof require !== 'undefined' ? require('../sheets/RowWriter.gs').appendRecord : null);
  if (appendFn) {
    return appendFn(sheet, headerMapper, headers, record);
  }
  return record;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { appendAuditEvent: appendAuditEvent };
}
