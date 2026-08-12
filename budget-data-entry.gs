/**
 * Cash Flow Tracker - budget-data-entry.gs
 *
 * Data save / Google Sheet logic only.
 *
 * Sheet columns (A:N):
 * Date | Description | Store Name | Cash Flow | Cash Flow Type |
 * From Source | To Source | Amount | Interest | Currency |
 * Cash Flow Details | ForWho | Status | Note
 */

const CONFIG = {
  SHEET_NAME: 'IncomeExpenseTracker',

  // Bound script: leave blank.
  // Standalone script: paste Spreadsheet ID.
  SPREADSHEET_ID: ''
};

const EXPECTED_HEADERS = [
  'Date',
  'Description',
  'Store Name',
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

/**
 * Optional browser/API health check.
 * Does not render the frontend.
 */
function doGet() {
  return jsonResponse_({
    result:'ok',
    message:'Cash Flow API is running.'
  });
}

/**
 * For external frontend such as Vercel/static hosting.
 */
function doPost(e) {
  try {
    if(!e || !e.postData || !e.postData.contents){
      throw new Error('No request body received.');
    }

    const data = JSON.parse(e.postData.contents);
    return jsonResponse_(saveEntry(data));

  } catch(err) {
    console.error(err && err.stack ? err.stack : err);

    return jsonResponse_({
      result:'error',
      message:err && err.message ? err.message : String(err)
    });
  }
}

/**
 * For Apps Script HtmlService / google.script.run.
 */
function saveEntry(data) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    data = data || {};

    const validated = validateEntry_(data);
    const ss = getSpreadsheet_();
    const sheet = getOrCreateSheet_(ss);
    const headerRow = ensureHeaders_(sheet);

    const row = [
      parseDate_(data.date),
      safeText_(data.description),
      '',

      validated.cashFlow,
      safeText_(data.cashFlowType),

      safeText_(data.fromSource),
      safeText_(data.toSource),

      validated.amount,
      '',

      safeText_(data.currency),

      validated.cashFlow === 'Transfer'
        ? '-'
        : safeText_(data.cashFlowDetails),

      safeText_(data.forWho),
      '',
      safeText_(data.note)
    ];

    const targetRow =
      Math.max(
        sheet.getLastRow() + 1,
        headerRow + 1
      );

    sheet
      .getRange(
        targetRow,
        1,
        1,
        EXPECTED_HEADERS.length
      )
      .setValues([row]);

    sheet
      .getRange(targetRow,1)
      .setNumberFormat('yyyy-mm-dd');

    sheet
      .getRange(targetRow,8)
      .setNumberFormat('0');

    return {
      result:'ok',
      message:'Saved successfully.',
      row:targetRow
    };

  } catch(err) {
    console.error(err && err.stack ? err.stack : err);

    return {
      result:'error',
      message:err && err.message
        ? err.message
        : String(err)
    };

  } finally {
    if(lock.hasLock()){
      lock.releaseLock();
    }
  }
}

function validateEntry_(data) {
  const allowedCashFlows = [
    'Income',
    'Expense',
    'Transfer'
  ];

  const cashFlow = clean_(data.cashFlow);

  if(allowedCashFlows.indexOf(cashFlow) === -1){
    throw new Error(
      'Cash Flow must be Income, Expense, or Transfer.'
    );
  }

  requireField_(data,'date','Date');
  requireField_(data,'amount','Amount');
  requireField_(data,'currency','Currency');
  requireField_(data,'cashFlowType','Cash Flow Type');

  validateCashFlowType_(
    cashFlow,
    data.cashFlowType
  );

  requireField_(data,'fromSource','From Source');
  requireField_(data,'toSource','To Source');

  if(cashFlow !== 'Transfer'){
    requireField_(
      data,
      'cashFlowDetails',
      'Cash Flow Details'
    );
  }

  const amount = parseNumber_(data.amount);

  if(amount <= 0){
    throw new Error(
      'Amount must be greater than 0.'
    );
  }

  return {
    cashFlow:cashFlow,
    amount:amount
  };
}

