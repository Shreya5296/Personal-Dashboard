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
  Packages_update: typeof Packages_repoUpdate === 'function' ? Packages_repoUpdate : (typeof Packages_update === 'function' ? Packages_update : null)
} : (typeof require !== 'undefined' ? require('./PackageRepository.gs') : null);
var _pkgStuRepo = typeof Students_getById === 'function' ? { Students_getById: Students_getById } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
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

var _DAY_ABBRS = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
var _ABBR_TO_DAY = { MON: 'MONDAY', TUE: 'TUESDAY', WED: 'WEDNESDAY', THU: 'THURSDAY', FRI: 'FRIDAY', SAT: 'SATURDAY', SUN: 'SUNDAY' };

function _formatTimeTo12h(timeStr) {
  if (!timeStr) return '';
  var clean = String(timeStr).trim().replace(/^'/, '');
  var match = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return clean;
  var h = parseInt(match[1], 10);
  var m = match[2];
  var ampm = h >= 12 ? 'PM' : 'AM';
  var h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return h12 + ':' + m + ' ' + ampm;
}

function _parseTimeTo24h(timeStr) {
  if (!timeStr) return '00:00';
  var clean = String(timeStr).trim();
  var match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return clean;
  var h = parseInt(match[1], 10);
  var m = match[2];
  var ampm = match[3] ? match[3].toUpperCase() : '';
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return (h < 10 ? '0' + h : String(h)) + ':' + m;
}

function _formatScheduleString(entries) {
  if (!entries || !Array.isArray(entries) || entries.length === 0) return '';
  var DAY_ORDER = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  var sorted = entries.slice().sort(function(a, b) {
    var da = String(a.day_of_week || '').toUpperCase();
    var db = String(b.day_of_week || '').toUpperCase();
    return DAY_ORDER.indexOf(da) - DAY_ORDER.indexOf(db);
  });
  var parts = [];
  for (var i = 0; i < sorted.length; i++) {
    var e = sorted[i];
    var dUpper = String(e.day_of_week || '').toUpperCase();
    var abbr = _DAY_ABBRS[dUpper] || e.day_of_week;
    var t12 = _formatTimeTo12h(e.start_time);
    if (abbr && t12) {
      parts.push(abbr + ' - ' + t12);
    }
  }
  return parts.join(', ');
}

function _parseScheduleString(str, durationMinutes) {
  if (!str || typeof str !== 'string') return [];
  var dur = Number(durationMinutes) || 60;
  var items = str.split(',');
  var results = [];
  for (var i = 0; i < items.length; i++) {
    var item = items[i].trim();
    if (!item) continue;
    var dashIdx = item.indexOf('-');
    if (dashIdx === -1) continue;
    var dayPart = item.substring(0, dashIdx).trim().toUpperCase();
    var timePart = item.substring(dashIdx + 1).trim();
    var fullDay = _ABBR_TO_DAY[dayPart] || dayPart;
    var start24 = _parseTimeTo24h(timePart);
    var startParts = start24.split(':').map(Number);
    var endTotalMins = (startParts[0] * 60 + startParts[1]) + dur;
    var endH = Math.floor(endTotalMins / 60) % 24;
    var endM = endTotalMins % 60;
    var end24 = (endH < 10 ? '0' + endH : String(endH)) + ':' + (endM < 10 ? '0' + endM : String(endM));
    results.push({
      day_of_week: fullDay,
      start_time: start24,
      end_time: end24
    });
  }
  return results;
}

function _calcPkgDates(startDateStr, recurringDays, totalClasses) {
  if (!startDateStr || !recurringDays || !recurringDays.length || totalClasses <= 0) return null;
  var DAY_MAP = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
  var days = recurringDays.map(function(d) { return DAY_MAP[String(d).trim().toUpperCase()]; }).filter(function(d) { return d !== undefined; });
  if (!days.length) return null;
  var parts = startDateStr.split('-').map(Number);
  if (!parts[0] || !parts[1] || !parts[2]) return null;
  var curr = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
  var occ = [];
  var safety = 0;
  while (occ.length < totalClasses && safety < 1500) {
    if (days.indexOf(curr.getUTCDay()) !== -1) {
      var cy = curr.getUTCFullYear();
      var cm = String(curr.getUTCMonth() + 1); if (cm.length < 2) cm = '0' + cm;
      var cd = String(curr.getUTCDate()); if (cd.length < 2) cd = '0' + cd;
      occ.push(cy + '-' + cm + '-' + cd);
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
    safety++;
  }
  if (!occ.length) return null;
  var targetDueIdx = Math.max(0, occ.length - 5);
  return {
    startDate: occ[0],
    endDate: occ[occ.length - 1],
    nextDueDate: occ[targetDueIdx],
    start_date: occ[0],
    end_date: occ[occ.length - 1],
    next_due_date: occ[targetDueIdx]
  };
}

function _calcYearlyOccurrences(startDateStr, endDateStr, schedEntries) {
  if (!startDateStr || !endDateStr || !schedEntries || !schedEntries.length) return 0;
  var DAY_MAP = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 };
  var startParts = startDateStr.split('-').map(Number);
  var endParts = endDateStr.split('-').map(Number);
  if (!startParts[0] || !startParts[1] || !startParts[2]) return 0;
  if (!endParts[0] || !endParts[1] || !endParts[2]) return 0;
  var curr = new Date(Date.UTC(startParts[0], startParts[1] - 1, startParts[2], 12, 0, 0));
  var endDt = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2], 12, 0, 0));
  if (curr > endDt) return 0;

  var count = 0;
  var safety = 0;
  while (curr <= endDt && safety < 800) {
    var dayOfWeek = curr.getUTCDay();
    for (var i = 0; i < schedEntries.length; i++) {
      var dStr = String(schedEntries[i].day_of_week || '').trim().toUpperCase();
      if (DAY_MAP[dStr] === dayOfWeek) {
        count++;
      }
    }
    curr.setUTCDate(curr.getUTCDate() + 1);
    safety++;
  }
  return count;
}

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

  var schedStr = data.class_schedule || '';
  if (!schedStr && data.schedules && Array.isArray(data.schedules) && data.schedules.length > 0) {
    schedStr = _formatScheduleString(data.schedules);
  }

  var record = {
    student_id: String(data.student_id).trim(),
    student_name: studentName,
    plan_type: data.plan_type || 'PACKAGE',
    currency: data.currency ? String(data.currency).trim().toUpperCase() : 'INR',
    package_price: rawPrice,
    per_class: rawPerClass,
    classes_purchased: rawQty !== undefined && rawQty !== '' ? Number(rawQty) : 0,
    start_date: data.start_date || '',
    end_date: data.end_date || data.expiry_date || '',
    next_due_date: data.next_due_date || '',
    class_duration: rawDuration !== undefined && rawDuration !== '' ? Number(rawDuration) : 60,
    class_schedule: schedStr
  };

  var isYearly = String(record.plan_type || '').toUpperCase().indexOf('YEARLY') !== -1;
  if (isYearly && record.start_date) {
    if (!record.end_date) {
      var sp = record.start_date.split('-').map(Number);
      var endDefault = new Date(Date.UTC(sp[0] + 1, sp[1] - 1, sp[2] - 1, 12, 0, 0));
      var ey = endDefault.getUTCFullYear();
      var em = String(endDefault.getUTCMonth() + 1); if (em.length < 2) em = '0' + em;
      var ed = String(endDefault.getUTCDate()); if (ed.length < 2) ed = '0' + ed;
      record.end_date = ey + '-' + em + '-' + ed;
    }
    var schedList = (data.schedules && data.schedules.length > 0) ? data.schedules : _parseScheduleString(record.class_schedule, record.class_duration);
    if (schedList && schedList.length > 0) {
      var yearlyCount = _calcYearlyOccurrences(record.start_date, record.end_date, schedList);
      if (yearlyCount > 0 && (!rawQty || rawQty === 0 || rawQty === '0')) {
        record.classes_purchased = yearlyCount;
      }
    }
  }

  if ((!record.end_date || !record.next_due_date) && record.start_date && record.classes_purchased > 0) {
    var schedDays = data.recurring_days || (data.schedules ? data.schedules.map(function(s) { return s.day_of_week; }) : null);
    if (!schedDays && typeof Schedules_list === 'function') {
      try {
        var existingScheds = Schedules_list(spreadsheet, data.student_id) || [];
        schedDays = existingScheds.map(function(s) { return s.day_of_week; });
      } catch (e) {}
    }
    if (schedDays && schedDays.length > 0) {
      var calculated = _calcPkgDates(record.start_date, schedDays, record.classes_purchased);
      if (calculated) {
        if (!record.end_date) {
          record.end_date = calculated.endDate;
        }
        if (!record.next_due_date) {
          record.next_due_date = calculated.nextDueDate;
        }
      }
    }
  }

  // Idempotently reuse existing package during registration retry if matching package already exists
  var existingPkgs = _pkgRepo.Packages_getByStudentId(spreadsheet, data.student_id) || [];
  var matchingPkg = null;
  for (var ep = 0; ep < existingPkgs.length; ep++) {
    var ex = existingPkgs[ep];
    if (data.package_id && ex.package_id && ex.package_id === data.package_id) {
      matchingPkg = ex;
      break;
    }
    if (Number(ex.classes_purchased) === Number(record.classes_purchased) &&
        (ex.start_date === record.start_date || (!ex.start_date && !record.start_date))) {
      matchingPkg = ex;
      break;
    }
  }

  var mem = (typeof globalThis !== 'undefined') ? (globalThis.__pkgMemoryMap = globalThis.__pkgMemoryMap || {}) : {};

  if (matchingPkg) {
    _pkgRepo.Packages_update(spreadsheet, data.student_id, record);
    var updatedRecord = Object.assign({}, matchingPkg, record, { package_id: id });
    mem[id] = updatedRecord;
    return { success: true, data: Packages_enrichWithBalance(spreadsheet, updatedRecord) };
  }

  _pkgRepo.Packages_insert(spreadsheet, record);
  var createdRecord = Object.assign({}, record, { package_id: id });
  mem[id] = createdRecord;

  return { success: true, data: Packages_enrichWithBalance(spreadsheet, createdRecord) };
}

