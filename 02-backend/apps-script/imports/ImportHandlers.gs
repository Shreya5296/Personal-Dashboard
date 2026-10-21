/**
 * ImportHandlers: Exposes imports.preview and imports.execute API operations.
 */

var _impService = typeof Imports_preview === 'function' ? { Imports_preview: Imports_preview, Imports_execute: Imports_execute } : (typeof require !== 'undefined' ? require('./ImportService.gs') : null);

function registerImportOperations(router) {
  var reg = router && router.registerOperation ? router.registerOperation : (typeof registerOperation === 'function' ? registerOperation : null);
  if (!reg) return;

  reg('imports.preview', function(context) {
    var p = context.payload || context.data || {};
    var rows = p.rows || [];
    var fn = typeof Imports_preview === 'function' ? Imports_preview : (_impService && _impService.Imports_preview);
    var result = fn(context.spreadsheet, rows);
    return {
      success: true,
      data: result
    };
  });

  reg('imports.execute', function(context) {
    var p = context.payload || context.data || {};
    var rows = p.rows || [];
    var fn = typeof Imports_execute === 'function' ? Imports_execute : (_impService && _impService.Imports_execute);
    var result = fn(context.spreadsheet, rows, {
      actorId: context.actorId,
      email: context.verifiedEmail,
      requestId: context.requestId
    });
    return {
      success: true,
      data: result
    };
  });
}

if (typeof registerOperation === 'function') {
  registerImportOperations({ registerOperation: registerOperation });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    registerImportOperations: registerImportOperations,
    handleImportPreview: function(c) {
      var fn = typeof Imports_preview === 'function' ? Imports_preview : (_impService && _impService.Imports_preview);
      return fn(c.spreadsheet, c.data.rows);
    },
    handleImportExecute: function(c) {
      var fn = typeof Imports_execute === 'function' ? Imports_execute : (_impService && _impService.Imports_execute);
      return fn(c.spreadsheet, c.data.rows, { actorId: c.actorId, email: c.verifiedEmail, requestId: c.requestId });
    }
  };
}
