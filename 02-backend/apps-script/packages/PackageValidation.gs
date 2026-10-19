/**
 * PackageValidation: Validates package inputs, class quantities, and dates.
 */

function validatePackageInput(data, isUpdate) {
  var errors = {};

  if (!isUpdate || data.student_id !== undefined) {
    if (!data.student_id || !String(data.student_id).trim()) {
      errors.student_id = 'Student ID is required';
    }
  }

  if (!isUpdate || data.package_name !== undefined) {
    if (!data.package_name || !String(data.package_name).trim()) {
      errors.package_name = 'Package name is required';
    }
  }

  if (!isUpdate || data.purchased_classes !== undefined) {
    var qty = Number(data.purchased_classes);
    if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
      errors.purchased_classes = 'Purchased classes must be a positive integer';
    }
  }

  if (data.package_price !== undefined && data.package_price !== null && data.package_price !== '') {
    var price = Number(data.package_price);
    if (isNaN(price) || price < 0) {
      errors.package_price = 'Package price must be a non-negative number';
    }
  }

  if (data.start_date && data.expiry_date) {
    if (String(data.expiry_date) < String(data.start_date)) {
      errors.expiry_date = 'Expiry date cannot precede start date';
    }
  }

  if (data.package_status) {
    var allowed = ['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED', 'CLOSED'];
    if (allowed.indexOf(data.package_status) === -1) {
      errors.package_status = 'Status must be one of: ' + allowed.join(', ');
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: errors
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validatePackageInput: validatePackageInput };
}
