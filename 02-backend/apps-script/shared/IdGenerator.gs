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

function formatStudentId(num) {
  var n = Number(num);
  if (isNaN(n) || n < 1) n = 1;
  if (n < 10) return 'STU_00' + n;
  if (n < 100) return 'STU_0' + n;
  return 'STU_' + n;
}

function generateSequentialStudentId(existingIds) {
  var idSet = {};
  var maxNum = 0;
  var list = existingIds || [];
  for (var i = 0; i < list.length; i++) {
    var rawId = list[i];
    if (rawId === undefined || rawId === null) continue;
    var idStr = String(rawId).trim();
    if (!idStr) continue;
    idSet[idStr.toUpperCase()] = true;

    var match = idStr.match(/^STU_(\d+)$/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  var nextNum = maxNum + 1;
  var candidate = formatStudentId(nextNum);
  while (idSet[candidate.toUpperCase()]) {
    nextNum++;
    candidate = formatStudentId(nextNum);
  }
  return candidate;
}

function generateStudentId(existingIds) {
  return generateSequentialStudentId(existingIds || []);
}
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
    formatStudentId: formatStudentId,
    generateSequentialStudentId: generateSequentialStudentId,
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
