/**
 * PackageService: Business rules, balance calculation, and package lifecycle.
 */

var _pkgIdGen = typeof generatePackageId === 'function' ? { generatePackageId: generatePackageId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _pkgVal = typeof validatePackageInput === 'function' ? { validatePackageInput: validatePackageInput } : (typeof require !== 'undefined' ? require('./PackageValidation.gs') : null);
var _pkgRepo = typeof Packages_getAll === 'function' ? { Packages_getAll: Packages_getAll, Packages_getById: Packages_getById, Packages_getByStudentId: Packages_getByStudentId, Packages_insert: Packages_insert, Packages_update: Packages_update } : (typeof require !== 'undefined' ? require('./PackageRepository.gs') : null);
var _pkgStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _pkgEnrRepo = typeof Enrollments_getById === 'function' ? { Enrollments_getById: Enrollments_getById } : (typeof require !== 'undefined' ? require('../enrollments/EnrollmentRepository.gs') : null);
var _pkgAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _pkgReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _pkgMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _pkgRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);

function Packages_create(spreadsheet, data, actor) {
  var v = _pkgVal.validatePackageInput(data, false);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _pkgStuRepo.Students_getById(spreadsheet, data.student_id);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + data.student_id };
  }

  if (data.enrollment_id) {
    var enr = _pkgEnrRepo.Enrollments_getById(spreadsheet, data.enrollment_id);
    if (!enr || enr.student_id !== data.student_id) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Enrollment must belong to the same student' };
    }
  }

  var now = new Date().toISOString();
  var id = _pkgIdGen.generatePackageId();
  var rawQty = data.purchased_classes !== undefined ? data.purchased_classes : data.total_classes;
  var rawPrice = (data.package_price !== undefined && data.package_price !== null && data.package_price !== '')
    ? Number(data.package_price)
    : ((data.price !== undefined && data.price !== null && data.price !== '') ? Number(data.price) : '');

  var record = {
    package_id: id,
    student_id: data.student_id,
    enrollment_id: data.enrollment_id || '',
    package_name: String(data.package_name).trim(),
    purchased_classes: Number(rawQty),
    package_price: rawPrice,
    currency: 'INR',
    purchase_date: data.purchase_date || '',
    start_date: data.start_date || '',
    expiry_date: data.expiry_date || '',
    package_status: data.package_status || data.status || 'ACTIVE',
    notes: data.notes ? String(data.notes).trim() : '',
    created_at: now,
    updated_at: now,
    closed_at: ''
  };

  _pkgRepo.Packages_insert(spreadsheet, record);

  _pkgAudit.recordAuditEvent(spreadsheet, _pkgReg, _pkgMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'PACKAGE',
    entity_id: id,
    action: 'CREATE',
    after_summary: { package_id: id, student_id: data.student_id, purchased: record.purchased_classes },
    request_id: actor.requestId
  });

  return { success: true, data: record };
}

function Packages_enrichWithBalance(spreadsheet, pkgRecord) {
  var sessionSheet = spreadsheet.getSheetByName(_pkgReg.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = _pkgRowReader.readAllRecords(sessionSheet, _pkgMap);

  var consumed = 0;
  var restored = 0;

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (s.package_id === pkgRecord.package_id) {
      if (s.class_credit_effect === 'CONSUME') {
        consumed++;
      } else if (s.class_credit_effect === 'CREDIT_BACK') {
        restored++;
      }
    }
  }

  var netConsumed = Math.max(0, consumed - restored);
  var purchased = Number(pkgRecord.purchased_classes) || 0;
  var remaining = Math.max(0, purchased - netConsumed);

  var enriched = Object.assign({}, pkgRecord);
  enriched.consumed_classes = netConsumed;
  enriched.remaining_classes = remaining;
  enriched.is_exhausted = remaining <= 0;
  enriched.total_classes = Number(pkgRecord.purchased_classes) || 0;
  enriched.price = (pkgRecord.package_price !== '' && pkgRecord.package_price !== undefined) ? Number(pkgRecord.package_price) : 0;
  enriched.status = pkgRecord.package_status || 'ACTIVE';

  return enriched;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Packages_create: Packages_create,
    Packages_enrichWithBalance: Packages_enrichWithBalance
  };
}
