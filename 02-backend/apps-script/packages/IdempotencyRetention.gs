// IdempotencyRetention: Administrative maintenance for pruning completed idempotency records.
// Safe retention cleanup for Google Apps Script ScriptProperties (500 KB limit).

var _retLock = typeof withLock === 'function' ? { withLock: withLock } : (typeof require !== 'undefined' ? require('../sheets/LockManager.gs') : null);

function _getRetentionDurableStore() {
  if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
    try { var sp = PropertiesService.getScriptProperties(); if (sp) return sp; } catch (e) {}
  }
  if (typeof globalThis !== 'undefined') {
    if (globalThis.__mockPropertiesStore) {
      return {
        getProperty: function(k) { return globalThis.__mockPropertiesStore[k] || null; },
        setProperty: function(k, v) { globalThis.__mockPropertiesStore[k] = String(v); },
        deleteProperty: function(k) { delete globalThis.__mockPropertiesStore[k]; },
        getProperties: function() { return Object.assign({}, globalThis.__mockPropertiesStore); }
      };
    }
    if (globalThis.__renewalDurableStore && typeof globalThis.__renewalDurableStore.getProperties === 'function') {
      return globalThis.__renewalDurableStore;
    }
  }
  return null;
}

function _executePruneCore(store, days, isDry, currentMs, cutoffMs, compactMode) {
  var allProps = store.getProperties();
  var scanned = 0, matching = 0, pruned = 0, preserved = 0, activeIntentsPreserved = 0, prunedKeys = [];

  for (var key in allProps) {
    if (!allProps.hasOwnProperty(key)) continue;
    scanned++;

    var isRenewalKey = key.indexOf('renewal_idemp_') === 0;
    var isPaymentKey = key.indexOf('payment_idemp_') === 0;
    var isVoidKey = key.indexOf('payment_void_') === 0;
    if (!isRenewalKey && !isPaymentKey && !isVoidKey) continue;

    matching++;
    var rawVal = allProps[key], parsed = null;
    try {
      parsed = JSON.parse(rawVal);
    } catch (err) {
      preserved++;
      continue;
    }
    if (!parsed || typeof parsed !== 'object') {
      preserved++;
      continue;
    }

    // Safety rule 1: Never delete or compact active/recoverable STARTED records
    var isStarted = parsed.status === 'STARTED' || parsed.outcome === 'STARTED' || parsed.inProgress === true;
    if (isStarted) {
      activeIntentsPreserved++;
      preserved++;
      continue;
    }

    // Safety rule 2: Never delete or re-compact already existing tombstones
    if (parsed.tombstone) {
      preserved++;
      continue;
    }

    var tsStr = parsed.timestamp || parsed.recorded_at || parsed.voided_at || parsed.completed_at || parsed.created_at;
    if (!tsStr) {
      preserved++;
      continue;
    }
    var recordMs = Date.parse(tsStr);
    if (isNaN(recordMs)) {
      preserved++;
      continue;
    }

    if (recordMs < cutoffMs) {
      if (!isDry) {
        if (compactMode) {
          var rData = parsed.resultData || {};
          var tombstone = {
            outcome: 'SUCCESS', status: parsed.status === 'VOID' ? 'VOID' : 'COMPLETED', tombstone: true,
            student_id: parsed.student_id || rData.student_id || '', amount: parsed.amount, currency: parsed.currency || '', payment_date: parsed.payment_date || '',
            new_classes: parsed.new_classes !== undefined ? parsed.new_classes : rData.new_classes_purchased,
            package_price: parsed.package_price !== undefined ? parsed.package_price : (rData.package ? rData.package.package_price : undefined),
            schedule_key: parsed.schedule_key, start_date: parsed.start_date,
            payment_amount: parsed.payment_amount !== undefined ? parsed.payment_amount : (parsed.payment ? parsed.payment.amount : (rData.payment ? rData.payment.amount : undefined)),
            record_payment: parsed.record_payment,
            resultData: { student_id: parsed.student_id || rData.student_id || '', cumulative_purchased: parsed.cumulative_purchased || rData.cumulative_purchased },
            completed_at: tsStr, pruned_at: new Date(currentMs).toISOString()
          };
          store.setProperty(key, JSON.stringify(tombstone));
        } else if (typeof store.deleteProperty === 'function') {
          store.deleteProperty(key);
        }
      }
      pruned++;
      prunedKeys.push(key);
    } else {
      preserved++;
    }
  }

  return {
    success: true,
    dryRun: isDry,
    compactMode: !!compactMode,
    retentionDays: days,
    cutoffDate: new Date(cutoffMs).toISOString(),
    scannedCount: scanned,
    matchingCount: matching,
    prunedCount: pruned,
    preservedCount: preserved,
    activeIntentsPreservedCount: activeIntentsPreserved,
    prunedKeys: prunedKeys
  };
}

function pruneCompletedIdempotencyRecords(durableStore, retentionDays, dryRun, nowMs, options) {
  var store = durableStore || _getRetentionDurableStore();
  if (!store || typeof store.getProperties !== 'function') {
    return { success: false, code: 'STORE_UNAVAILABLE', message: 'Durable property store unavailable' };
  }

  // Dry-run by default unless dryRun is explicitly false
  var isDry = (dryRun === false) ? false : true;
  var days = (typeof retentionDays === 'number' && retentionDays >= 0) ? retentionDays : 90;
  var currentMs = (typeof nowMs === 'number' && nowMs > 0) ? nowMs : Date.now();
  var cutoffMs = currentMs - (days * 24 * 60 * 60 * 1000);
  var compactMode = options && options.compact === true;

  var lockFn = (_retLock && _retLock.withLock) ? _retLock.withLock : function(t, fn) { return { success: true, result: fn() }; };
  var lockRes = lockFn(10000, function() {
    return _executePruneCore(store, days, isDry, currentMs, cutoffMs, compactMode);
  });

  if (!lockRes.success) {
    return { success: false, code: lockRes.code || 'CONFLICT', message: lockRes.message || 'Lock unavailable' };
  }
  return lockRes.result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pruneCompletedIdempotencyRecords: pruneCompletedIdempotencyRecords,
    _getRetentionDurableStore: _getRetentionDurableStore
  };
}
