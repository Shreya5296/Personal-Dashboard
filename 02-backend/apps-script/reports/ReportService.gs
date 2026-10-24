/**
 * ReportService: Aggregates dashboard metrics and financial reports from canonical data.
 * Derives financial metrics from the 6 approved business tables (Packages, Payments, Students, ClassSessions).
 * There is no FeeObligations sheet.
 */

var _repRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _repReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  }
};
var _repMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _repPkgSvc = typeof Packages_enrichWithBalance === 'function' ? { Packages_enrichWithBalance: Packages_enrichWithBalance } : (typeof require !== 'undefined' ? require('../packages/PackageService.gs') : null);

function Reports_getDashboardOverview(spreadsheet) {
  var stuSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.STUDENTS);
  var students = stuSheet ? _repRowReader.readAllRecords(stuSheet, _repMap) : [];
  var activeStudents = students.filter(function(s) { return String(s.status || s.student_status || 'ACTIVE').trim().toUpperCase() === 'ACTIVE'; }).length;

  // Upcoming classes in next 7 days
  var clsSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = clsSheet ? _repRowReader.readAllRecords(clsSheet, _repMap) : [];
  var now = new Date();
  var next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  var nowIso = now.toISOString();
  var next7DaysIso = next7Days.toISOString();

  var upcomingCount = 0;
  for (var i = 0; i < sessions.length; i++) {
    var sess = sessions[i];
    if (sess.session_status === 'SCHEDULED' && sess.class_credit_effect !== 'CREDIT_BACK') {
      if (sess.scheduled_start >= nowIso && sess.scheduled_start <= next7DaysIso) {
        upcomingCount++;
      }
    }
  }

  // Outstanding fees derived directly from canonical financial summary
  var finSummary = Reports_getFinancialSummary(spreadsheet);
  var outstandingTotal = (finSummary && finSummary.data) ? finSummary.data.totalOutstanding : 0;

  // Exhausted packages
  var pkgSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.PACKAGES);
  var pkgs = pkgSheet ? _repRowReader.readAllRecords(pkgSheet, _repMap) : [];
  var exhaustedCount = 0;
  for (var p = 0; p < pkgs.length; p++) {
    var pStatus = String(pkgs[p].package_status || pkgs[p].status || pkgs[p].plan_type || '').toUpperCase();
    if (pStatus !== 'CANCELLED' && pStatus !== 'VOID' && _repPkgSvc && _repPkgSvc.Packages_enrichWithBalance) {
      var enrichedPkg = _repPkgSvc.Packages_enrichWithBalance(spreadsheet, pkgs[p]);
      if (enrichedPkg && enrichedPkg.is_exhausted) exhaustedCount++;
    }
  }

  return {
    success: true,
    data: {
      activeStudentsCount: activeStudents,
      upcomingClassesCount: upcomingCount,
      classesUpcoming7Days: upcomingCount,
      overdueFeesTotal: outstandingTotal,
      outstandingFeesTotal: outstandingTotal,
      exhaustedPackagesCount: exhaustedCount,
      currency: 'INR',
      generatedAt: now.toISOString()
    }
  };
}

