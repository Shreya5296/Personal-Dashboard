/**
 * Money utilities for INR financial values.
 * All monetary operations use 2-decimal numeric precision.
 */

function roundCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Amount must be a valid number');
  }
  return Math.round(amount * 100) / 100;
}

function isValidMoneyAmount(amount) {
  if (typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
    return false;
  }
  return amount >= 0;
}

function parseMoneyAmount(val) {
  if (typeof val === 'number') {
    return roundCurrency(val);
  }
  if (typeof val === 'string') {
    var cleaned = val.replace(/,/g, '').trim();
    var num = parseFloat(cleaned);
    if (!isNaN(num)) {
      return roundCurrency(num);
    }
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    roundCurrency: roundCurrency,
    isValidMoneyAmount: isValidMoneyAmount,
    parseMoneyAmount: parseMoneyAmount
  };
}
