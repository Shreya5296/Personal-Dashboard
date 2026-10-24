/**
 * StudentIdHandlers: Registers API operations for Student ID preflight, migration, and verification.
 */

function registerStudentIdOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('system.studentIdPreflight', function(ctx) {
    var fn = typeof runStudentIdMigrationPreflight === 'function' ? runStudentIdMigrationPreflight : (typeof require !== 'undefined' ? require('./StudentIdPreflight.gs').runStudentIdMigrationPreflight : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'Preflight function not found' };
    return { success: true, data: fn(ctx.spreadsheet) };
  });

  reg('system.studentIdMigrate', function(ctx) {
    var fn = typeof runStudentIdMigration === 'function' ? runStudentIdMigration : (typeof require !== 'undefined' ? require('./StudentIdMigration.gs').runStudentIdMigration : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'Migration function not found' };
    return fn(ctx.spreadsheet);
  });

  reg('system.studentIdVerify', function(ctx) {
    var fn = typeof verifyStudentIdReferentialIntegrity === 'function' ? verifyStudentIdReferentialIntegrity : (typeof require !== 'undefined' ? require('./StudentIdVerification.gs').verifyStudentIdReferentialIntegrity : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'Verification function not found' };
    return fn(ctx.spreadsheet);
  });

  reg('system.studentIdRollback', function(ctx) {
    var fn = typeof rollbackStudentIdMigration === 'function' ? rollbackStudentIdMigration : (typeof require !== 'undefined' ? require('./StudentIdVerification.gs').rollbackStudentIdMigration : null);
    if (!fn) return { success: false, code: 'NOT_FOUND', message: 'Rollback function not found' };
    return fn(ctx.spreadsheet);
  });
}

if (typeof registerOperation === 'function') {
  registerStudentIdOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { registerStudentIdOperations: registerStudentIdOperations };
}
