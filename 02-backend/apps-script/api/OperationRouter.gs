/**
 * OperationRouter: Routes verified, authorized API operations to their handlers.
 */

var _operationRegistry = {};
var _bootstrapped = false;
var _bootstrapErrors = [];

function registerOperation(name, handlerFn) {
  _operationRegistry[name] = handlerFn;
}

function getRegisteredOperations() {
  return Object.keys(_operationRegistry);
}

function _registerBuiltins() {
  registerOperation('system.health', function(context) {
    return {
      success: true,
      data: { status: 'ok', apiVersion: '1', schemaVersion: '1.0.0', checkedAt: new Date().toISOString() }
    };
  });
  registerOperation('auth.verifySession', function(context) {
    return {
      success: true,
      data: { authenticated: true, displayIdentity: context.verifiedEmail, actorId: context.actorId, verifiedAt: new Date().toISOString() }
    };
  });
}

function _bootstrapAppsScriptHandlers(regObj, errors) {
  var fns = [
    { n: 'registerPackageOperations', f: typeof registerPackageOperations === 'function' ? registerPackageOperations : null },
    { n: 'registerStudentOperations', f: typeof registerStudentOperations === 'function' ? registerStudentOperations : null },
    { n: 'registerPaymentOperations', f: typeof registerPaymentOperations === 'function' ? registerPaymentOperations : null },
    { n: 'registerClassOperations', f: typeof registerClassOperations === 'function' ? registerClassOperations : null },
    { n: 'registerFeeOperations', f: typeof registerFeeOperations === 'function' ? registerFeeOperations : null },
    { n: 'registerReportOperations', f: typeof registerReportOperations === 'function' ? registerReportOperations : null },
    { n: 'registerMeetingLinkOperations', f: typeof registerMeetingLinkOperations === 'function' ? registerMeetingLinkOperations : null },
    { n: 'registerNoteOperations', f: typeof registerNoteOperations === 'function' ? registerNoteOperations : null },
    { n: 'registerClassScheduleOperations', f: typeof registerClassScheduleOperations === 'function' ? registerClassScheduleOperations : null }
  ];
  for (var i = 0; i < fns.length; i++) {
    if (typeof fns[i].f === 'function') {
      try {
        fns[i].f(regObj);
      } catch (err) {
        var m = 'Failed ' + fns[i].n + ': ' + (err.message || String(err));
        if (typeof console !== 'undefined' && console.error) console.error(m);
        errors.push(m);
      }
    }
  }
}

function _bootstrapNodeHandlers(regObj, errors) {
  var mods = [
    ['registerPackageOperations', '../packages/PackageHandlers.gs'],
    ['registerStudentOperations', '../students/StudentHandlers.gs'],
    ['registerPaymentOperations', '../payments/PaymentHandlers.gs'],
    ['registerClassOperations', '../classes/ClassHandlers.gs'],
    ['registerFeeOperations', '../fees/FeeHandlers.gs'],
    ['registerReportOperations', '../reports/ReportHandlers.gs'],
    ['registerMeetingLinkOperations', '../meeting-links/MeetingLinkHandlers.gs'],
    ['registerNoteOperations', '../notes/NoteHandlers.gs'],
    ['registerClassScheduleOperations', '../classes/ClassScheduleHandlers.gs']
  ];
  for (var i = 0; i < mods.length; i++) {
    try {
      var m = require(mods[i][1]);
      if (m && typeof m[mods[i][0]] === 'function') {
        m[mods[i][0]](regObj);
      } else {
        errors.push('Missing export ' + mods[i][0] + ' in ' + mods[i][1]);
      }
    } catch (e) {
      errors.push('Failed loading ' + mods[i][1] + ': ' + (e.message || String(e)));
    }
  }
}

function bootstrapOperations(forceRefresh) {
  if (_bootstrapped && !forceRefresh && _bootstrapErrors.length === 0) {
    return { success: true, count: Object.keys(_operationRegistry).length };
  }
  _bootstrapErrors = [];
  var regObj = { registerOperation: registerOperation };
  _registerBuiltins();
  if (typeof require === 'undefined') {
    _bootstrapAppsScriptHandlers(regObj, _bootstrapErrors);
  } else {
    _bootstrapNodeHandlers(regObj, _bootstrapErrors);
  }
  _bootstrapped = true;
  return { success: _bootstrapErrors.length === 0, errors: _bootstrapErrors, count: Object.keys(_operationRegistry).length };
}

function routeOperation(context) {
  if (!_bootstrapped || _bootstrapErrors.length > 0) bootstrapOperations();
  if (_bootstrapErrors.length > 0) {
    return { success: false, code: 'BOOTSTRAP_FAILED', message: 'Operation router bootstrap failed: ' + _bootstrapErrors.join('; '), retryable: false };
  }
  var op = context.operation;
  if (!_operationRegistry.hasOwnProperty(op)) {
    return { success: false, code: 'UNKNOWN_OPERATION', message: 'Unknown operation: ' + op, retryable: false };
  }
  var handler = _operationRegistry[op];
  try {
    return handler(context);
  } catch (err) {
    return { success: false, code: 'INTERNAL_ERROR', message: err.message || 'Operation handler encountered an error', retryable: true };
  }
}

bootstrapOperations();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerOperation: registerOperation,
    routeOperation: routeOperation,
    getRegisteredOperations: getRegisteredOperations,
    bootstrapOperations: bootstrapOperations
  };
}