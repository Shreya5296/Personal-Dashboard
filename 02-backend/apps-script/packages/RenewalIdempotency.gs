// RenewalIdempotency: Multi-tier durable idempotency and intent tracking for renewals.
function _getIdempMem() {
  if (typeof globalThis !== 'undefined') { if (!globalThis.__renewalIdempCache) globalThis.__renewalIdempCache = {}; return globalThis.__renewalIdempCache; }
  return {};
}

function _getDurableStore() {
  if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
    try { var sp = PropertiesService.getScriptProperties(); if (sp) return sp; } catch (e) {}
  }
  if (typeof globalThis === 'undefined') return null;
  if (!globalThis.__renewalDurableStore) {
    globalThis.__renewalDurableStore = { _d: {}, getProperty: function(k) { return this._d.hasOwnProperty(k) ? this._d[k] : null; }, setProperty: function(k, v) { this._d[k] = String(v); }, deleteProperty: function(k) { delete this._d[k]; }, getProperties: function() { return Object.assign({}, this._d); } };
  }
  return globalThis.__renewalDurableStore;
}

function _normalizeScheduleKey(data) {
  if (data && data.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
    return data.schedules.map(function(s) {
      return String(s.day_of_week || '').trim().toUpperCase() + '@' + String(s.start_time || '00:00').trim().slice(0, 5) + (s.end_time ? '-' + String(s.end_time).trim().slice(0, 5) : '');
    }).sort().join('|');
  }
  return (data && data.class_schedule && typeof data.class_schedule === 'string') ? data.class_schedule.trim().toUpperCase() : '';
}

