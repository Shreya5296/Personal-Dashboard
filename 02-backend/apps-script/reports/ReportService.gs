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

  // Overdue fees
  var feeSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.FEE_OBLIGATIONS);
  var obligations = _repRowReader.readAllRecords(feeSheet, _repMap);
  var overdueTotal = 0;
  for (var f = 0; f < obligations.length; f++) {
    var enriched = _repFeeSvc.FeeObligations_enrichWithBalances(spreadsheet, obligations[f]);
    if (enriched.is_overdue) {
      overdueTotal += enriched.outstanding_amount;
    }
  }
  overdueTotal = Math.round(overdueTotal * 100) / 100;

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

function Reports_getFinancialSummary(spreadsheet) {
  var feeSheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.FEE_OBLIGATIONS);
  var obligations = _repRowReader.readAllRecords(feeSheet, _repMap);
  var paySheet = spreadsheet.getSheetByName(_repReg.SHEET_NAMES.PAYMENTS);
  var payments = _repRowReader.readAllRecords(paySheet, _repMap);

  var totalBilled = 0;
  for (var i = 0; i < obligations.length; i++) {
    if (obligations[i].obligation_status !== 'VOID') {
      totalBilled += Number(obligations[i].amount_due) || 0;
    }
  }

  var totalReceived = 0;
  for (var j = 0; j < payments.length; j++) {
    if (payments[j].payment_status !== 'VOID') {
      totalReceived += Number(payments[j].amount) || 0;
    }
  }

  totalBilled = Math.round(totalBilled * 100) / 100;
  totalReceived = Math.round(totalReceived * 100) / 100;
  var totalOutstanding = Math.max(0, Math.round((totalBilled - totalReceived) * 100) / 100);

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
