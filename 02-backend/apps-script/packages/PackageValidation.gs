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

  var planName = data.plan_name || data.package_name || data.plan_type;
  if (!isUpdate || data.plan_name !== undefined || data.package_name !== undefined || data.plan_type !== undefined) {
    if (!planName || !String(planName).trim()) {
      errors.package_name = 'Plan name is required';
    }
  }

  var rawQty = data.classes_purchased !== undefined ? data.classes_purchased : (data.purchased_classes !== undefined ? data.purchased_classes : data.total_classes);
  if (!isUpdate || rawQty !== undefined) {
    if (rawQty !== undefined && rawQty !== null && rawQty !== '') {
      var qty = Number(rawQty);
      if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
        errors.purchased_classes = 'Purchased classes must be a positive integer';
      }
    } else if (!isUpdate && (!data.plan_type || data.plan_type === 'PACKAGE' || data.plan_type === 'PER_CLASS')) {
      // If not specified for a package, check if required
      if (rawQty === undefined && !data.plan_type) {
        errors.purchased_classes = 'Purchased classes must be a positive integer';
      }
    }
  }

  var rawPrice = data.package_price !== undefined ? data.package_price : data.price;
  if (rawPrice !== undefined && rawPrice !== null && rawPrice !== '') {
    var price = Number(rawPrice);
    if (isNaN(price) || price < 0) {
      errors.package_price = 'Package price must be a non-negative number';
    }
  }

  var rawPerClass = data.per_class;
  if (rawPerClass !== undefined && rawPerClass !== null && rawPerClass !== '') {
    var perClass = Number(rawPerClass);
    if (isNaN(perClass) || perClass < 0) {
      errors.per_class = 'Per class amount must be a non-negative number';
    }
  }

  var endDate = data.end_date || data.expiry_date;
  if (data.start_date && endDate) {
    if (String(endDate) < String(data.start_date)) {
      errors.end_date = 'End date cannot precede start date';
    }
  }

  var rawStatus = data.package_status || data.status;
  if (rawStatus) {
    var allowed = ['ACTIVE', 'EXHAUSTED', 'EXPIRED', 'CANCELLED', 'CLOSED'];
    if (allowed.indexOf(rawStatus) === -1) {
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
