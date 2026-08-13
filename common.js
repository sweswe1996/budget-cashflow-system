/* ============================================================
   Cash Flow Tracker - common.js
   Front-end functions only.
   UI design       -> layout.html
   Form structure  -> index.html
   Data save       -> budget-data-entry.gs
   ============================================================ */

/*
  For Vercel/static hosting:
  Paste your deployed Apps Script /exec URL here.

  If this page is served inside Google Apps Script HtmlService and
  google.script.run exists, the script will automatically use it.
*/

const APPS_SCRIPT_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxtcsnwkFvY2SQPg-UkKlAl347_QUH1uzuE2WKu3WL4jt8_YK0_3NSewfEusVRCdV_K/exec';

const CURRENCIES = ['JPY','MMK','USD'];

const STATUS_LIST = ['Need','Want'];

const FOR_WHO = [
  '-','CS','MG','US','Grandparents','Mother',
  'Younger_Brother_1','Younger_Brother_2',
  'Nephew','Niece','Mg_Relative','Cs_Relative','Friend','Coworker'
];

const ALL_SOURCES = {
  JPY:[
    '-',
    // MG first
    'Bk-MUFG_MG','Bk-PAYPAY_MG','Bk-YUCHO_MG',
    'Cash_MG',
    'Crd-JCB_MG','Crd-MUFG_MG','Crd-PAIDY_MG','Crd-PAYPAY_MG',
    'E-Walllet_MG','Suika_MG',

    // CS second
    'Bk-MIZUHO_CS','Bk-MUFG_CS','Bk-PAYPAY_CS','Bk-SMBC_CS','Bk-YUCHO_CS',
    'Cash_CS',
    'Crd-EOPS_CS','Crd-JCB_CS','Crd-MUFG_CS','Crd-PAYPAY_CS',
    'Crd-RAKUTEN_CS','Crd-SMBC_CS',
    'E-Walllet_CS','Suika_CS'
  ],

  MMK:[
    '-',
    // MG first
    'Bk-AYA_MG','Bk-KBZ_MG','KBZPay_MG','WavePay_MG',

    // CS second
    'Bk-AYA_CS','Bk-KBZ_CS','KBZPay_CS','WavePay_CS',

    // Shared
    'CASH_MMK'
  ],

  USD:[
    '-',
    'PayPal',
    'Other'
  ]
};

const TRANSFER_SOURCES = ALL_SOURCES;

const TYPE_DETAILS = {
  Income:{
    Fixed_Income:['Salary1','Salary2','Salary3'],
    Extra_Income:['National_Support','University_Support','Bonus','Gift'],
    Business_Income:['Laptop_Sell','Software_Subscription_Sell','Tiktok'],
    Loan_Income:['Credit Card','Bank','Family','Friend','Other'],
    Lend_Income:['Family Paid Back','Friend Paid Back','Business Paid Back','Other Paid Back'],
    Exchange_Income:['JPY → MMK','MMK → JPY','USD → MMK','MMK → USD']
  },

  Expense:{
    Fixed_Expenses:['Rent Housing Fee','House Maintenance Fee','Water Purifier Fee'],
    Bills_Utilities:['Electricity Bill','Gas Bill','Water Bill','Mobile Phone Bill','Internet Bill'],
    Taxes_Insurance:['Health Insurance','Employment Insurance','Pension Contribution','Resident Tax','Income Tax','Bicycle Insurance'],
    Food_Expenses:['Cooking Food','Dining Out','Snacks & Drinks'],
    Fashion_Expenses:['Home Cloth','Outfit Cloth','Underwear Cloth','Sport Cloth','Shoes','Bags','Accessories'],
    Living_Expenses:['Kitchen Items','Bathroom Items','Cleaning Items','Laundry Items','Bedroom Items','Furniture','Home Appliances','Home Tools','Home Decor','Storage Items','Daily Supplies'],
    Social_Expenses:['Birthday','Wedding','Funeral','Donation'],
    Education_Expenses:['Tuition Fee','Online Course','Books','Exam Fee','Printing','School Trip','School Supplies','Research'],
    Healthcare_Expenses:['Hospital','Clinic','Medicine','Dental','Eye Care','Health Check','Vaccination'],
    Transportation_Expenses:['Train','Bus','Taxi','Fuel','Parking Fee','Bicycle'],
    Business_Expenses:['Human Resources','Advertising & Marketing','Transportation'],
    Work_Expenses:['Transportation','Food','Snacks & Drinks','Work Clothes','Business Trip','Training'],
    Loan_Expenses:['-','Credit Card','Bank','Personal','Cash'],
    Lend_Expenses:['-','Family','Friend','Business','Personal'],
    Exchange_Expenses:['-','Family','Loan','Savings','Personal Use','Business'],
    Digital_Expenses:['AI Tools','Cloud Storage','Domain & Hosting','Online Services','App Services'],
    PersonalCare_Expenses:['Haircut','Hair Care','Nail Care','Skin Care','Cosmetics','Body'],
    Travel_Leisure:['Hotel','Travel','Tickets','Shopping','Activities','Gifts','Photo Print'],
    Entertainment:['Movies','Games','Music','Streaming','Events','Hobbies','Fun Activities'],
    Family_Support:['Living Support','Medical Support','Education Support','Gifts','Emergency'],
    Savings_Investments:['Saving','Emergency Fund','NISA','Stocks','Gold','House & Land','Business Fund'],
    Other_Expenses:['Document','Print']
  },

  Transfer:{
    'Bank → Bank':[],
    'Bank → Cash':[],
    'Bank → Credit':[],
    'Credit → Bank':[],
    'Credit → E-Wallet':[],
    'Cash → Bank':[]
  }
};

