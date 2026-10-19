/**
 * OperationRouter: Routes verified, authorized API operations to their handlers.
 */

var _operationRegistry = {};

function registerOperation(name, handlerFn) {
  _operationRegistry[name] = handlerFn;
}

function getRegisteredOperations() {
  return Object.keys(_operationRegistry);
}

function routeOperation(context) {
  var op = context.operation;
  if (!_operationRegistry.hasOwnProperty(op)) {
    return {
      success: false,
      code: 'UNKNOWN_OPERATION',
      message: 'Unknown operation: ' + op,
      retryable: false
    };
  }

  var handler = _operationRegistry[op];
  try {
    return handler(context);
  } catch (err) {
    return {
      success: false,
      code: 'INTERNAL_ERROR',
      message: err.message || 'Operation handler encountered an error',
      retryable: true
    };
  }
}

// Built-in system operations
registerOperation('system.health', function(context) {
  return {
    success: true,
    data: {
      status: 'ok',
      apiVersion: '1',
      schemaVersion: '1.0.0',
      checkedAt: new Date().toISOString()
    }
  };
});

registerOperation('auth.verifySession', function(context) {
  return {
    success: true,
    data: {
      authenticated: true,
      displayIdentity: context.verifiedEmail,
      actorId: context.actorId,
      verifiedAt: new Date().toISOString()
    }
  };
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerOperation: registerOperation,
    routeOperation: routeOperation,
    getRegisteredOperations: getRegisteredOperations
  };
}
