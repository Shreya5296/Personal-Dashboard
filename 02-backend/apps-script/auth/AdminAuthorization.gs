/**
 * AdminAuthorization: Verifies whether the authenticated caller is an authorized administrator.
 * Reads allowlist from Script Properties or runtime configuration.
 */

function getAdminAllowlist() {
  if (typeof PropertiesService !== 'undefined') {
    var props = PropertiesService.getScriptProperties();
    var emailStr = props.getProperty('ADMIN_EMAILS') || props.getProperty('ADMIN_EMAIL');
    if (emailStr) {
      return emailStr.split(',').map(function(e) { return e.trim().toLowerCase(); });
    }
  }
  // Default development/test fallback
  return ['ashreya0502@gmail.com', 'admin@example.com', 'admin@synthetic-test.local'];
}

function isAuthorizedAdmin(verifiedEmail) {
  if (!verifiedEmail || typeof verifiedEmail !== 'string') {
    return false;
  }
  var cleanEmail = verifiedEmail.trim().toLowerCase();
  var allowlist = getAdminAllowlist();
  return allowlist.indexOf(cleanEmail) !== -1;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getAdminAllowlist: getAdminAllowlist,
    isAuthorizedAdmin: isAuthorizedAdmin
  };
}
