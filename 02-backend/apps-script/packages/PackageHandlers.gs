/**
 * PackageHandlers: Adapts API requests to PackageService calls and registers operations.
 */

var _pkgSvcH = typeof Packages_create === 'function' ? { Packages_create: Packages_create, Packages_update: Packages_update, Packages_enrichWithBalance: Packages_enrichWithBalance } : (typeof require !== 'undefined' ? require('./PackageService.gs') : null);
var _pkgRepoH = typeof Packages_getByStudentId === 'function' ? { Packages_getByStudentId: Packages_getByStudentId, Packages_getAll: Packages_getAll, Packages_getById: Packages_getById } : (typeof require !== 'undefined' ? require('./PackageRepository.gs') : null);
var _renSvcH = typeof Packages_renew === 'function' ? { Packages_renew: Packages_renew } : (typeof require !== 'undefined' ? require('./RenewalService.gs') : null);

function registerPackageOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('packages.list', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    var raw = studentId
      ? _pkgRepoH.Packages_getByStudentId(ctx.spreadsheet, studentId)
      : _pkgRepoH.Packages_getAll(ctx.spreadsheet);

    var enriched = raw.map(function(p) {
      return _pkgSvcH.Packages_enrichWithBalance(ctx.spreadsheet, p);
    });

    return { success: true, data: enriched };
  });

  reg('packages.getBalance', function(ctx) {
    var studentId = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id);
    if (!studentId) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId' };
    }
    var raw = _pkgRepoH.Packages_getByStudentId(ctx.spreadsheet, studentId);
    var totalPurchased = 0;
    var totalConsumed = 0;
    var totalRestored = 0;
    var remainingClasses = 0;

    for (var i = 0; i < raw.length; i++) {
      var enriched = _pkgSvcH.Packages_enrichWithBalance(ctx.spreadsheet, raw[i]);
      totalPurchased += Number(enriched.classes_purchased || raw[i].classes_purchased || raw[i].purchased_classes) || 0;
      totalConsumed += enriched.consumed_classes || 0;
      remainingClasses += enriched.remaining_classes || 0;
    }

    return {
      success: true,
      data: {
        totalPurchased: totalPurchased,
        totalConsumed: totalConsumed,
        totalRestored: totalRestored,
        remainingClasses: remainingClasses
      }
    };
  });

  reg('packages.get', function(ctx) {
    var id = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id || ctx.payload.packageId || ctx.payload.package_id);
    if (!id) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId' };
    }
    var pkg = _pkgRepoH.Packages_getById(ctx.spreadsheet, id);
    if (!pkg && _pkgRepoH.Packages_getByStudentId) {
      var pkgs = _pkgRepoH.Packages_getByStudentId(ctx.spreadsheet, id);
      if (pkgs && pkgs.length > 0) pkg = pkgs[0];
    }
    if (!pkg) {
      return { success: false, code: 'RECORD_NOT_FOUND', message: 'Package not found: ' + id };
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

  reg('packages.update', function(ctx) {
    var id = ctx.payload && (ctx.payload.studentId || ctx.payload.student_id || ctx.payload.packageId || ctx.payload.package_id);
    if (!id) {
      return { success: false, code: 'VALIDATION_ERROR', message: 'Missing studentId' };
    }
    var updateFn = typeof Packages_update === 'function' ? Packages_update : (_pkgSvcH && _pkgSvcH.Packages_update);
    if (!updateFn) {
      return { success: false, code: 'UNAVAILABLE', message: 'Packages_update function unavailable' };
    }
    return updateFn(ctx.spreadsheet, id, ctx.payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  });

  var renewHandler = function(ctx) {
    var renewFn = typeof Packages_renew === 'function' ? Packages_renew : (_renSvcH && _renSvcH.Packages_renew);
    if (!renewFn) {
      return { success: false, code: 'UNAVAILABLE', message: 'Packages_renew function unavailable' };
    }
    var payload = ctx.payload || {};
    if (!payload.idempotency_key && ctx.idempotencyKey) {
      payload.idempotency_key = ctx.idempotencyKey;
    }
    return renewFn(ctx.spreadsheet, payload, {
      actorId: ctx.actorId,
      email: ctx.verifiedEmail,
      verifiedEmail: ctx.verifiedEmail,
      requestId: ctx.requestId
    });
  };

  reg('packages.renew', renewHandler);
  reg('students.renew', renewHandler);
}

if (typeof registerOperation === 'function') {
  registerPackageOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerPackageOperations: registerPackageOperations };
}
