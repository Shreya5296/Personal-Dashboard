/**
 * ImportHandlers: Exposes imports.preview and imports.execute API operations.
 */

var _routerImp = typeof registerOperation === 'function' ? { registerOperation: registerOperation } : (typeof require !== 'undefined' ? require('../api/OperationRouter.gs') : null);
var _impService = typeof previewImportData === 'function' ? { previewImportData: previewImportData, executeImportData: executeImportData } : (typeof require !== 'undefined' ? require('./ImportService.gs') : null);

_routerImp.registerOperation('imports.preview', function(context) {
  var p = context.payload || context.data || {};
  var rows = p.rows || [];
  var result = _impService.previewImportData(rows);
  return {
    success: true,
    data: result
  };
});

_routerImp.registerOperation('imports.execute', function(context) {
  var p = context.payload || context.data || {};
  var rows = p.rows || [];
  var result = _impService.executeImportData(rows, context.actorId, context.verifiedEmail);
  return {
    success: true,
    data: result
  };
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleImportPreview: function(c) { return _impService.previewImportData(c.data.rows); },
    handleImportExecute: function(c) { return _impService.executeImportData(c.data.rows, c.actorId, c.verifiedEmail); }
  };
}
