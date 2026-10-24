/**
 * PackageService: Business rules, balance calculation, and package lifecycle.
 */

var _pkgIdGen = typeof generatePackageId === 'function' ? { generatePackageId: generatePackageId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _pkgVal = typeof validatePackageInput === 'function' ? { validatePackageInput: validatePackageInput } : (typeof require !== 'undefined' ? require('./PackageValidation.gs') : null);
var _pkgRepo = typeof Packages_getAll === 'function' ? {
  Packages_getAll: Packages_getAll,
  Packages_getById: Packages_getById,
  Packages_getByStudentId: Packages_getByStudentId,
  Packages_insert: Packages_insert,
  Packages_repoUpdate: typeof Packages_repoUpdate === 'function' ? Packages_repoUpdate : null
} : (typeof require !== 'undefined' ? require('./PackageRepository.gs') : null);
var _pkgStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _pkgAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _pkgReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  },
  getExpectedHeaders: function(name) {
    return typeof getExpectedHeaders === 'function' ? getExpectedHeaders(name) : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').getExpectedHeaders(name) : null);
  }
};
var _pkgMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _pkgSvcRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords, findRecordById: findRecordById } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);

function Packages_create(spreadsheet, data, actor) {
  var v = _pkgVal.validatePackageInput(data, false);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _pkgStuRepo.Students_getById(spreadsheet, data.student_id);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + data.student_id };
  }

  var now = new Date().toISOString();
  var id = _pkgIdGen.generatePackageId();
  var rawQty = data.classes_purchased !== undefined ? data.classes_purchased : (data.purchased_classes !== undefined ? data.purchased_classes : data.total_classes);
  var rawPrice = (data.package_price !== undefined && data.package_price !== null && data.package_price !== '')
    ? Number(data.package_price)
    : ((data.price !== undefined && data.price !== null && data.price !== '') ? Number(data.price) : '');
  var rawPerClass = (data.per_class !== undefined && data.per_class !== null && data.per_class !== '') ? Number(data.per_class) : '';

  var planName = String(data.plan_name || data.package_name || '').trim();
  var studentName = data.student_name || student.student_name || student.full_name || (student.first_name ? (student.first_name + ' ' + (student.last_name || '')).trim() : '');

  var rawDuration = data.class_duration !== undefined ? data.class_duration : data.duration_minutes;

  var record = {
    package_id: id,
    student_id: data.student_id,
    student_name: studentName,
    plan_name: planName,
    plan_type: data.plan_type || 'PACKAGE',
    currency: data.currency ? String(data.currency).trim().toUpperCase() : 'INR',
    package_price: rawPrice,
    per_class: rawPerClass,
    classes_purchased: rawQty !== undefined && rawQty !== '' ? Number(rawQty) : 0,
    class_duration: rawDuration !== undefined && rawDuration !== '' ? Number(rawDuration) : '',
    start_date: data.start_date || '',
    end_date: data.end_date || data.expiry_date || '',
    expiry_date: data.end_date || data.expiry_date || '',
    next_due_date: data.next_due_date || '',
    package_status: data.package_status || data.status || 'ACTIVE',
    notes: data.notes ? String(data.notes).trim() : '',
    created_at: now,
    updated_at: now
  };

  _pkgRepo.Packages_insert(spreadsheet, record);

  _pkgAudit.recordAuditEvent(spreadsheet, _pkgReg, _pkgMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'PACKAGE',
    entity_id: id,
    action: 'CREATE',
    after_summary: { package_id: id, student_id: data.student_id, purchased: record.classes_purchased },
    request_id: actor.requestId
  });

  return { success: true, data: Packages_enrichWithBalance(spreadsheet, record) };
}

