/**
 * IdGenerator: Generates collision-resistant entity identifiers with type prefixes.
 * Format: <prefix><timestamp_hex><random_hex>
 */

var ID_PREFIXES = {
  STUDENT: 'stu_',
  ENROLLMENT: 'enr_',
  PACKAGE: 'pkg_',
  FEE_OBLIGATION: 'fee_',
  PAYMENT: 'pay_',
  CLASS_SESSION: 'cls_',
  MEETING_LINK: 'ml_',
  NOTE: 'note_',
  AUDIT: 'aud_',
  IMPORT_BATCH: 'imp_',
  IMPORT_ROW: 'irr_'
};

function generateId(prefix) {
  var p = prefix || 'id_';
  var timeHex = Date.now().toString(36);
  var randHex = Math.random().toString(36).substring(2, 10);
  return p + timeHex + randHex;
}

function generateStudentId() { return generateId(ID_PREFIXES.STUDENT); }
function generateEnrollmentId() { return generateId(ID_PREFIXES.ENROLLMENT); }
function generatePackageId() { return generateId(ID_PREFIXES.PACKAGE); }
function generateFeeObligationId() { return generateId(ID_PREFIXES.FEE_OBLIGATION); }
function generatePaymentId() { return generateId(ID_PREFIXES.PAYMENT); }
function generateClassSessionId() { return generateId(ID_PREFIXES.CLASS_SESSION); }
function generateMeetingLinkId() { return generateId(ID_PREFIXES.MEETING_LINK); }
function generateNoteId() { return generateId(ID_PREFIXES.NOTE); }
function generateAuditId() { return generateId(ID_PREFIXES.AUDIT); }
function generateImportBatchId() { return generateId(ID_PREFIXES.IMPORT_BATCH); }
function generateImportRowResultId() { return generateId(ID_PREFIXES.IMPORT_ROW); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    ID_PREFIXES: ID_PREFIXES,
    generateId: generateId,
    generateStudentId: generateStudentId,
    generateEnrollmentId: generateEnrollmentId,
    generatePackageId: generatePackageId,
    generateFeeObligationId: generateFeeObligationId,
    generatePaymentId: generatePaymentId,
    generateClassSessionId: generateClassSessionId,
    generateMeetingLinkId: generateMeetingLinkId,
    generateNoteId: generateNoteId,
    generateAuditId: generateAuditId,
    generateImportBatchId: generateImportBatchId,
    generateImportRowResultId: generateImportRowResultId
  };
}