const TRANSFER_ICON = '🔄';

const FLOW_META = {
  Income:{
    icon:'💵',
    title:'Income Data',
    subtitle:'Enter income cash-flow details.',
    save:'Save Income'
  },
  Expense:{
    icon:'🛒',
    title:'Expense Data',
    subtitle:'Enter expense cash-flow details.',
    save:'Save Expense'
  },
  Transfer:{
    icon:TRANSFER_ICON,
    title:'Transfer Data',
    subtitle:'Enter transfer details.',
    save:'Save Transfer'
  }
};

let currentFlow = 'Income';

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,function(c){
    return {
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c];
  });
}

function optionList(items,placeholder){
  return '<option value="">' + escapeHtml(placeholder) + '</option>' +
    items.map(function(v){
      return '<option value="' + escapeHtml(v) + '">' +
        escapeHtml(String(v).split('_').join(' ')) +
      '</option>';
    }).join('');
}

function sourceGroupName(value){
  const v = String(value || '');

  if(v.indexOf('Bk-') === 0) return '🏦 Bank';
  if(v.indexOf('Crd-') === 0) return '💳 Credit';
  if(/^cash/i.test(v)) return '💵 Cash';

  if(
    v.indexOf('E-Walllet') === 0 ||
    v.indexOf('KBZPay') === 0 ||
    v.indexOf('WavePay') === 0 ||
    v === 'PayPal'
  ){
    return '📱 E-Wallet';
  }

  if(v.indexOf('Suika') === 0) return '🚆 Suica';

  return '• Other';
}

function groupedSourceOptions(items,placeholder){
  const order = [
    '🏦 Bank',
    '💳 Credit',
    '💵 Cash',
    '📱 E-Wallet',
    '🚆 Suica',
    '• Other'
  ];

  const groups = {};
  order.forEach(function(group){
    groups[group] = [];
  });

  items.forEach(function(v){
    if(v === '-') return;

    const group = sourceGroupName(v);

    if(!groups[group]){
      groups[group] = [];
    }

    groups[group].push(v);
  });

  let html = '<option value="">' + escapeHtml(placeholder) + '</option>';
  html += '<option value="-">-</option>';

  order.forEach(function(group){
    if(!groups[group] || !groups[group].length){
      return;
    }

    html += '<optgroup label="' + escapeHtml(group) + '">';

    html += groups[group].map(function(v){
      return '<option value="' + escapeHtml(v) + '">' +
        escapeHtml(v) +
      '</option>';
    }).join('');

    html += '</optgroup>';
  });

  return html;
}

function todayISO(){
  const d = new Date();

  function pad(n){
    return String(n).padStart(2,'0');
  }

  return d.getFullYear() + '-' +
    pad(d.getMonth()+1) + '-' +
    pad(d.getDate());
}

