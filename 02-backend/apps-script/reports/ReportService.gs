/**
 * ReportService: Aggregates dashboard metrics and financial reports from canonical data.
 */

var _repRowReader = typeof readAllRecords === 'function' ? { readAllRecords: readAllRecords } : (typeof require !== 'undefined' ? require('../sheets/RowReader.gs') : null);
var _repReg = {
  get SHEET_NAMES() {
    return (typeof SHEET_NAMES !== 'undefined' && SHEET_NAMES) || (typeof require !== 'undefined' ? require('../sheets/SheetRegistry.gs').SHEET_NAMES : {});
  }
};
var _repMap = typeof createHeaderMap === 'function' ? { createHeaderMap: createHeaderMap, rowToRecord: rowToRecord } : (typeof require !== 'undefined' ? require('../sheets/HeaderMapper.gs') : null);
var _repFeeSvc = typeof FeeObligations_enrichWithBalances === 'function' ? { FeeObligations_enrichWithBalances: FeeObligations_enrichWithBalances } : (typeof require !== 'undefined' ? require('../fees/FeeService.gs') : null);
var _repPkgSvc = typeof Packages_enrichWithBalance === 'function' ? { Packages_enrichWithBalance: Packages_enrichWithBalance } : (typeof require !== 'undefined' ? require('../packages/PackageService.gs') : null);

function Reports_getDashboardOverview(spreadsheet) {
  var stuSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.STUDENTS);
  var students = _repRowReader.readAllRecords(stuSheet, _repMap);
  var activeStudents = students.filter(function(s) { return (s.status || s.student_status || 'ACTIVE') === 'ACTIVE'; }).length;

  // Upcoming classes in next 7 days
  var clsSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.CLASS_SESSIONS);
  var sessions = _repRowReader.readAllRecords(clsSheet, _repMap);
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

  // Outstanding fees derived from financial summary
  var finSummary = Reports_getFinancialSummary(spreadsheet);
  var overdueTotal = (finSummary && finSummary.data) ? finSummary.data.totalOutstanding : 0;

  // Exhausted packages
  var pkgSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.PACKAGES);
  var pkgs = _repRowReader.readAllRecords(pkgSheet, _repMap);
  var exhaustedCount = 0;
  for (var p = 0; p < pkgs.length; p++) {
    if (pkgs[p].package_status === 'ACTIVE') {
      var enrichedPkg = _repPkgSvc.Packages_enrichWithBalance(spreadsheet, pkgs[p]);
      if (enrichedPkg.is_exhausted) exhaustedCount++;
    }
  }

  return {
    success: true,
    data: {
      activeStudentsCount: activeStudents,
      upcomingClassesCount: upcomingCount,
      classesUpcoming7Days: upcomingCount,
      overdueFeesTotal: overdueTotal,
      outstandingFeesTotal: overdueTotal,
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

  var feeSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.FEE_OBLIGATIONS);
  var obligations = feeSheet ? _repRowReader.readAllRecords(feeSheet, _repMap) : [];

  var startDate = options.startDate ? String(options.startDate).slice(0, 10) : '';
  var endDate = options.endDate ? String(options.endDate).slice(0, 10) : '';

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

    var payAmt = (pay.in_inr !== undefined && pay.in_inr !== null && pay.in_inr !== '')
      ? Number(pay.in_inr)
      : (Number(pay.amount) || 0);

    totalReceived += payAmt;
    var payStudent = (pay.student_id ? String(pay.student_id).trim() : '') || (pay.student_name ? String(pay.student_name).trim().toLowerCase() : '');
    if (payStudent) {
      paymentsByStudent[payStudent] = (paymentsByStudent[payStudent] || 0) + payAmt;
    }
  }

  var billedByStudent = {};
  var totalBilled = 0;

  // Primary source: Packages (canonical 6-sheet data model)
  if (pkgs && pkgs.length > 0) {
    for (var k = 0; k < pkgs.length; k++) {
      var pkg = pkgs[k];
      var pkgStatus = String(pkg.package_status || pkg.status || pkg.plan_type || '').toUpperCase();
      if (pkgStatus === 'VOID' || pkgStatus === 'CANCELLED') {
        continue;
      }

      var pkgDate = pkg.start_date ? String(pkg.start_date).slice(0, 10) : (pkg.created_at ? String(pkg.created_at).slice(0, 10) : '');
      if (startDate && pkgDate && pkgDate < startDate) continue;
      if (endDate && pkgDate && pkgDate > endDate) continue;

      var pkgPrice = Number(pkg.package_price) || 0;
      totalBilled += pkgPrice;

      var pkgStudent = (pkg.student_id ? String(pkg.student_id).trim() : '') || (pkg.student_name ? String(pkg.student_name).trim().toLowerCase() : '');
      if (pkgStudent) {
        billedByStudent[pkgStudent] = (billedByStudent[pkgStudent] || 0) + pkgPrice;
      }
    }
  } else if (obligations && obligations.length > 0) {
    // Legacy fallback: FeeObligations sheet
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

      var oblStudent = (obl.student_id ? String(obl.student_id).trim() : '') || (obl.student_name ? String(obl.student_name).trim().toLowerCase() : '');
      if (oblStudent) {
        billedByStudent[oblStudent] = (billedByStudent[oblStudent] || 0) + oblAmt;
      }
    }
  }

  totalBilled = Math.round(totalBilled * 100) / 100;
  totalReceived = Math.round(totalReceived * 100) / 100;

  var studentIds = {};
  for (var s1 in billedByStudent) studentIds[s1] = true;
  for (var s2 in paymentsByStudent) studentIds[s2] = true;

  var totalOutstanding = 0;
  var studentKeys = Object.keys(studentIds);

  if (studentKeys.length > 0) {
    for (var s = 0; s < studentKeys.length; s++) {
      var sid = studentKeys[s];
      var sBilled = billedByStudent[sid] || 0;
      var sPaid = paymentsByStudent[sid] || 0;
      var sBalance = sBilled - sPaid;
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
