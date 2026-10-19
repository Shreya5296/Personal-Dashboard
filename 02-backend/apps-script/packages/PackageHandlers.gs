/**
 * PackageHandlers: Adapts API requests to PackageService calls and registers operations.
 */

var _pkgSvcH = typeof Packages_create === 'function' ? { Packages_create: Packages_create, Packages_enrichWithBalance: Packages_enrichWithBalance } : (typeof require !== 'undefined' ? require('./PackageService.gs') : null);
var _pkgRepoH = typeof Packages_getByStudentId === 'function' ? { Packages_getByStudentId: Packages_getByStudentId, Packages_getAll: Packages_getAll, Packages_getById: Packages_getById } : (typeof require !== 'undefined' ? require('./PackageRepository.gs') : null);

function registerPackageOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('packages.list', function(ctx) {
    var studentId = ctx.payload && ctx.payload.studentId;
    var raw = studentId
      ? _pkgRepoH.Packages_getByStudentId(ctx.spreadsheet, studentId)
      : _pkgRepoH.Packages_getAll(ctx.spreadsheet);

    var enriched = raw.map(function(p) {
      return _pkgSvcH.Packages_enrichWithBalance(ctx.spreadsheet, p);
    });

    return { success: true, data: enriched };
  });

  reg('packages.get', function(ctx) {
    if (!ctx.payload || !ctx.payload.packageId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing packageId' };
    }
    var pkg = _pkgRepoH.Packages_getById(ctx.spreadsheet, ctx.payload.packageId);
    if (!pkg) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Package not found: ' + ctx.payload.packageId };
    }
    return { success: true, data: _pkgSvcH.Packages_enrichWithBalance(ctx.spreadsheet, pkg) };
  });

  reg('packages.create', function(ctx) {
    return _pkgSvcH.Packages_create(ctx.spreadsheet, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });
}

if (typeof registerOperation === 'function') {
  registerPackageOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerPackageOperations: registerPackageOperations };
}