function switchFlow(flow){
  currentFlow = flow;

  document.querySelectorAll('.tab').forEach(function(button){
    button.classList.toggle('active',button.dataset.flow === flow);
  });

  const meta = FLOW_META[flow];

  document.getElementById('card').className = 'card theme-' + flow;
  document.getElementById('icon').innerHTML = meta.icon;
  document.getElementById('title').textContent = meta.title;
  document.getElementById('subtitle').textContent = meta.subtitle;
  document.getElementById('saveBtn').textContent = meta.save;

  renderFields();
}

function renderFields(){
  const wrapper = document.getElementById('fields');

  const detailLabel =
    currentFlow === 'Income'
      ? 'Income Detail'
      : currentFlow === 'Expense'
        ? 'Expense Detail'
        : '';

  const typeLabel =
    currentFlow === 'Income'
      ? 'Income Type'
      : currentFlow === 'Expense'
        ? 'Expense Type'
        : 'Transfer Type';

  const detailField =
    currentFlow === 'Transfer'
      ? ''
      : `
        <div class="field">
          <label class="req" for="cashFlowDetails">${detailLabel}</label>
          <select id="cashFlowDetails" required></select>
        </div>`;

  const noteField = `
    <div class="field note-box">
      <label for="noteToggle">Note</label>
      <button id="noteToggle"
              class="note-toggle"
              type="button"
              aria-expanded="false"
              aria-controls="noteEditor">
        <span class="note-toggle-text">Add note</span>
        <span id="noteSign" class="note-sign">+</span>
      </button>

      <div id="noteEditor" class="note-editor">
        <textarea id="note" placeholder="Optional note"></textarea>
      </div>
    </div>`;

  const forWhoField = `
    <div class="field">
      <label for="forWho">ForWho</label>
      <select id="forWho"></select>
    </div>`;

  const statusField = `
  <div class="field">
    <label class="req" for="status">Status</label>
    <select id="status" required></select>
  </div>`;

  let bottomFields = '';
  if(currentFlow === 'Transfer'){
    bottomFields =
      '<div class="transfer-pair">' +
        forWhoField +
        noteField +
      '</div>';

  }else if(currentFlow === 'Expense'){
    bottomFields =
      forWhoField +
      detailField +
      '<div class="status-note-pair">' +
        statusField +
        noteField +
      '</div>';

  }else{
    bottomFields =
      forWhoField +
      detailField +
      noteField;
  }

  wrapper.innerHTML = `
    <div class="field">
      <label class="req" for="amount">Amount</label>

      <div class="amount-wrap">
        <input id="amount"
               inputmode="numeric"
               pattern="[0-9]*"
               autocomplete="off"
               placeholder="Enter amount"
               required>

        <select id="currency" required></select>
      </div>
    </div>

    <div class="field">
      <label class="req" for="date">Date</label>
      <input id="date" type="date" required>
    </div>

    <div class="field">
      <label class="req" for="cashFlowType">${typeLabel}</label>
      <select id="cashFlowType" required></select>
    </div>

    <div class="field">
      <label for="description">Description</label>
      <input id="description"
             type="text"
             placeholder="Optional description">
    </div>

    <div class="field">
      <label class="req" for="fromSource">From Source</label>
      <select id="fromSource" required></select>
    </div>

    <div class="field">
      <label class="req" for="toSource">To Source</label>
      <select id="toSource" required></select>
    </div>

    ${bottomFields}
  `;

  const amount = document.getElementById('amount');

  amount.addEventListener('input',function(){
    amount.value = amount.value.replace(/\D/g,'');
  });

  const noteToggle = document.getElementById('noteToggle');
  const noteEditor = document.getElementById('noteEditor');
  const noteSign = document.getElementById('noteSign');

  noteToggle.addEventListener('click',function(){
    const isOpen = noteEditor.classList.toggle('open');

    noteSign.textContent = isOpen ? '−' : '+';
    noteToggle.setAttribute('aria-expanded',String(isOpen));

    if(isOpen){
      document.getElementById('note').focus();
    }
  });

  document.getElementById('date').value = todayISO();

  const currency = document.getElementById('currency');
  currency.innerHTML = optionList(CURRENCIES,'Currency');
  currency.value = 'JPY';
  currency.addEventListener('change',hydrateSources);

  document.getElementById('forWho').innerHTML =
    optionList(FOR_WHO,'Select For Who');

  const status = document.getElementById('status');
  if(status){
    status.innerHTML = optionList(STATUS_LIST,'Select Status');
  }

  const type = document.getElementById('cashFlowType');

  type.innerHTML = optionList(
    Object.keys(TYPE_DETAILS[currentFlow]),
    'Select ' + typeLabel.toLowerCase()
  );

  if(currentFlow !== 'Transfer'){
    type.addEventListener('change',hydrateDetails);
  }

  hydrateSources();
  hydrateDetails();
}

