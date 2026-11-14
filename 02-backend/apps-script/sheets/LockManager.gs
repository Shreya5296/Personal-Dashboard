/**
 * LockManager: Manages concurrency locks for mutation serialization.
 * Fails closed if LockService is unavailable or lock acquisition fails.
 * Always releases locks in a finally block and verifies release safety.
 */

var _lockDepth = 0;
var _heldScriptLock = null;

function withLock(timeoutMs, actionFn) {
  var limit = timeoutMs || 10000;

  if (_lockDepth === 0) {
    var ls = (typeof LockService !== 'undefined') ? LockService : (typeof globalThis !== 'undefined' ? globalThis.LockService : undefined);
    if (!ls) {
      return {
        success: false,
        code: 'LOCK_UNAVAILABLE',
        message: 'LockService is not available'
      };
    }
    if (typeof ls.getScriptLock !== 'function') {
      return {
        success: false,
        code: 'LOCK_UNAVAILABLE',
        message: 'LockService.getScriptLock is not available'
      };
    }

    var lock = null;
    try {
      lock = ls.getScriptLock();
    } catch (e) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Exception acquiring script lock: ' + (e.message || String(e))
      };
    }

    if (!lock || typeof lock.tryLock !== 'function') {
      return {
        success: false,
        code: 'LOCK_UNAVAILABLE',
        message: 'Valid ScriptLock could not be obtained'
      };
    }

    var acquired = false;
    try {
      acquired = lock.tryLock(limit);
    } catch (e) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Exception during tryLock: ' + (e.message || String(e))
      };
    }

    if (!acquired) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Could not acquire script lock within timeout; try again'
      };
    }
    _heldScriptLock = lock;
  }

  _lockDepth++;
  var actionError = null;
  var actionResult = null;

  try {
    actionResult = actionFn();
  } catch (err) {
    actionError = err;
  } finally {
    _lockDepth--;
    var releaseError = null;
    if (_lockDepth === 0 && _heldScriptLock) {
      var lockToRelease = _heldScriptLock;
      _heldScriptLock = null;
      try {
        lockToRelease.releaseLock();
      } catch (relErr) {
        releaseError = relErr;
      }
    }

    if (actionError) {
      return {
        success: false,
        code: 'EXECUTION_ERROR',
        message: actionError.message || String(actionError)
      };
    }

    if (releaseError) {
      return {
        success: false,
        code: 'LOCK_RELEASE_ERROR',
        message: 'Exception during lock release: ' + (releaseError.message || String(releaseError))
      };
    }
  }

  return { success: true, result: actionResult };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    withLock: withLock,
    _getLockDepth: function() { return _lockDepth; },
    _resetLockState: function() { _lockDepth = 0; _heldScriptLock = null; }
  };
}
