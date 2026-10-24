/**
 * ConfigService: Centralized configuration provider.
 * Reads runtime parameters from ScriptProperties with resilient in-code defaults.
 * Replaces the obsolete on-sheet AppConfig tab.
 */

var APP_DEFAULTS = {
  SCHEMA_VERSION: '2.0.0',
  APP_NAME: 'Student Manager',
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  DEFAULT_CLASS_DURATION_MINUTES: '60'
};

function Config_get(key, defaultValue) {
  if (typeof PropertiesService !== 'undefined') {
    try {
      var props = PropertiesService.getScriptProperties();
      if (props && typeof props.getProperty === 'function') {
        var val = props.getProperty(key);
        if (val !== null && val !== undefined && val !== '') {
          return val;
        }
      }
    } catch (e) {
      // Fall through to defaults if properties service unavailable
    }
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  return APP_DEFAULTS[key] !== undefined ? APP_DEFAULTS[key] : null;
}

function Config_getAll() {
  var result = Object.assign({}, APP_DEFAULTS);
  if (typeof PropertiesService !== 'undefined') {
    try {
      var props = PropertiesService.getScriptProperties();
      if (props && typeof props.getProperties === 'function') {
        var allProps = props.getProperties();
        for (var k in allProps) {
          result[k] = allProps[k];
        }
      }
    } catch (e) {}
  }
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Config_get: Config_get,
    Config_getAll: Config_getAll,
    APP_DEFAULTS: APP_DEFAULTS
  };
}
