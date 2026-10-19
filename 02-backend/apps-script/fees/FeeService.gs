/**
 * FeeService: Business rules, balance derivation, and fee obligation lifecycle.
 */

var _feeIdGen = typeof generateFeeObligationId === 'function' ? { generateFeeObligationId: generateFeeObligationId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);
var _feeVal = typeof validateFeeObligationInput === 'function' ? { validateFeeObligationInput: validateFeeObligationInput, validateFeeVoidInput: validateFeeVoidInput } : (typeof require !== 'undefined' ? require('./FeeValidation.gs') : null);
var _feeRepo = typeof FeeObligations_getAll === 'function' ? { FeeObligations_getAll: FeeObligations_getAll, FeeObligations_getById: FeeObligations_getById, FeeObligations_getByStudentId: FeeObligations_getByStudentId, FeeObligations_insert: FeeObligations_insert, FeeObligations_update: FeeObligations_update } : (typeof require !== 'undefined' ? require('./FeeRepository.gs') : null);
var _feeStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _feeAudit = typeof recordAuditEvent === 'function' ? { recordAuditEvent: recordAuditEvent } : (typeof require !== 'undefined' ? require('../audit/AuditService.gs') : null);
var _feeReg = typeof SHEET_NAMES !== 'undefined' ? { SHEET_NAMES: SHEET_NAMES, getExpectedHeaders: getExpectedHeaders } : (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs') : null);
var _feeMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord, recordToRow: recordToRow } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _feeRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);

function FeeObligations_create(spreadsheet, data, actor) {
  var v = _feeVal.validateFeeObligationInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var student = _feeStuRepo.Students_getById(spreadsheet, data.student_id);
  if (!student) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + data.student_id };
  }

  var now = new Date().toISOString();
  var id = _feeIdGen.generateFeeObligationId();
  var record = {
    fee_obligation_id: id,
    student_id: data.student_id,
    enrollment_id: data.enrollment_id || '',
    package_id: data.package_id || '',
    obligation_description: String(data.obligation_description).trim(),
    amount_due: Math.round(Number(data.amount_due) * 100) / 100,
    currency: 'INR',
    issue_date: data.issue_date || now.split('T')[0],
    due_date: data.due_date || '',
    obligation_status: 'OPEN',
    notes: data.notes ? String(data.notes).trim() : '',
    created_at: now,
    updated_at: now,
    voided_at: '',
    void_reason: ''
  };

  _feeRepo.FeeObligations_insert(spreadsheet, record);

  _feeAudit.recordAuditEvent(spreadsheet, _feeReg, _feeMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'FEE_OBLIGATION',
    entity_id: id,
    action: 'CREATE',
    after_summary: { fee_obligation_id: id, student_id: data.student_id, amount: record.amount_due },
    request_id: actor.requestId
  });

  return { success: true, data: record };
}

function FeeObligations_void(spreadsheet, data, actor) {
  var v = _feeVal.validateFeeVoidInput(data);
  if (!v.valid) {
    return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };
  }

  var existing = _feeRepo.FeeObligations_getById(spreadsheet, data.fee_obligation_id);
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Fee obligation not found' };
  }
  if (existing.obligation_status === 'VOID') {
    return { success: false, code: 'CONFLICT', message: 'Fee obligation is already void' };
  }

  var now = new Date().toISOString();
  var updated = _feeRepo.FeeObligations_update(spreadsheet, data.fee_obligation_id, {
    obligation_status: 'VOID',
    voided_at: now,
    void_reason: String(data.void_reason).trim(),
    updated_at: now
  });

  _feeAudit.recordAuditEvent(spreadsheet, _feeReg, _feeMap, {
    actor_id: actor.actorId,
    actor_email: actor.email,
    entity_type: 'FEE_OBLIGATION',
    entity_id: data.fee_obligation_id,
    action: 'VOID',
    before_summary: { obligation_status: existing.obligation_status },
    after_summary: { obligation_status: 'VOID', void_reason: data.void_reason },
    request_id: actor.requestId
  });

  return { success: true, data: updated };
}

function FeeObligations_enrichWithBalances(spreadsheet, feeRecord) {
  var paySheet = spreadsheet.getSheetByName(_feeReg.SHEET_NAMES.PAYMENTS);
  var payments = _feeRowReader.readAllRecords(paySheet, _feeMap);

  var paidAmount = 0;
  for (var i = 0; i < payments.length; i++) {
    var p = payments[i];
    if (p.fee_obligation_id === feeRecord.fee_obligation_id && p.payment_status !== 'VOID') {
      paidAmount += Number(p.amount) || 0;
    }
  }

  paidAmount = Math.round(paidAmount * 100) / 100;
  var due = Number(feeRecord.amount_due) || 0;
  var outstanding = feeRecord.obligation_status === 'VOID' ? 0 : Math.max(0, Math.round((due - paidAmount) * 100) / 100);

  var todayStr = new Date().toISOString().split('T')[0];
  var isOverdue = Boolean(feeRecord.due_date && feeRecord.due_date < todayStr && outstanding > 0 && feeRecord.obligation_status !== 'VOID');

  var derivedStatus = feeRecord.obligation_status;
  if (derivedStatus !== 'VOID') {
    if (paidAmount >= due && due > 0) {
      derivedStatus = 'PAID';
    } else if (paidAmount > 0) {
      derivedStatus = 'PARTIALLY_PAID';
    } else {
      derivedStatus = 'OPEN';
    }
  }

  var enriched = Object.assign({}, feeRecord);
  enriched.paid_amount = paidAmount;
  enriched.outstanding_amount = outstanding;
  enriched.is_overdue = isOverdue;
  enriched.obligation_status = derivedStatus;

  return enriched;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FeeObligations_create: FeeObligations_create,
    FeeObligations_void: FeeObligations_void,
    FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances
  };
}
