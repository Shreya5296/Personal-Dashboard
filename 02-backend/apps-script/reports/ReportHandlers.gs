/**
 * ReportHandlers: Adapts API requests to ReportService calls and registers operations.
 */

var _repSvcH = typeof Reports_getDashboardOverview === 'function' ? { Reports_getDashboardOverview: Reports_getDashboardOverview, Reports_getFinancialSummary: Reports_getFinancialSummary } : (typeof require !== 'undefined' ? require('./ReportService.gs') : null);

function registerReportOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('dashboard.overview', function(ctx) {
    return _repSvcH.Reports_getDashboardOverview(ctx.spreadsheet);
  });

  reg('reports.financialSummary', function(ctx) {
    return _repSvcH.Reports_getFinancialSummary(ctx.spreadsheet, ctx.payload);
  });
}

if (typeof registerOperation === 'function') {
  registerReportOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerReportOperations: registerReportOperations };
}
