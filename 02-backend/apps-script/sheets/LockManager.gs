/**
 * LockManager: Manages concurrency locks for mutation serialization.
 * Always releases locks in a finally block.
 */

var _mockLockHeld = false;

function withLock(timeoutMs, actionFn) {
  var limit = timeoutMs || 10000;
  var lock = null;

  if (typeof LockService !== 'undefined') {
    lock = LockService.getScriptLock();
    var acquired = lock.tryLock(limit);
    if (!acquired) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Could not acquire script lock within timeout; try again'
      };
    }
  } else {
    // In-memory test simulation
    if (_mockLockHeld) {
      return {
        success: false,
        code: 'CONFLICT',
        message: 'Mock lock is currently held'
      };
    }
    _mockLockHeld = true;
  }

  try {
    var result = actionFn();
    return { success: true, result: result };
  } finally {
    if (lock) {
      try { lock.releaseLock(); } catch (e) {}
    } else {
      _mockLockHeld = false;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { withLock: withLock };
}