function _checkRenewalIdempotency(spreadsheet, key, data) {
  if (!key) return null;
  var mem = _getIdempMem(), rec = mem[key], ds = _getDurableStore();
  if (!rec && typeof CacheService !== 'undefined' && CacheService.getScriptCache) {
    try { var c = CacheService.getScriptCache().get('renewal_idemp_' + key); if (c) { rec = JSON.parse(c); mem[key] = rec; } } catch (e) {}
  }
  if (rec && (rec.outcome === 'SUCCESS' || rec.resultData) && ds) {
    try {
      var dRaw = ds.getProperty('renewal_idemp_' + key);
      if (dRaw) { var dP = JSON.parse(dRaw); if (dP.outcome !== 'SUCCESS') { rec = dP; mem[key] = dP; } }
    } catch (e) {}
  }
  if (!rec && ds) {
    try { var raw = ds.getProperty('renewal_idemp_' + key); if (raw) { rec = JSON.parse(raw); mem[key] = rec; } } catch (e) {}
  }
  if (!rec) return null;

  var rRes = rec.resultData, rPkg = rRes ? rRes.package : null, rPayObj = rRes ? rRes.payment : null;
  var sid = rec.student_id || (rRes ? rRes.student_id : null), nCls = rec.new_classes !== undefined ? rec.new_classes : (rRes ? rRes.new_classes_purchased : null);
  var cur = rec.currency !== undefined ? rec.currency : (rPkg ? rPkg.currency : null);
  var rStart = rec.start_date !== undefined ? String(rec.start_date).slice(0, 10) : (rPkg && rPkg.start_date ? String(rPkg.start_date).slice(0, 10) : '');
  var rEnd = rec.end_date !== undefined ? String(rec.end_date).slice(0, 10) : '', rDue = rec.next_due_date !== undefined ? String(rec.next_due_date).slice(0, 10) : '';
  var rPrice = rec.package_price !== undefined ? (rec.package_price !== null && rec.package_price !== '' ? Number(rec.package_price) : null) : null;
  var rPerClass = rec.per_class !== undefined ? (rec.per_class !== null && rec.per_class !== '' ? Number(rec.per_class) : null) : null;
  var rPlan = rec.plan_type !== undefined ? String(rec.plan_type).trim() : '', rDur = rec.class_duration !== undefined ? (rec.class_duration !== null && rec.class_duration !== '' ? Number(rec.class_duration) : null) : null;
  var rPay = rec.payment_amount !== undefined ? (rec.payment_amount !== null && rec.payment_amount !== '' ? Number(rec.payment_amount) : 0) : (rPayObj ? Number(rPayObj.amount || 0) : 0);
  var rPayCur = rec.payment_currency !== undefined ? rec.payment_currency : (rPayObj ? rPayObj.currency : '');
  var rInInr = rec.in_inr !== undefined ? (rec.in_inr !== null && rec.in_inr !== '' ? Number(rec.in_inr) : null) : (rPayObj && rPayObj.in_inr != null ? Number(rPayObj.in_inr) : null);
  var rRef = rec.reference_number !== undefined ? String(rec.reference_number).trim() : (rPayObj && rPayObj.reference_number ? String(rPayObj.reference_number).trim() : '');
  var rPayDate = rec.payment_date !== undefined ? String(rec.payment_date).slice(0, 10) : (rPayObj && rPayObj.payment_date ? String(rPayObj.payment_date).slice(0, 10) : '');
  var rRecPay = rec.record_payment !== undefined ? Boolean(rec.record_payment) : (rPay > 0);
  var rSched = rec.schedule_key || (rPkg ? _normalizeScheduleKey({ class_schedule: rPkg.class_schedule }) : '');

  if (data) {
    var _cf = function(m) { return { mismatch: true, code: 'IDEMPOTENCY_CONFLICT', message: m }; };
    var dSid = String(data.student_id || data.studentId || '').trim(), dCls = Number(data.new_classes_purchased !== undefined ? data.new_classes_purchased : data.classes_purchased);
    if (sid && dSid !== sid) return _cf('Key reused for different student: ' + sid);
    if (nCls !== null && (isNaN(dCls) || Number(nCls) !== dCls)) return _cf('Key reused with different class count');
    var dCur = String(data.currency || 'INR').trim().toUpperCase(), cCur = String(cur || 'INR').trim().toUpperCase();
    if (dCur !== cCur) return _cf('Key reused with different currency');
    var dSched = _normalizeScheduleKey(data);
    if (rSched && dSched && rSched !== dSched) {
      var rDays = rSched.split('|').map(function(x) { return x.split('@')[0]; }).sort().join(','), dDays = dSched.split('|').map(function(x) { return x.split('@')[0]; }).sort().join(',');
      return _cf(rDays !== dDays ? 'Key reused with different schedule weekdays' : 'Key reused with different schedule time');
    }
    var dStart = data.start_date ? String(data.start_date).trim().slice(0, 10) : '', dEnd = data.end_date ? String(data.end_date).trim().slice(0, 10) : '', dDue = data.next_due_date ? String(data.next_due_date).trim().slice(0, 10) : '';
    if ((rec.start_date !== undefined || rStart) && rStart !== dStart) return _cf('Key reused with different start date');
    if ((rec.end_date !== undefined || rEnd) && rEnd !== dEnd) return _cf('Key reused with different end date');
    if ((rec.next_due_date !== undefined || rDue) && rDue !== dDue) return _cf('Key reused with different next due date');
    var dPrice = data.package_price !== undefined && data.package_price !== null && data.package_price !== '' ? Number(data.package_price) : null, dPerClass = data.per_class !== undefined && data.per_class !== null && data.per_class !== '' ? Number(data.per_class) : null;
    if ((rec.package_price !== undefined || rPrice !== null) && rPrice !== dPrice) return _cf('Key reused with different package price');
    if ((rec.per_class !== undefined || rPerClass !== null) && rPerClass !== dPerClass) return _cf('Key reused with different per-class rate');
    var dPlan = String(data.plan_type || '').trim(), dDur = data.class_duration !== undefined && data.class_duration !== null && data.class_duration !== '' ? Number(data.class_duration) : null;
    if ((rec.plan_type !== undefined || rPlan) && String(rPlan || '').trim() !== dPlan) return _cf('Key reused with different plan type');
    if ((rec.class_duration !== undefined || rDur !== null) && rDur !== dDur) return _cf('Key reused with different class duration');
    var dPay = data.payment && data.payment.amount !== undefined && data.payment.amount !== null && data.payment.amount !== '' ? Number(data.payment.amount) : 0, dRecPay = data.payment ? (data.payment.record_payment !== undefined ? Boolean(data.payment.record_payment) : (dPay > 0)) : false;
    if ((rec.record_payment !== undefined || rPay > 0 || (data.payment && data.payment.record_payment !== undefined)) && rRecPay !== dRecPay) return _cf('Key reused with different payment recording toggle');
    if ((rec.payment_amount !== undefined || rPay !== null) && rPay !== dPay) return _cf('Key reused with different payment amount');
    var dPayCur = data.payment && data.payment.currency ? String(data.payment.currency).trim().toUpperCase() : '', dInInr = data.payment && data.payment.in_inr !== undefined && data.payment.in_inr !== null && data.payment.in_inr !== '' ? Number(data.payment.in_inr) : null;
    if ((rec.payment_currency !== undefined || rPayCur) && String(rPayCur || '').toUpperCase() !== dPayCur) return _cf('Key reused with different payment currency');
    if ((rec.in_inr !== undefined || rInInr !== null) && rInInr !== dInInr) return _cf('Key reused with different INR equivalent');
    var dRef = data.payment && data.payment.reference_number ? String(data.payment.reference_number).trim() : '', dPayDate = data.payment && data.payment.payment_date ? String(data.payment.payment_date).trim().slice(0, 10) : '';
    if ((rec.reference_number !== undefined || rRef) && String(rRef || '').trim() !== dRef) return _cf('Key reused with different payment reference number');
    if ((rec.payment_date !== undefined || rPayDate) && String(rPayDate || '').trim().slice(0, 10) !== dPayDate) return _cf('Key reused with different payment date');
  }
  if (rec.outcome === 'SUCCESS' || rec.resultData) return { completed: true, data: rec.resultData || rec };
  return { inProgress: true, targetCumulative: rec.target_cumulative, initialPurchased: rec.initial_purchased, targetSlots: rec.target_slots || rec.planned_slots || [], oldSchedule: rec.old_schedule || '', createdSessionIds: rec.created_session_ids || [] };
}

