/**
 * RenewalService: Coordinates student renewals, cumulative credit accounting,
 * safe session transition, payment recording, and student reactivation.
 */

var _renVal = typeof validateRenewalInput === 'function' ? { validateRenewalInput: validateRenewalInput, validateRenewalActor: validateRenewalActor } : (typeof require !== 'undefined' ? require('./RenewalValidation.gs') : null);
var _renStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _renStuSvc = typeof Students_update === 'function' ? { Students_update: Students_update } : (typeof require !== 'undefined' ? require('../students/StudentService.gs') : null);
var _renPkgRepo = typeof Packages_getById === 'function' ? { Packages_getById: Packages_getById, Packages_getByStudentId: Packages_getByStudentId, Packages_insert: Packages_insert, Packages_update: Packages_update } : (typeof require !== 'undefined' ? require('./PackageRepository.gs') : null);
var _renPkgSvc = typeof Packages_enrichWithBalance === 'function' ? { Packages_enrichWithBalance: Packages_enrichWithBalance, _calcPkgDates: _calcPkgDates, _formatScheduleString: _formatScheduleString, _parseScheduleString: _parseScheduleString } : (typeof require !== 'undefined' ? require('./PackageService.gs') : null);
var _renClsRepo = typeof Classes_getAll === 'function' ? { Classes_getAll: Classes_getAll } : (typeof require !== 'undefined' ? require('../classes/ClassRepository.gs') : null);
var _renPaySvc = typeof Payments_record === 'function' ? { Payments_record: Payments_record } : (typeof require !== 'undefined' ? require('../payments/PaymentService.gs') : null);
var _renSchedSvc = typeof Schedules_save === 'function' ? { Schedules_save: Schedules_save } : (typeof require !== 'undefined' ? require('../classes/ClassScheduleService.gs') : null);
var _renLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);
var _renTrans = typeof _cancelFutureSessionsOnRenewal === 'function' ? { _countConsumedCredits: _countConsumedCredits, _cancelFutureSessionsOnRenewal: _cancelFutureSessionsOnRenewal, _planRenewalSlots: _planRenewalSlots, _generateNewRenewalSessions: _generateNewRenewalSessions } : (typeof require !== 'undefined' ? require('./RenewalSessionTransition.gs') : null);
var _renIdemp = typeof _checkRenewalIdempotency === 'function' ? { _checkRenewalIdempotency: _checkRenewalIdempotency, _recordRenewalInitiated: _recordRenewalInitiated, _saveRenewalIdempotency: _saveRenewalIdempotency } : (typeof require !== 'undefined' ? require('./RenewalIdempotency.gs') : null);

