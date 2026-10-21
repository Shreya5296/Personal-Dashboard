/**
 * ImportService: Implements safe spreadsheet import preview, execution, and reconciliation.
 */

function _resolveStuRepoImp() {
  if (typeof Students_getAll === 'function') return { Students_getAll: Students_getAll };
  if (typeof require !== 'undefined') return require('../students/StudentRepository.gs');
  return null;
}

function _resolveStuServImp() {
  if (typeof Students_create === 'function') return { Students_create: Students_create };
  if (typeof require !== 'undefined') return require('../students/StudentService.gs');
  return null;
}

function _resolveImpRepo() {
  if (typeof ImportBatches_insert === 'function') return { ImportBatches_insert: ImportBatches_insert, ImportBatches_update: ImportBatches_update, ImportRowResults_insert: ImportRowResults_insert };
  if (typeof require !== 'undefined') return require('./ImportRepository.gs');
  return null;
}

function _resolveImpVal() {
  if (typeof validateImportRow === 'function') return { validateImportRow: validateImportRow };
  if (typeof require !== 'undefined') return require('./ImportValidation.gs');
  return null;
}

function _resolveIdGenImp() {
  if (typeof generateImportBatchId === 'function') return { generateImportBatchId: generateImportBatchId, generateImportRowResultId: generateImportRowResultId, generateId: generateId };
  if (typeof require !== 'undefined') return require('../shared/IdGenerator.gs');
  return null;
}

function Imports_preview(spreadsheet, rows) {
  var stuRepo = _resolveStuRepoImp();
  var impVal = _resolveImpVal();
  var existing = (stuRepo && stuRepo.Students_getAll) ? stuRepo.Students_getAll(spreadsheet) : [];
  var validatedRows = [];
  var validCount = 0;
  var dupCount = 0;
  var errCount = 0;

  for (var i = 0; i < (rows || []).length; i++) {
    var raw = rows[i];
    var val = (impVal && impVal.validateImportRow) ? impVal.validateImportRow(raw, existing) : { isValid: true, isDuplicate: false, error: null };

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
  var idGen = _resolveIdGenImp();
  var impRepo = _resolveImpRepo();
  var stuServ = _resolveStuServImp();
  var batchId = (idGen && idGen.generateImportBatchId) ? idGen.generateImportBatchId() : ('imp_' + Date.now());
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
  if (impRepo && impRepo.ImportBatches_insert) {
    impRepo.ImportBatches_insert(spreadsheet, batchRecord);
  }

  var importedCount = 0;
  for (var i = 0; i < preview.rows.length; i++) {
    var r = preview.rows[i];
    if (r.validationError || r.isDuplicate) {
      if (impRepo && impRepo.ImportRowResults_insert) {
        var rowId = (idGen && idGen.generateImportRowResultId) ? idGen.generateImportRowResultId() : ('irr_' + i + '_' + Date.now());
        impRepo.ImportRowResults_insert(spreadsheet, {
          import_row_result_id: rowId,
          import_batch_id: batchId,
          source_row_reference: 'row_' + r.rowNumber,
          target_entity_type: '',
          target_record_id: '',
          row_status: r.isDuplicate ? 'SKIPPED_DUPLICATE' : 'FAILED_VALIDATION',
          source_fingerprint: '',
          message: r.validationError || 'Duplicate student candidate detected',
          processed_at: new Date().toISOString()
        });
      }
      continue;
    }

    var studentName = r.fullName.trim();

    var createRes = (stuServ && stuServ.Students_create) ? stuServ.Students_create(spreadsheet, {
      student_name: studentName,
      parent_name: studentName + ' Parent',
      parent_phone: r.phone || '+910000000000',
      parent_email: r.email,
      status: 'ACTIVE'
    }, actor) : { success: false };

    if (createRes && createRes.success) {
      importedCount++;
      if (impRepo && impRepo.ImportRowResults_insert) {
        var resId = (idGen && idGen.generateImportRowResultId) ? idGen.generateImportRowResultId() : ('irr_' + i + '_' + Date.now());
        impRepo.ImportRowResults_insert(spreadsheet, {
          import_row_result_id: resId,
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
  }

  if (impRepo && impRepo.ImportBatches_update) {
    impRepo.ImportBatches_update(spreadsheet, batchId, {
      import_status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      imported_rows: importedCount,
      notes: 'Import batch completed successfully'
    });
  }

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