function _recordRenewalInitiated(spreadsheet, key, studentId, initialPurchased, targetCumulative, data, actor, targetSlots, oldScheduleStr) {
  if (!key) return { success: false, code: 'VALIDATION_ERROR', message: 'idempotency_key is mandatory for durable intent' };
  var pay = (data && data.payment) || {}, payAmt = pay.amount !== undefined && pay.amount !== null && pay.amount !== '' ? Number(pay.amount) : 0;
  var summary = {
    student_id: studentId, new_classes: Number(data.new_classes_purchased), initial_purchased: initialPurchased, target_cumulative: targetCumulative,
    currency: String(data.currency || '').trim().toUpperCase(), start_date: data.start_date || '', end_date: data.end_date || '', next_due_date: data.next_due_date || '',
    package_price: data.package_price !== undefined && data.package_price !== null && data.package_price !== '' ? Number(data.package_price) : null,
    per_class: data.per_class !== undefined && data.per_class !== null && data.per_class !== '' ? Number(data.per_class) : null,
    plan_type: String(data.plan_type || '').trim(), class_duration: data.class_duration !== undefined && data.class_duration !== null && data.class_duration !== '' ? Number(data.class_duration) : null,
    schedule_key: _normalizeScheduleKey(data), target_slots: targetSlots || [], old_schedule: oldScheduleStr || '', created_session_ids: [],
    record_payment: pay.record_payment !== undefined ? Boolean(pay.record_payment) : (payAmt > 0), payment_amount: payAmt, payment_currency: pay.currency ? String(pay.currency).trim().toUpperCase() : '',
    in_inr: pay.in_inr !== undefined && pay.in_inr !== null && pay.in_inr !== '' ? Number(pay.in_inr) : null, payment_date: pay.payment_date || '', reference_number: pay.reference_number || '',
    inProgress: true, outcome: 'STARTED'
  };
  var ds = _getDurableStore();
  if (!ds) return { success: false, code: 'DURABLE_INTENT_FAILED', message: 'Durable property store unavailable' };
  try { ds.setProperty('renewal_idemp_' + key, JSON.stringify(summary)); } catch (err) { return { success: false, code: 'DURABLE_INTENT_FAILED', message: 'Failed writing durable intent: ' + (err.message || String(err)) }; }
  _getIdempMem()[key] = summary;
  if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) { try { CacheService.getScriptCache().put('renewal_idemp_' + key, JSON.stringify(summary), 21600); } catch (e) {} }
  return { success: true, summary: summary };
}