function Reports_getFinancialSummary(spreadsheet, options) {
  options = options || {};
  var paySheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.PAYMENTS);
  var payments = paySheet ? _repRowReader.readAllRecords(paySheet, _repMap) : [];

  var pkgSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.PACKAGES);
  var pkgs = pkgSheet ? _repRowReader.readAllRecords(pkgSheet, _repMap) : [];

  var stuSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.STUDENTS);
  var students = stuSheet ? _repRowReader.readAllRecords(stuSheet, _repMap) : [];

  // Bidirectional student identity resolver (handles student_id vs student_name consistency)
  var nameToIdMap = {};
  for (var s = 0; s < students.length; s++) {
    var st = students[s];
    var sId = st.student_id ? String(st.student_id).trim() : '';
    var sName = String(st.student_name || st.full_name || (st.first_name ? (st.first_name + ' ' + (st.last_name || '')).trim() : '')).trim().toLowerCase();
    if (sId && sName) {
      nameToIdMap[sName] = sId;
    }
  }

  function resolveStudentKey(record) {
    var sid = record.student_id ? String(record.student_id).trim() : '';
    if (sid) return sid;
    var sname = record.student_name ? String(record.student_name).trim().toLowerCase() : '';
    if (sname && nameToIdMap[sname]) return nameToIdMap[sname];
    return sname || 'UNKNOWN_STUDENT';
  }

  var startDate = options.startDate ? String(options.startDate).slice(0, 10) : '';
  var endDate = options.endDate ? String(options.endDate).slice(0, 10) : '';

  // 1. Process and aggregate Payments
  var paymentsByStudent = {};
  var totalReceived = 0;

  for (var j = 0; j < payments.length; j++) {
    var pay = payments[j];
    var payStatus = String(pay.payment_status || pay.status || '').toUpperCase();
    if (payStatus === 'VOID' || payStatus === 'CANCELLED') {
      continue;
    }

    var payDate = pay.payment_date ? String(pay.payment_date).slice(0, 10) : '';
    if (startDate && payDate && payDate < startDate) continue;
    if (endDate && payDate && payDate > endDate) continue;

    var payCurrency = pay.currency ? String(pay.currency).trim().toUpperCase() : 'INR';
    var rawInInr = pay.in_inr !== undefined && pay.in_inr !== null ? String(pay.in_inr).trim() : '';
    var numInInr = Number(rawInInr);
    var hasValidInInr = rawInInr !== '' && rawInInr !== '-' && !isNaN(numInInr) && numInInr > 0;
    var payAmt = 0;

    if (hasValidInInr) {
      // Manually supplied INR value takes precedence
      payAmt = numInInr;
    } else if (payCurrency === 'INR') {
      // Domestic INR payment amount
      payAmt = Number(pay.amount) || 0;
    } else {
      // Foreign currency payment with no valid manual in_inr: do not invent exchange rates
      payAmt = 0;
    }

    totalReceived += payAmt;
    var payStudentKey = resolveStudentKey(pay);
    paymentsByStudent[payStudentKey] = (paymentsByStudent[payStudentKey] || 0) + payAmt;
  }

  // 2. Deduplicate and aggregate Packages
  // Prevent counting the same package multiple times due to duplicated or historical rows.
  // Deduplication is scoped per student so identical package IDs (e.g. PKG_001) across different students are not conflated.
  var uniquePackagesMap = {};
  for (var k = 0; k < pkgs.length; k++) {
    var rawPkg = pkgs[k];
    var pkgId = rawPkg.package_id ? String(rawPkg.package_id).trim() : '';
    var studentKey = resolveStudentKey(rawPkg);
    var pkgKey = studentKey + '_' + (pkgId || ('_synth_' + (rawPkg.start_date || '') + '_' + (rawPkg.package_price || '')));
    // Latest row overwrites earlier duplicate row for this student
    uniquePackagesMap[pkgKey] = rawPkg;
  }

  var billedByStudent = {};
  var totalBilled = 0;

  if (Object.keys(uniquePackagesMap).length > 0) {
    for (var pKey in uniquePackagesMap) {
      var pkg = uniquePackagesMap[pKey];
      var pkgStatus = String(pkg.package_status || pkg.status || pkg.plan_type || '').toUpperCase();
      if (pkgStatus === 'VOID' || pkgStatus === 'CANCELLED') {
        continue;
      }

      var pkgDate = pkg.start_date ? String(pkg.start_date).slice(0, 10) : (pkg.created_at ? String(pkg.created_at).slice(0, 10) : '');
      if (startDate && pkgDate && pkgDate < startDate) continue;
      if (endDate && pkgDate && pkgDate > endDate) continue;

      var pkgCurrency = pkg.currency ? String(pkg.currency).trim().toUpperCase() : 'INR';
      var pkgPrice = 0;
      if (pkgCurrency === 'INR' || !pkg.currency) {
        pkgPrice = Number(pkg.package_price) || 0;
      } else {
        // Non-INR package: without explicit in_inr in package schema, preserve original value if INR default
        pkgPrice = Number(pkg.package_price) || 0;
      }

      totalBilled += pkgPrice;
      var pkgStudentKey = resolveStudentKey(pkg);
      billedByStudent[pkgStudentKey] = (billedByStudent[pkgStudentKey] || 0) + pkgPrice;
    }
  } else if (_repReg.SHEET_NAMES.FEE_OBLIGATIONS) {
    // Legacy fallback: If no packages exist in sheet (e.g. legacy FeeObligations environments), read obligations
    var feeSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.FEE_OBLIGATIONS);
    var obligations = feeSheet ? _repRowReader.readAllRecords(feeSheet, _repMap) : [];
    for (var i = 0; i < obligations.length; i++) {
      var obl = obligations[i];
      var oblStatus = String(obl.obligation_status || obl.status || '').toUpperCase();
      if (oblStatus === 'VOID' || oblStatus === 'CANCELLED') {
        continue;
      }

      var oblDate = obl.issue_date ? String(obl.issue_date).slice(0, 10) : (obl.due_date ? String(obl.due_date).slice(0, 10) : '');
      if (startDate && oblDate && oblDate < startDate) continue;
      if (endDate && oblDate && oblDate > endDate) continue;

      var oblAmt = Number(obl.amount_due) || 0;
      totalBilled += oblAmt;

      var oblStudentKey = resolveStudentKey(obl);
      billedByStudent[oblStudentKey] = (billedByStudent[oblStudentKey] || 0) + oblAmt;
    }
  }

  totalBilled = Math.round(totalBilled * 100) / 100;
  totalReceived = Math.round(totalReceived * 100) / 100;

  // 3. Calculate Outstanding Balance per Student (prevents credit cross-subsidization)
  var allStudentKeys = {};
  for (var bKey in billedByStudent) allStudentKeys[bKey] = true;
  for (var pKey in paymentsByStudent) allStudentKeys[pKey] = true;

  var totalOutstanding = 0;
  var keysList = Object.keys(allStudentKeys);

  if (keysList.length > 0) {
    for (var i = 0; i < keysList.length; i++) {
      var studentId = keysList[i];
      var sBilled = billedByStudent[studentId] || 0;
      var sPaid = paymentsByStudent[studentId] || 0;
      var sBalance = sBilled - sPaid;
      // Balance cannot go below zero unless business rules explicitly allow negative debt
      if (sBalance > 0) {
        totalOutstanding += sBalance;
      }
    }
  } else {
    totalOutstanding = Math.max(0, totalBilled - totalReceived);
  }

  totalOutstanding = Math.round(totalOutstanding * 100) / 100;

  return {
    success: true,
    data: {
      totalBilled: totalBilled,
      totalInvoiced: totalBilled,
      totalReceived: totalReceived,
      totalCollected: totalReceived,
      totalOutstanding: totalOutstanding,
      currency: 'INR',
      generatedAt: new Date().toISOString()
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Reports_getDashboardOverview: Reports_getDashboardOverview,
    Reports_getFinancialSummary: Reports_getFinancialSummary
  };
}
