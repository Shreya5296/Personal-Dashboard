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
  for (var headerName in headerMap) {
    if (headerMap.hasOwnProperty(headerName)) {
      var colIdx = headerMap[headerName];
      var val = rowValues[colIdx];
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
    row[i] = val !== undefined && val !== null ? val : '';
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