function Packages_enrichWithBalance(spreadsheet, pkgRecord) {
  var sessionSheet = spreadsheet.getSheetByName(_pkgReg.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = _pkgSvcRowReader.readAllRecords(sessionSheet, _pkgMap);
  var metaMap = (typeof globalThis !== 'undefined' && globalThis.__sessionMetaMap) ? globalThis.__sessionMetaMap : {};

  var consumed = 0;
  var hasExplicitPkg = false;

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    var pkgId = s.package_id || (metaMap[s.class_session_id] ? metaMap[s.class_session_id].package_id : '');
    if (pkgId) {
      hasExplicitPkg = true;
      if (pkgId === pkgRecord.package_id) {
        if (s.deduct_class === true || s.deduct_class === 'TRUE' || s.deduct_class === 'true' || s.class_credit_effect === 'CONSUME') {
          consumed++;
        }
      }
    }
  }

  if (!hasExplicitPkg) {
    var pkgSheet = spreadsheet.getSheetByName(_pkgReg.SHEET_NAMES.PACKAGES);
    var allPackages = pkgSheet ? _pkgSvcRowReader.readAllRecords(pkgSheet, _pkgMap) : [pkgRecord];
    var studentPackages = allPackages.filter(function(p) { return p.student_id === pkgRecord.student_id; });

    studentPackages.sort(function(a, b) {
      var da = a.start_date || a.package_id;
      var db = b.start_date || b.package_id;
      return da < db ? -1 : (da > db ? 1 : 0);
    });

    var totalStudentConsumed = 0;
    for (var j = 0; j < sessions.length; j++) {
      var sj = sessions[j];
      if (sj.student_id === pkgRecord.student_id) {
        if (sj.deduct_class === true || sj.deduct_class === 'TRUE' || sj.deduct_class === 'true' || sj.class_credit_effect === 'CONSUME') {
          totalStudentConsumed++;
        }
      }
    }

    var remainingToDeduct = totalStudentConsumed;
    for (var k = 0; k < studentPackages.length; k++) {
      var sp = studentPackages[k];
      var spPurchased = Number(sp.classes_purchased !== undefined ? sp.classes_purchased : sp.purchased_classes) || 0;
      var allocated = Math.min(remainingToDeduct, spPurchased);
      if (sp.package_id === pkgRecord.package_id) {
        consumed = allocated;
        break;
      }
      remainingToDeduct = Math.max(0, remainingToDeduct - allocated);
    }
  }

  var purchased = Number(pkgRecord.classes_purchased !== undefined ? pkgRecord.classes_purchased : pkgRecord.purchased_classes) || 0;
  var remaining = Math.max(0, purchased - consumed);

  var enriched = Object.assign({}, pkgRecord);
  enriched.consumed_classes = consumed;
  enriched.classes_consumed = consumed;
  enriched.remaining_classes = remaining;
  enriched.is_exhausted = remaining <= 0;
  enriched.classes_purchased = purchased;
  enriched.purchased_classes = purchased;
  enriched.total_classes = purchased;
  enriched.plan_type = pkgRecord.plan_type || 'PACKAGE';
  enriched.package_name = pkgRecord.plan_name || pkgRecord.package_name || pkgRecord.plan_type || 'Custom Plan';
  enriched.end_date = pkgRecord.end_date || pkgRecord.expiry_date || '';
  enriched.expiry_date = enriched.end_date;
  enriched.price = (pkgRecord.package_price !== '' && pkgRecord.package_price !== undefined) ? Number(pkgRecord.package_price) : 0;
  enriched.class_duration = (pkgRecord.class_duration !== '' && pkgRecord.class_duration !== undefined) ? Number(pkgRecord.class_duration) : undefined;
  enriched.duration_minutes = enriched.class_duration;
  enriched.status = pkgRecord.package_status || 'ACTIVE';

  return enriched;
}

function Packages_update(spreadsheet, packageId, data, actor) {
  var existing = _pkgRepo.Packages_getById(spreadsheet, packageId);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Package not found: ' + packageId };
  }
  var updates = {};
  if (data.plan_type !== undefined) updates.plan_type = String(data.plan_type).trim();
  if (data.plan_name !== undefined) updates.plan_name = String(data.plan_name).trim();
  if (data.package_name !== undefined) updates.plan_name = String(data.package_name).trim();
  if (data.currency !== undefined) updates.currency = String(data.currency).trim().toUpperCase();
  if (data.package_price !== undefined && data.package_price !== '') updates.package_price = Number(data.package_price);
  else if (data.price !== undefined && data.price !== '') updates.package_price = Number(data.price);
  if (data.per_class !== undefined && data.per_class !== '') updates.per_class = Number(data.per_class);
  var rawQty = data.classes_purchased !== undefined ? data.classes_purchased : (data.purchased_classes !== undefined ? data.purchased_classes : data.total_classes);
  if (rawQty !== undefined && rawQty !== '') updates.classes_purchased = Number(rawQty);
  var rawDuration = data.class_duration !== undefined ? data.class_duration : data.duration_minutes;
  if (rawDuration !== undefined && rawDuration !== '') updates.class_duration = Number(rawDuration);
  if (data.start_date !== undefined) updates.start_date = data.start_date;
  if (data.end_date !== undefined) updates.end_date = data.end_date;
  if (data.expiry_date !== undefined) updates.expiry_date = data.expiry_date;
  if (data.next_due_date !== undefined) updates.next_due_date = data.next_due_date;
  if (data.notes !== undefined) updates.notes = String(data.notes).trim();
  if (data.package_status !== undefined) updates.package_status = data.package_status;
  else if (data.status !== undefined) updates.package_status = data.status;
  updates.updated_at = new Date().toISOString();

  var updateFn = (_pkgRepo && _pkgRepo.Packages_repoUpdate) ? _pkgRepo.Packages_repoUpdate : (typeof Packages_repoUpdate === 'function' ? Packages_repoUpdate : (_pkgRepo && _pkgRepo.Packages_update));
  updateFn(spreadsheet, packageId, updates);

  if (_pkgAudit && _pkgAudit.recordAuditEvent) {
    _pkgAudit.recordAuditEvent(spreadsheet, _pkgReg, _pkgMap, {
      actor_id: actor ? actor.actorId : 'SYSTEM',
      actor_email: actor ? actor.email : '',
      entity_type: 'PACKAGE',
      entity_id: packageId,
      action: 'UPDATE',
      after_summary: updates,
      request_id: actor ? actor.requestId : ''
    });
  }

  return { success: true, data: Packages_enrichWithBalance(spreadsheet, Object.assign({}, existing, updates)) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Packages_create: Packages_create,
    Packages_update: Packages_update,
    Packages_enrichWithBalance: Packages_enrichWithBalance
  };
}
