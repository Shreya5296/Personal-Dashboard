/**
 * ImportValidation: Validation rules and duplicate checks for spreadsheet import rows.
 */

var _stuRepo = typeof findStudentsByStatus === 'function' ? { findStudentsByStatus: findStudentsByStatus } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);

function validateImportRow(row, existingStudents) {
  var fullName = row.fullName || row.full_name || row['Full Name'] || '';
  if (!fullName || !fullName.trim()) {
    return {
      isValid: false,
      isDuplicate: false,
      error: 'Missing required full name'
    };
  }

  var email = (row.email || row.parent_email || row['Email'] || '').trim().toLowerCase();
  var phone = (row.phone || row.primary_phone || row['Phone'] || '').trim();

  // Duplicate candidate detection
  var isDup = false;
  if (existingStudents && existingStudents.length > 0) {
    for (var i = 0; i < existingStudents.length; i++) {
      var s = existingStudents[i];
      var sName = String(s.student_name || s.full_name || (s.first_name ? s.first_name + ' ' + (s.last_name || '') : '')).trim().toLowerCase();
      var sEmail = String(s.parent_email || s.student_email || '').toLowerCase();
      var sPhone = String(s.parent_phone || s.student_phone || s.primary_phone || '').trim();

      if (sName && sName === fullName.trim().toLowerCase()) {
        isDup = true;
        break;
      }
      if (email && sEmail && email === sEmail) {
        isDup = true;
        break;
      }
      if (phone && sPhone && phone === sPhone) {
        isDup = true;
        break;
      }
    }
  }

  return {
    isValid: true,
    isDuplicate: isDup,
    error: null
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateImportRow: validateImportRow
  };
}
