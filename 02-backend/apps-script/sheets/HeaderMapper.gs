/**
 * HeaderMapper: Maps named columns to row indexes dynamically.
 * Never relies on hard-coded column letters.
 */

function createHeaderMap(headerRow) {
  if (!headerRow || !Array.isArray(headerRow)) {
    throw new Error('Header row must be an array');
  }

  var map = {};
  var duplicates = [];

  for (var i = 0; i < headerRow.length; i++) {
    var rawName = headerRow[i];
    if (rawName === null || rawName === undefined || rawName === '') continue;
    var name = String(rawName).trim();
    if (map.hasOwnProperty(name)) {
      duplicates.push(name);
    } else {
      map[name] = i;
    }
  }

  if (duplicates.length > 0) {
    throw new Error('Duplicate headers found in sheet: ' + duplicates.join(', '));
  }

  return map;
}

function rowToRecord(headerMap, rowValues) {
  var record = {};
  if (!rowValues || !Array.isArray(rowValues)) return record;

  var isLegacyPkgShift = false;
  if (headerMap.hasOwnProperty('student_id') && headerMap['student_id'] === 0 && !headerMap.hasOwnProperty('package_id')) {
    var firstVal = String(rowValues[0] || '').trim();
    var secondVal = String(rowValues[1] || '').trim();
    if (/^pkg_/i.test(firstVal) && /^stu_/i.test(secondVal)) {
      isLegacyPkgShift = true;
      record['package_id'] = firstVal;
    }
  }

  for (var headerName in headerMap) {
    if (headerMap.hasOwnProperty(headerName)) {
      var colIdx = headerMap[headerName];
      var actualIdx = isLegacyPkgShift ? (colIdx + 1) : colIdx;
      var val = rowValues[actualIdx];
      if (typeof val === 'string' && val.charAt(0) === "'") {
        val = val.substring(1);
      }
      record[headerName] = val !== undefined ? val : null;
    }
  }
  return record;
}

function recordToRow(headerMap, headerList, record) {
  var row = new Array(headerList.length);
  for (var i = 0; i < headerList.length; i++) {
    var headerName = headerList[i];
    var val = record[headerName];
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' && (val.charAt(0) === '+' || val.charAt(0) === '=')) {
        row[i] = "'" + val;
      } else {
        row[i] = val;
      }
    } else {
      row[i] = '';
    }
  }
  return row;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createHeaderMap: createHeaderMap,
    rowToRecord: rowToRecord,
    recordToRow: recordToRow
  };
}
