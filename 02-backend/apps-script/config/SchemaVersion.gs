/**
 * Schema Version Definition
 * Canonical schema version for the master spreadsheet
 */

var SCHEMA_VERSION = '1.0.0';

function getSchemaVersion() {
  return SCHEMA_VERSION;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    getSchemaVersion: getSchemaVersion
  };
}