function validateCashFlowType_(cashFlow,cashFlowType) {
  const allowed = {
    Income:[
      'Fixed_Income',
      'Extra_Income',
      'Business_Income',
      'Loan_Income',
      'Lend_Income',
      'Exchange_Income'
    ],

    Expense:[
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

    Transfer:[
      'Bank → Bank',
      'Bank → Cash',
      'Bank → Credit',
      'Credit → Bank',
      'Credit → E-Wallet',
      'Cash → Bank'
    ]
  };

  const type = clean_(cashFlowType);

  if(
    !allowed[cashFlow] ||
    allowed[cashFlow].indexOf(type) === -1
  ){
    throw new Error(
      'Invalid ' + cashFlow + ' type.'
    );
  }
}

function getSpreadsheet_() {
  const id = clean_(CONFIG.SPREADSHEET_ID);

  if(id){
    return SpreadsheetApp.openById(id);
  }

  const active =
    SpreadsheetApp.getActiveSpreadsheet();

  if(active){
    return active;
  }

  throw new Error(
    'Google Sheet is not connected. ' +
    'Bind the script to the Sheet or set CONFIG.SPREADSHEET_ID.'
  );
}

function getOrCreateSheet_(ss) {
  let sheet =
    ss.getSheetByName(CONFIG.SHEET_NAME);

  if(!sheet){
    sheet =
      ss.insertSheet(CONFIG.SHEET_NAME);
  }

  return sheet;
}

function ensureHeaders_(sheet) {
  const width = EXPECTED_HEADERS.length;
  const lastRow = sheet.getLastRow();

  if(lastRow === 0){
    sheet
      .getRange(1,1,1,width)
      .setValues([EXPECTED_HEADERS]);

    styleHeader_(sheet,1,width);

    return 1;
  }

  const rowsToCheck =
    Math.min(2,lastRow);

  for(let row = 1; row <= rowsToCheck; row++){
    const headers =
      sheet
        .getRange(row,1,1,width)
        .getDisplayValues()[0]
        .map(function(value){
          return String(value).trim();
        });

    const matches =
      headers.every(function(value,index){
        return value === EXPECTED_HEADERS[index];
      });

    if(matches){
      return row;
    }
  }

  throw new Error(
    'Sheet headers do not match the Cash Flow layout. Expected: ' +
    EXPECTED_HEADERS.join(' | ')
  );
}

function styleHeader_(sheet,row,width) {
  sheet
    .getRange(row,1,1,width)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#1f5a85')
    .setHorizontalAlignment('center');

  sheet.setFrozenRows(row);
}

function setupSheet() {
  const ss = getSpreadsheet_();
  const sheet = getOrCreateSheet_(ss);
  const headerRow = ensureHeaders_(sheet);

  styleHeader_(
    sheet,
    headerRow,
    EXPECTED_HEADERS.length
  );

  return (
    'Sheet ready. Header row: ' +
    headerRow
  );
}

function requireField_(data,key,label) {
  if(!clean_(data[key])){
    throw new Error(
      label + ' is required.'
    );
  }
}

function parseDate_(value) {
  
  const text = clean_(value);

  const match =
    text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if(!match){
    throw new Error(
      'Date must be YYYY-MM-DD.'
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date =
    new Date(
      year,
      month - 1,
      day
    );

  if(
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ){
    throw new Error(
      'Date is not valid.'
    );
  }

  return date;
}

function parseNumber_(value) {
  const text =
    clean_(value)
      .replace(/,/g,'');

  if(!text){
    throw new Error(
      'Amount is required.'
    );
  }

  const number = Number(text);

  if(!Number.isFinite(number)){
    throw new Error(
      'Amount is invalid.'
    );
  }

  return number;
}

function clean_(value) {
  return value === null ||
         value === undefined
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
    .createTextOutput(
      JSON.stringify(object)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}