function Packages_enrichWithBalance(spreadsheet, pkgRecord) {
  if (!pkgRecord) return null;
  var sessionSheet = spreadsheet.getSheetByName(_pkgReg.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = _pkgSvcRowReader.readAllRecords(sessionSheet, _pkgMap);
  var metaMap = (typeof globalThis !== 'undefined' && globalThis.__sessionMetaMap) ? globalThis.__sessionMetaMap : {};

  var consumed = 0;
  var hasExplicitPkg = false;

  for (var i = 0; i < sessions.length; i++) {
    var s = sessions[i];
    if (!s) continue;
    var sDate = '';
    if (s.schedule_date instanceof Date) {
      var dy = s.schedule_date.getFullYear();
      var dm = s.schedule_date.getMonth() + 1;
      var dd = s.schedule_date.getDate();
      sDate = dy + '-' + (dm < 10 ? '0' + dm : String(dm)) + '-' + (dd < 10 ? '0' + dd : String(dd));
    } else {
      sDate = String(s.schedule_date || s.class_date || (s.scheduled_start ? String(s.scheduled_start).slice(0, 10) : '')).trim().replace(/^'/, '');
    }

    var sTimeStr = '00:00';
    if (s.schedule_time instanceof Date) {
      var th = s.schedule_time.getHours();
      var tm = s.schedule_time.getMinutes();
      sTimeStr = (th < 10 ? '0' + th : String(th)) + ':' + (tm < 10 ? '0' + tm : String(tm));
    } else {
      sTimeStr = String(s.schedule_time || s.start_time || (s.scheduled_start ? String(s.scheduled_start).slice(11, 16) : '00:00')).trim().replace(/^'/, '').slice(0, 5);
    }
    var compId = (s.student_id || '') + '__' + sDate + '__' + sTimeStr;
    var pkgId = s.package_id || (metaMap[s.class_session_id] ? metaMap[s.class_session_id].package_id : '') || (metaMap[compId] ? metaMap[compId].package_id : '');
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
    var studentPackages = allPackages.filter(function(p) { return p && p.student_id === pkgRecord.student_id; });

    studentPackages.sort(function(a, b) {
      var da = a.start_date || a.package_id || '';
      var db = b.start_date || b.package_id || '';
      return da < db ? -1 : (da > db ? 1 : 0);
    });

    var totalStudentConsumed = 0;
    for (var j = 0; j < sessions.length; j++) {
      var sj = sessions[j];
      if (sj && sj.student_id === pkgRecord.student_id) {
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
      var isTargetPkg = (sp.package_id && pkgRecord.package_id && sp.package_id === pkgRecord.package_id) ||
        (sp.start_date && pkgRecord.start_date && sp.start_date === pkgRecord.start_date) ||
        (sp._rowIndex && pkgRecord._rowIndex && sp._rowIndex === pkgRecord._rowIndex) ||
        (studentPackages.length === 1);
      if (isTargetPkg) {
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
  enriched.class_duration = (pkgRecord.class_duration !== '' && pkgRecord.class_duration !== undefined) ? Number(pkgRecord.class_duration) : 60;
  enriched.duration_minutes = enriched.class_duration;
  enriched.status = pkgRecord.package_status || 'ACTIVE';
  enriched.class_schedule = pkgRecord.class_schedule || '';
  enriched.schedules = _parseScheduleString(enriched.class_schedule, enriched.class_duration);

  return enriched;
}

function Packages_update(spreadsheet, targetId, data, actor) {
  var sid = targetId || (data && (data.student_id || data.packageId || data.package_id));
  var existing = _pkgRepo.Packages_getById(spreadsheet, sid);
  if (!existing && _pkgRepo.Packages_getByStudentId) {
    var pkgs = _pkgRepo.Packages_getByStudentId(spreadsheet, sid);
    if (pkgs && pkgs.length > 0) existing = pkgs[0];
  }
  if (!existing) {
    return { success: false, code: 'RECORD_NOT_FOUND', message: 'Package not found for student: ' + sid };
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
  if (data.class_schedule !== undefined) {
    updates.class_schedule = String(data.class_schedule).trim();
  } else if (data.schedules && Array.isArray(data.schedules)) {
    updates.class_schedule = _formatScheduleString(data.schedules);
  }

  var isYearlyPlan = updates.plan_type ? updates.plan_type.toUpperCase().indexOf('YEARLY') !== -1 : (existing.plan_type && existing.plan_type.toUpperCase().indexOf('YEARLY') !== -1);
  if (isYearlyPlan) {
    var sDate = updates.start_date || existing.start_date;
    var eDate = updates.end_date || existing.end_date;
    var sStr = updates.class_schedule !== undefined ? updates.class_schedule : (existing.class_schedule || '');
    var dur = updates.class_duration || existing.class_duration || 60;
    var parsedSched = _parseScheduleString(sStr, dur);
    if (sDate && eDate && parsedSched.length > 0 && updates.classes_purchased === undefined) {
      var yCount = _calcYearlyOccurrences(sDate, eDate, parsedSched);
      if (yCount > 0) updates.classes_purchased = yCount;
    }
  }

  updates.updated_at = new Date().toISOString();

  var updated = _pkgRepo.Packages_update(spreadsheet, existing.student_id, updates);

  return { success: true, data: Packages_enrichWithBalance(spreadsheet, Object.assign({}, existing, updates)) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Packages_create: Packages_create,
    Packages_update: Packages_update,
    Packages_enrichWithBalance: Packages_enrichWithBalance,
    _calcPkgDates: _calcPkgDates,
    _calcYearlyOccurrences: _calcYearlyOccurrences,
    _formatScheduleString: _formatScheduleString,
    _parseScheduleString: _parseScheduleString
  };
}