function _saveRenewalIdempotency(spreadsheet, key, studentId, record, actor, data) {
  if (!key) return { success: true };
  var pay = (data && data.payment) || {}, payAmt = pay.amount !== undefined && pay.amount !== null && pay.amount !== '' ? Number(pay.amount) : (record && record.payment ? Number(record.payment.amount || 0) : 0);
  var entry = {
    student_id: studentId, resultData: record, outcome: 'SUCCESS', completed_at: new Date().toISOString(), schedule_key: _normalizeScheduleKey(data),
    new_classes: data && data.new_classes_purchased !== undefined ? Number(data.new_classes_purchased) : (record ? Number(record.new_classes_purchased) : null),
    currency: data && data.currency ? String(data.currency).trim().toUpperCase() : (record && record.package ? record.package.currency : ''),
    start_date: (data && data.start_date) || '', end_date: (data && data.end_date) || '', next_due_date: (data && data.next_due_date) || '',
    package_price: data && data.package_price !== undefined && data.package_price !== null && data.package_price !== '' ? Number(data.package_price) : null,
    per_class: data && data.per_class !== undefined && data.per_class !== null && data.per_class !== '' ? Number(data.per_class) : null,
    plan_type: (data && data.plan_type) || '', class_duration: data && data.class_duration !== undefined && data.class_duration !== null && data.class_duration !== '' ? Number(data.class_duration) : null,
    payment_amount: payAmt, payment_currency: pay.currency ? String(pay.currency).trim().toUpperCase() : '', in_inr: pay.in_inr !== undefined && pay.in_inr !== null && pay.in_inr !== '' ? Number(pay.in_inr) : null,
    reference_number: pay.reference_number || '', payment_date: pay.payment_date || '', record_payment: pay.record_payment !== undefined ? Boolean(pay.record_payment) : (payAmt > 0 || Boolean(record && record.payment))
  };
  var ds = _getDurableStore();
  if (!ds) return { success: false, code: 'DURABLE_PERSIST_FAILED', message: 'Durable property store unavailable' };
  try { ds.setProperty('renewal_idemp_' + key, JSON.stringify(entry)); } catch (e) { return { success: false, code: 'DURABLE_PERSIST_FAILED', message: 'Failed saving completion state: ' + (e.message || String(e)) }; }
  _getIdempMem()[key] = entry;
  if (typeof CacheService !== 'undefined' && CacheService.getScriptCache) { try { CacheService.getScriptCache().put('renewal_idemp_' + key, JSON.stringify(entry), 21600); } catch (e) {} }
  return { success: true };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    _normalizeScheduleKey: _normalizeScheduleKey,
    _checkRenewalIdempotency: _checkRenewalIdempotency,
    _recordRenewalInitiated: _recordRenewalInitiated,
    _saveRenewalIdempotency: _saveRenewalIdempotency,
    _getDurableStore: _getDurableStore
  };
}
