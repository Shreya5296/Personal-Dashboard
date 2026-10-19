/**
 * SchemaValidator: Validates that spreadsheet tabs and headers match canonical schema.
 */

function validateSpreadsheetSchema(spreadsheet, registry) {
  var errors = [];
  var sheetNames = registry.getCanonicalSheetNames();

  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      errors.push('Missing required sheet tab: ' + name);
      continue;
    }

    var expectedHeaders = registry.getExpectedHeaders(name);
    if (!expectedHeaders) continue;

    var actualHeaders = sheet.getHeaders ? sheet.getHeaders() : [];
    if (!actualHeaders || actualHeaders.length === 0) {
      errors.push('Sheet ' + name + ' has no header row or is empty');
      continue;
    }

    // Check for duplicates
    var seen = {};
    for (var h = 0; h < actualHeaders.length; h++) {
      var header = actualHeaders[h];
      if (!header) continue;
      if (seen[header]) {
        errors.push('Sheet ' + name + ' contains duplicate header: ' + header);
      }
      seen[header] = true;
    }

    // Check missing expected headers
    for (var e = 0; e < expectedHeaders.length; e++) {
      var expected = expectedHeaders[e];
      if (!seen[expected]) {
        errors.push('Sheet ' + name + ' is missing required header: ' + expected);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateSpreadsheetSchema: validateSpreadsheetSchema
  };
}
