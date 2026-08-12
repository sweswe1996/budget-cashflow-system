/**
 * Cash Flow Tracker backend
 * Target sheet: Income-Expense-Tracker
 *
 * Sheet columns (A:M):
 * Date | Description | Cash Flow | Cash Flow Type | From Source |
 * To Source | Amount | Interest | Currency | Cash Flow Details |
 * ForWho | Status | Note
 */

const CONFIG = {
  SHEET_NAME: 'Income-Expense-Tracker',

  // Bound script: leave blank.
  // Standalone script: paste Spreadsheet ID here.
  SPREADSHEET_ID: ''
};

const EXPECTED_HEADERS = [
  'Date',
  'Description',
  'Cash Flow',
  'Cash Flow Type',
  'From Source',
  'To Source',
  'Amount',
  'Interest',
  'Currency',
  'Cash Flow Details',
  'ForWho',
  'Status',
  'Note'
];

function doGet() {
  return jsonResponse_({
    result: 'ok',
    message: 'Cash Flow API is running.'
  });
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('No request body received.');
    }

    const data = JSON.parse(e.postData.contents);
    return jsonResponse_(saveEntry(data));

  } catch (err) {
    console.error(err && err.stack ? err.stack : err);

    return jsonResponse_({
      result: 'error',
      message: err && err.message ? err.message : String(err)
    });
  }
}

function saveEntry(data) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    data = data || {};

    const validated = validateEntry_(data);
    const ss = getSpreadsheet_();
    const sheet = getTargetSheet_(ss);
    const headerRow = ensureHeaders_(sheet);

    const targetRow = Math.max(sheet.getLastRow() + 1, headerRow + 1);

    // Save exact date text to avoid timezone shift.
    const dateCell = sheet.getRange(targetRow, 1);
    dateCell.setNumberFormat('@');
    dateCell.setValue(validated.dateText);

    // B:M = 12 columns
    const restOfRow = [[
      safeText_(data.description),                  // B Description
      validated.cashFlow,                           // C Cash Flow
      safeText_(data.cashFlowType),                 // D Cash Flow Type
      safeText_(data.fromSource),                   // E From Source
      safeText_(data.toSource),                     // F To Source
      validated.amount,                             // G Amount
      '',                                           // H Interest
      safeText_(data.currency),                     // I Currency
      validated.cashFlow === 'Transfer'
        ? '-'
        : safeText_(data.cashFlowDetails),          // J Cash Flow Details
      safeText_(data.forWho),                       // K ForWho
      '',                                           // L Status
      safeText_(data.note)                          // M Note
    ]];

    sheet.getRange(targetRow, 2, 1, 12).setValues(restOfRow);

    // Amount column = G
    sheet.getRange(targetRow, 7).setNumberFormat('0');

    return {
      result: 'ok',
      message: 'Saved successfully.',
      row: targetRow,
      sheet: CONFIG.SHEET_NAME,
      date: validated.dateText
    };

  } catch (err) {
    console.error(err && err.stack ? err.stack : err);

    return {
      result: 'error',
      message: err && err.message ? err.message : String(err)
    };

  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}

function validateEntry_(data) {
  const allowedCashFlows = ['Income', 'Expense', 'Transfer'];
  const cashFlow = clean_(data.cashFlow);

  if (allowedCashFlows.indexOf(cashFlow) === -1) {
    throw new Error('Cash Flow must be Income, Expense, or Transfer.');
  }

  requireField_(data, 'date', 'Date');
  requireField_(data, 'amount', 'Amount');
  requireField_(data, 'currency', 'Currency');
  requireField_(data, 'cashFlowType', 'Cash Flow Type');
  requireField_(data, 'fromSource', 'From Source');
  requireField_(data, 'toSource', 'To Source');

  const dateText = validateDateText_(data.date);

  validateCashFlowType_(cashFlow, data.cashFlowType);

  if (cashFlow !== 'Transfer') {
    requireField_(data, 'cashFlowDetails', 'Cash Flow Details');
  }

  const amount = parseNumber_(data.amount);

  if (amount <= 0) {
    throw new Error('Amount must be greater than 0.');
  }

  return {
    cashFlow: cashFlow,
    amount: amount,
    dateText: dateText
  };
}