function Packages_renew(spreadsheet, data, actor) {
  var authCheck = _renVal.validateRenewalActor(actor);
  if (!authCheck.valid) return { success: false, code: authCheck.code, message: authCheck.message };
  var v = _renVal.validateRenewalInput(data);
  if (!v.valid) return { success: false, code: 'VALIDATION_ERROR', message: 'Validation failed', details: v.errors };

  var studentId = String(data.student_id || data.studentId).trim();
  var idempKey = String(data.idempotency_key || data.idempotencyKey).trim();
  if (_renIdemp) {
    var pre = _renIdemp._checkRenewalIdempotency(spreadsheet, idempKey, data);
    if (pre && pre.mismatch) return { success: false, code: pre.code, message: pre.message };
    if (pre && pre.completed) return { success: true, data: pre.data, meta: { idempotentRetry: true } };
  }

  if (!_renLock || typeof _renLock.withLock !== 'function') return { success: false, code: 'LOCK_UNAVAILABLE', message: 'Concurrency lock manager is unavailable' };
  var lockRes = _renLock.withLock(15000, function() {
    var student = _renStuRepo.Students_getById(spreadsheet, studentId);
    if (!student) return { success: false, code: 'RECORD_NOT_FOUND', message: 'Student not found: ' + studentId };
    var studentName = student.student_name || student.full_name || '';

    var allSessions = _renClsRepo.Classes_getAll(spreadsheet) || [];
    var consumedCredits = _renTrans._countConsumedCredits(allSessions, studentId);
    var existingPkgs = _renPkgRepo.Packages_getByStudentId(spreadsheet, studentId) || [];
    var exPkg = existingPkgs.length > 0 ? existingPkgs[0] : null, oldPkgSnapshot = exPkg ? Object.assign({}, exPkg) : null, origOldSchedule = exPkg ? exPkg.class_schedule : '';

    var prevPurchased = exPkg ? Number(exPkg.classes_purchased || exPkg.purchased_classes || 0) : 0, newPurchased = Number(data.new_classes_purchased), cumulativePurchased = prevPurchased + newPurchased;
    var sDate = data.start_date || (exPkg ? exPkg.start_date : ''), createdSessionIds = null;
    var targetSlots = (data.schedules && data.schedules.length > 0) ? _renTrans._planRenewalSlots(allSessions, studentId, data.schedules, sDate, newPurchased) : [];

    if (_renIdemp) {
      var lockCheck = _renIdemp._checkRenewalIdempotency(spreadsheet, idempKey, data);
      if (lockCheck && lockCheck.mismatch) return { success: false, code: lockCheck.code, message: lockCheck.message };
      if (lockCheck && lockCheck.completed) return lockCheck.data;
      if (lockCheck && lockCheck.inProgress && lockCheck.targetCumulative) {
        cumulativePurchased = lockCheck.targetCumulative;
        if (lockCheck.oldSchedule !== undefined) origOldSchedule = lockCheck.oldSchedule;
        if (lockCheck.targetSlots && lockCheck.targetSlots.length > 0) {
          targetSlots = lockCheck.targetSlots;
        } else if (lockCheck.createdSessionIds && lockCheck.createdSessionIds.length > 0) {
          targetSlots = null;
          createdSessionIds = lockCheck.createdSessionIds;
        }
      } else {
        var intentRes = _renIdemp._recordRenewalInitiated(spreadsheet, idempKey, studentId, prevPurchased, cumulativePurchased, data, actor, targetSlots, origOldSchedule);
        if (!intentRes || !intentRes.success) return intentRes || { success: false, code: 'DURABLE_INTENT_FAILED', message: 'Failed writing durable intent' };
      }
    }

    if (String(student.status || '').toUpperCase() !== 'ACTIVE') _renStuSvc.Students_update(spreadsheet, studentId, { status: 'ACTIVE' }, actor);
    var prevAvailable = Math.max(0, prevPurchased - consumedCredits), newAvailable = Math.max(0, cumulativePurchased - consumedCredits);
    var cur = String(data.currency || (exPkg ? exPkg.currency : 'INR')).trim().toUpperCase();
    var price = data.package_price !== undefined && data.package_price !== '' ? Number(data.package_price) : (exPkg ? Number(exPkg.package_price || 0) : 0);
    var perClass = data.per_class !== undefined && data.per_class !== '' ? Number(data.per_class) : (exPkg ? Number(exPkg.per_class || 0) : 0);
    var dur = data.class_duration !== undefined && data.class_duration !== '' ? Number(data.class_duration) : (exPkg ? Number(exPkg.class_duration || 60) : 60);
    var pType = data.plan_type || (exPkg ? exPkg.plan_type : 'Per Class'), eDate = data.end_date || (exPkg ? exPkg.end_date : ''), nDueDate = data.next_due_date || (exPkg ? exPkg.next_due_date : '');

    var schedStr = data.class_schedule || ((data.schedules && data.schedules.length > 0) ? _renPkgSvc._formatScheduleString(data.schedules) : (exPkg ? exPkg.class_schedule || '' : ''));
    if ((!eDate || !nDueDate) && sDate && data.schedules && data.schedules.length > 0) {
      var calculated = _renPkgSvc._calcPkgDates(sDate, data.schedules.map(function(s) { return s.day_of_week; }), newPurchased);
      if (calculated) { if (!eDate) eDate = calculated.endDate; if (!nDueDate) nDueDate = calculated.nextDueDate; }
    }

    var pkgRecord = {
      student_id: studentId, student_name: studentName, plan_type: pType, currency: cur,
      package_price: price, per_class: perClass, classes_purchased: cumulativePurchased,
      start_date: sDate, end_date: eDate, next_due_date: nDueDate, class_duration: dur, class_schedule: schedStr
    };
    if (exPkg) _renPkgRepo.Packages_update(spreadsheet, studentId, pkgRecord);
    else _renPkgRepo.Packages_insert(spreadsheet, pkgRecord);

    var paymentResult = null;
    if (data.payment && (Number(data.payment.amount) > 0 || data.payment.record_payment)) {
      var payCur = String(data.payment.currency || cur).trim().toUpperCase(), payAmt = Number(data.payment.amount) || 0;
      var inInr = data.payment.in_inr !== undefined && data.payment.in_inr !== null && data.payment.in_inr !== '' ? Number(data.payment.in_inr) : (payCur === 'INR' ? payAmt : 0);
      var payDate = data.payment.payment_date || sDate || new Date().toISOString().slice(0, 10);
      paymentResult = _renPaySvc.Payments_record(spreadsheet, {
        student_id: studentId, student_name: studentName, payment_date: payDate,
        amount: payAmt, currency: payCur, in_inr: inInr, reference_number: data.payment.reference_number || '',
        idempotency_key: idempKey + '_pay'
      }, actor);

      if (paymentResult && paymentResult.success === false) {
        try {
          if (oldPkgSnapshot) _renPkgRepo.Packages_update(spreadsheet, studentId, oldPkgSnapshot);
          if (String(student.status || '').toUpperCase() !== 'ACTIVE') _renStuSvc.Students_update(spreadsheet, studentId, { status: 'INACTIVE' }, actor);
        } catch (rbErr) {
          return { success: false, code: 'COMPENSATION_FAILED', message: 'Payment failed and compensating rollback failed: ' + (rbErr.message || String(rbErr)) };
        }
        return paymentResult;
      }
    }

    var sessionsCreatedCount = 0;
    if (data.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
      _renSchedSvc.Schedules_save(spreadsheet, studentId, data.schedules, actor);
      _renTrans._cancelFutureSessionsOnRenewal(spreadsheet, allSessions, studentId, sDate, origOldSchedule, targetSlots);
      sessionsCreatedCount = _renTrans._generateNewRenewalSessions(spreadsheet, studentId, studentName, data.schedules, sDate, newPurchased, dur, eDate, createdSessionIds, targetSlots);
    }

    var resultData = {
      student_id: studentId, student_name: studentName, status: 'ACTIVE',
      previous_available_balance: prevAvailable, new_classes_purchased: newPurchased,
      new_available_balance: newAvailable, cumulative_purchased: cumulativePurchased,
      cumulative_consumed: consumedCredits,
      package: Object.assign({}, pkgRecord, { consumed_classes: consumedCredits, remaining_classes: newAvailable }),
      payment: paymentResult && paymentResult.success ? paymentResult.data : null,
      sessions_created: sessionsCreatedCount
    };

    if (_renIdemp) {
      var saveRes = _renIdemp._saveRenewalIdempotency(spreadsheet, idempKey, studentId, resultData, actor, data);
      if (saveRes && saveRes.success === false) return saveRes;
    }
    return resultData;
  });

  if (!lockRes.success) return { success: false, code: lockRes.code || 'CONFLICT', message: lockRes.message || 'Renewal lock acquisition failed' };
  if (lockRes.result && lockRes.result.success === false) return lockRes.result;
  return { success: true, data: lockRes.result };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Packages_renew: Packages_renew,
    _setLockManager: function(lm) { _renLock = lm; },
    _countConsumedCredits: _renTrans ? _renTrans._countConsumedCredits : null,
    _cancelFutureSessionsOnRenewal: _renTrans ? _renTrans._cancelFutureSessionsOnRenewal : null,
    _planRenewalSlots: _renTrans ? _renTrans._planRenewalSlots : null,
    _generateNewRenewalSessions: _renTrans ? _renTrans._generateNewRenewalSessions : null
  };
}
