/**
 * ImportService: Implements safe spreadsheet import preview, execution, and reconciliation.
 */

var _stuRepoImp = typeof Students_getAll === 'function' ? { Students_getAll: Students_getAll } : (typeof require !== 'undefined' ? require('../students/StudentRepository.gs') : null);
var _stuServImp = typeof Students_create === 'function' ? { Students_create: Students_create } : (typeof require !== 'undefined' ? require('../students/StudentService.gs') : null);
var _impRepo = typeof ImportBatches_insert === 'function' ? { ImportBatches_insert: ImportBatches_insert, ImportBatches_update: ImportBatches_update, ImportRowResults_insert: ImportRowResults_insert } : (typeof require !== 'undefined' ? require('./ImportRepository.gs') : null);
var _impVal = typeof validateImportRow === 'function' ? { validateImportRow: validateImportRow } : (typeof require !== 'undefined' ? require('./ImportValidation.gs') : null);
var _idGenImp = typeof generateImportBatchId === 'function' ? { generateImportBatchId: generateImportBatchId, generateImportRowResultId: generateImportRowResultId, generateId: generateId } : (typeof require !== 'undefined' ? require('../shared/IdGenerator.gs') : null);

function Imports_preview(spreadsheet, rows) {
  var existing = _stuRepoImp.Students_getAll(spreadsheet);
  var validatedRows = [];
  var validCount = 0;
  var dupCount = 0;
  var errCount = 0;

  for (var i = 0; i < (rows || []).length; i++) {
    var raw = rows[i];
    var val = _impVal.validateImportRow(raw, existing);

    if (!val.isValid) {
      errCount++;
    } else if (val.isDuplicate) {
      dupCount++;
    } else {
      validCount++;
    }

    validatedRows.push({
      rowNumber: raw.rowNumber || (i + 1),
      fullName: raw.fullName || raw.full_name || '',
      email: raw.email || '',
      phone: raw.phone || '',
      courseName: raw.courseName || '',
      isDuplicate: val.isDuplicate,
      validationError: val.error
    });
  }

  return {
    totalRows: rows ? rows.length : 0,
    validRows: validCount,
    duplicateRows: dupCount,
    errorRows: errCount,
    rows: validatedRows
  };
}

function Imports_execute(spreadsheet, rows, actor) {
  var batchId = _idGenImp.generateImportBatchId();
  var now = new Date().toISOString();
  var preview = Imports_preview(spreadsheet, rows);

  var batchRecord = {
    import_batch_id: batchId,
    source_name: 'Direct Input Import',
    source_spreadsheet_id: '',
    source_tab_name: 'RawInput',
    started_at: now,
    completed_at: '',
    import_status: 'IN_PROGRESS',
    total_rows: preview.totalRows,
    imported_rows: 0,
    skipped_rows: preview.duplicateRows,
    failed_rows: preview.errorRows,
    duplicate_rows: preview.duplicateRows,
    initiated_by: actor.email || actor.actorId || 'admin',
    notes: 'Import batch started'
  };
  _impRepo.ImportBatches_insert(spreadsheet, batchRecord);

  var importedCount = 0;
  for (var i = 0; i < preview.rows.length; i++) {
    var r = preview.rows[i];
    if (r.validationError || r.isDuplicate) {
      _impRepo.ImportRowResults_insert(spreadsheet, {
        import_row_result_id: _idGenImp.generateImportRowResultId(),
        import_batch_id: batchId,
        source_row_reference: 'row_' + r.rowNumber,
        target_entity_type: '',
        target_record_id: '',
        row_status: r.isDuplicate ? 'SKIPPED_DUPLICATE' : 'FAILED_VALIDATION',
        source_fingerprint: '',
        message: r.validationError || 'Duplicate student candidate detected',
        processed_at: new Date().toISOString()
      });
      continue;
    }

    var parts = r.fullName.trim().split(' ');
    var firstName = parts[0];
    var lastName = parts.slice(1).join(' ');

    var createRes = _stuServImp.Students_create(spreadsheet, {
      first_name: firstName,
      last_name: lastName,
      parent_guardian_name: firstName + ' Parent',
      primary_phone: r.phone || '+910000000000',
      parent_email: r.email,
      source_reference: 'import:' + batchId
    }, actor);

    if (createRes.success) {
      importedCount++;
      _impRepo.ImportRowResults_insert(spreadsheet, {
        import_row_result_id: _idGenImp.generateImportRowResultId(),
        import_batch_id: batchId,
        source_row_reference: 'row_' + r.rowNumber,
        target_entity_type: 'STUDENT',
        target_record_id: createRes.data.student_id,
        row_status: 'IMPORTED',
        source_fingerprint: '',
        message: 'Imported successfully',
        processed_at: new Date().toISOString()
      });
    }
  }

  _impRepo.ImportBatches_update(spreadsheet, batchId, {
    import_status: 'COMPLETED',
    completed_at: new Date().toISOString(),
    imported_rows: importedCount,
    notes: 'Import batch completed successfully'
  });

  return {
    batchId: batchId,
    totalRows: preview.totalRows,
    importedCount: importedCount,
    skippedCount: preview.duplicateRows,
    errorCount: preview.errorRows
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Imports_preview: Imports_preview,
    Imports_execute: Imports_execute
  };
}