function hydrateSources(){
  const currency = document.getElementById('currency').value;

  const sourceMap =
    currentFlow === 'Transfer'
      ? TRANSFER_SOURCES
      : ALL_SOURCES;

  const items = sourceMap[currency] || [];

  document.getElementById('fromSource').innerHTML =
    groupedSourceOptions(items,'Select From Source');

  document.getElementById('toSource').innerHTML =
    groupedSourceOptions(items,'Select To Source');
}

function hydrateDetails(){
  const detail = document.getElementById('cashFlowDetails');

  if(!detail){
    return;
  }

  const type = document.getElementById('cashFlowType').value;

  const items =
    TYPE_DETAILS[currentFlow] &&
    TYPE_DETAILS[currentFlow][type]
      ? TYPE_DETAILS[currentFlow][type]
      : [];

  detail.innerHTML =
    optionList(
      items,
      type ? 'Select detail' : 'Select type first'
    );
}

function collectData(){
  function getValue(id){
    const element = document.getElementById(id);
    return element ? element.value : '';
  }

  return {
    cashFlow:currentFlow,
    amount:getValue('amount'),
    currency:getValue('currency'),
    date:getValue('date'),
    cashFlowType:getValue('cashFlowType'),
    description:getValue('description'),
    fromSource:getValue('fromSource'),
    toSource:getValue('toSource'),
    forWho:getValue('forWho'),
    cashFlowDetails:getValue('cashFlowDetails'),
    status:getValue('status'),
    note:getValue('note')
  };
}

function clearForm(){
  renderFields();
  showToast('Form cleared');
}

function submitForm(event){
  event.preventDefault();

  if(!event.currentTarget.reportValidity()){
    return;
  }

  const button = document.getElementById('saveBtn');
  const normalText = FLOW_META[currentFlow].save;
  const data = collectData();

  button.disabled = true;
  button.textContent = 'Saving...';

  /* Apps Script HtmlService mode */
  if(
    window.google &&
    google.script &&
    google.script.run
  ){
    google.script.run
      .withSuccessHandler(function(result){
        finishSave(result,button,normalText);
      })
      .withFailureHandler(function(error){
        button.disabled = false;
        button.textContent = normalText;

        showToast(
          error && error.message
            ? error.message
            : 'Could not connect to Google Sheets'
        );
      })
      .saveEntry(data);

    return;
  }

  /* Vercel / static web mode */
  if(!APPS_SCRIPT_WEB_APP_URL){
    button.disabled = false;
    button.textContent = normalText;
    showToast('Set APPS_SCRIPT_WEB_APP_URL in common.js');
    return;
  }

  fetch(APPS_SCRIPT_WEB_APP_URL,{
    method:'POST',
    headers:{
      'Content-Type':'text/plain;charset=utf-8'
    },
    body:JSON.stringify(data),
    redirect:'follow'
  })
  .then(function(response){
    return response.json();
  })
  .then(function(result){
    finishSave(result,button,normalText);
  })
  .catch(function(error){
    console.error(error);
    button.disabled = false;
    button.textContent = normalText;
    showToast('Could not connect to Google Sheets');
  });
}

function finishSave(result,button,normalText){
  button.disabled = false;
  button.textContent = normalText;

  if(result && result.result === 'ok'){
    showToast(result.message || 'Saved successfully');
    renderFields();
  }else{
    showToast(
      result && result.message
        ? result.message
        : 'Could not save'
    );
  }
}

function showToast(message){
  const toast = document.getElementById('toast');

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toast._timer);

  toast._timer = setTimeout(function(){
    toast.classList.remove('show');
  },2400);
}

switchFlow('Income');