function validateCashFlowType_(cashFlow, cashFlowType) {
  const allowed = {
    Income: [
      'Fixed_Income',
      'Extra_Income',
      'Business_Income',
      'Loan_Income',
      'Lend_Income',
      'Exchange_Income'
    ],

    Expense: [
      'Fixed_Expenses',
      'Bills_Utilities',
      'Taxes_Insurance',
      'Food_Expenses',
      'Fashion_Expenses',
      'Living_Expenses',
      'Social_Expenses',
      'Education_Expenses',
      'Healthcare_Expenses',
      'Transportation_Expenses',
      'Business_Expenses',
      'Work_Expenses',
      'Loan_Expenses',
      'Lend_Expenses',
      'Exchange_Expenses',
      'Digital_Expenses',
      'PersonalCare_Expenses',
      'Travel_Leisure',
      'Entertainment',
      'Family_Support',
      'Savings_Investments',
      'Other_Expenses'
    ],

    Transfer: [
      'Bank → Bank',
      'Bank → Cash',
      'Bank → Credit',
      'Credit → Bank',
      'Credit → E-Wallet',
      'Cash → Bank'
    ]
  };

  const type = clean_(cashFlowType);

  if (!allowed[cashFlow] || allowed[cashFlow].indexOf(type) === -1) {
    throw new Error('Invalid ' + cashFlow + ' type.');
  }
}

function getSpreadsheet_() {
  const id = clean_(CONFIG.SPREADSHEET_ID);

  if (id) {
    return SpreadsheetApp.openById(id);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();

  if (active) {
    return active;
  }

  throw new Error(
    'Google Sheet is not connected. Bind the script to the Sheet or set CONFIG.SPREADSHEET_ID.'
  );
}

function getTargetSheet_(ss) {
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    throw new Error(
      'Sheet "' + CONFIG.SHEET_NAME + '" was not found. Please check the sheet tab name exactly.'
    );
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  const width = EXPECTED_HEADERS.length;
  const lastRow = sheet.getLastRow();

  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, width).setValues([EXPECTED_HEADERS]);
    styleHeader_(sheet, 1, width);
    return 1;
  }

  const rowsToCheck = Math.min(2, lastRow);

  for (let row = 1; row <= rowsToCheck; row++) {
    const headers = sheet
      .getRange(row, 1, 1, width)
      .getDisplayValues()[0]
      .map(function(value) {
        return String(value).trim();
      });

    const matches = headers.every(function(value, index) {
      return value === EXPECTED_HEADERS[index];
    });

    if (matches) {
      return row;
    }
  }

  throw new Error(
    'Sheet headers do not match. Expected: ' +
    EXPECTED_HEADERS.join(' | ')
  );
}

function styleHeader_(sheet, row, width) {
  sheet
    .getRange(row, 1, 1, width)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1f5a85')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(row);
}

function setupSheet() {
  const ss = getSpreadsheet_();
  const sheet = getTargetSheet_(ss);
  const headerRow = ensureHeaders_(sheet);

  styleHeader_(sheet, headerRow, EXPECTED_HEADERS.length);

  return 'Sheet ready: ' + CONFIG.SHEET_NAME + ', header row: ' + headerRow;
}

function validateDateText_(value) {
  const text = clean_(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('Date must be YYYY-MM-DD.');
  }

  const parts = text.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  const test = new Date(Date.UTC(year, month - 1, day));

  if (
    test.getUTCFullYear() !== year ||
    test.getUTCMonth() !== month - 1 ||
    test.getUTCDate() !== day
  ) {
    throw new Error('Date is not valid.');
  }

  return text;
}

function requireField_(data, key, label) {
  if (!clean_(data[key])) {
    throw new Error(label + ' is required.');
  }
}

function parseNumber_(value) {
  const text = clean_(value).replace(/,/g, '');

  if (!text) {
    throw new Error('Amount is required.');
  }

  const number = Number(text);

  if (!Number.isFinite(number)) {
    throw new Error('Amount is invalid.');
  }

  return number;
}

function clean_(value) {
  return value === null || value === undefined
    ? ''
    : String(value).trim();
}

function safeText_(value) {
  const text = clean_(value);

  return /^[=+\-@]/.test(text)
    ? "'" + text
    : text;
}

function jsonResponse_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}
