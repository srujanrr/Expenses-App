/* SpendWise
   Local-first finance application. The storage service is deliberately isolated
   so a future API can replace it without rewriting the UI/business calculations.
*/
(() => {
"use strict";

const STORAGE_KEY = "spendwise_data_v1";
const CURRENCIES = {
  INR:{code:"INR",symbol:"₹",name:"Indian Rupee"}, USD:{code:"USD",symbol:"$",name:"US Dollar"},
  EUR:{code:"EUR",symbol:"€",name:"Euro"}, GBP:{code:"GBP",symbol:"£",name:"British Pound"},
  AUD:{code:"AUD",symbol:"A$",name:"Australian Dollar"}, CAD:{code:"CAD",symbol:"C$",name:"Canadian Dollar"},
  SGD:{code:"SGD",symbol:"S$",name:"Singapore Dollar"}, AED:{code:"AED",symbol:"د.إ",name:"UAE Dirham"},
  JPY:{code:"JPY",symbol:"¥",name:"Japanese Yen"}
};
const ICONS = ["🍔","🛒","☕","🛵","🚕","🚌","🚆","⛽","🅿️","🏠","💡","💧","🌐","📱","🛡️","🛍️","👕","💻","🧹","💇","🎬","🎮","🎟️","🎨","❤️","🩺","💊","🏋️","✈️","🏨","🏝️","📚","💰","🎁","🔧","📦","🧾","📌","✨"];
const CATEGORY_DEFAULTS = [
  ["Food","🍔","primary",["Restaurants","Coffee","Delivery","Groceries"]],
  ["Transportation","🛵","success",["Fuel","Taxi","Bus","Train","Parking","Vehicle maintenance"]],
  ["Bills","💡","warning",["Electricity","Water","Internet","Phone","Rent","Insurance"]],
  ["Shopping","🛍️","primary-2",["Clothing","Electronics","Household","Personal care"]],
  ["Entertainment","🎬","danger",["Movies","Games","Events","Hobbies"]],
  ["Health","❤️","success",["Doctor","Pharmacy","Fitness","Medical"]],
  ["Travel","✈️","primary",["Flights","Hotels","Activities"]],
  ["Education","📚","primary-2",["Courses","Books","Supplies"]],
  ["Other","📦","muted",[]]
];

const NAV = [
  ["dashboard","⌂","Dashboard"],["transactions","↕","Transactions"],["add","＋","Add Expense"],["income","↗","Income"],
  ["budgets","◒","Budgets"],["accounts","▣","Accounts"],["categories","⌘","Categories"],["recurring","⟳","Recurring"],
  ["reports","◔","Reports"],["goals","◎","Goals"],["debts","▤","Debts"],["subscriptions","◉","Subscriptions"],["settings","⚙","Settings"]
];
const MOBILE_NAV = [["dashboard","⌂","Home"],["transactions","↕","Transactions"],["add","＋","Add"],["reports","◔","Reports"],["more","☷","More"]];

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const today = () => new Date().toISOString().slice(0,10);
const nowISO = () => new Date().toISOString();
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate = d => d ? new Intl.DateTimeFormat(undefined,{day:"2-digit",month:"short",year:"numeric"}).format(new Date(d+"T00:00:00")) : "—";
const monthKey = d => String(d || "").slice(0,7);
const startOfMonth = () => { const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); };
const startOfWeek = () => { const d=new Date(); const day=d.getDay(); const diff=(day+6)%7; d.setDate(d.getDate()-diff); d.setHours(0,0,0,0); return d; };
const inRange = (date, from, to) => date >= from && date <= to;

const storage = {
  load(){
    try { const raw=localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : seedData(); }
    catch(e){ console.error(e); return seedData(); }
  },
  save(data){ localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },
  get(key){ return state[key]; },
  add(key,item){ state[key].push(item); this.save(state); return item; },
  update(key,id,patch){ const i=state[key].findIndex(x=>x.id===id); if(i<0) return null; state[key][i]={...state[key][i],...patch,updatedAt:nowISO()}; this.save(state); return state[key][i]; },
  remove(key,id){ state[key]=state[key].filter(x=>x.id!==id); this.save(state); },
  replace(data){ state=data; this.save(state); }
};

function seedData(){
  const categories = CATEGORY_DEFAULTS.map(([name,icon,color,subs])=>({id:uid("cat"),name,icon,color,subcategories:subs,createdAt:nowISO()}));
  const idByName = Object.fromEntries(categories.map(c=>[c.name,c.id]));
  const accounts = [
    {id:"account_cash",name:"Cash",type:"Cash",balance:4200,currency:"INR",createdAt:nowISO()},
    {id:"account_bank",name:"Main Bank",type:"Bank account",balance:48500,currency:"INR",createdAt:nowISO()},
    {id:"account_upi",name:"UPI Wallet",type:"UPI wallet",balance:6200,currency:"INR",createdAt:nowISO()},
    {id:"account_card",name:"Credit Card",type:"Credit card",balance:0,currency:"INR",createdAt:nowISO()}
  ];
  const mk = (daysAgo) => { const d=new Date(); d.setDate(d.getDate()-daysAgo); return d.toISOString().slice(0,10); };
  const transactions = [
    ["expense",450,"Dinner at Zomato","Food","Restaurants","account_upi","UPI",0],
    ["expense",320,"Uber ride","Transportation","Taxi","account_upi","UPI",1],
    ["expense",1299,"Amazon household","Shopping","Household","account_card","Credit Card",2],
    ["expense",899,"Electricity bill","Bills","Electricity","account_bank","Bank Transfer",4],
    ["expense",299,"Netflix","Entertainment","Movies","account_card","Credit Card",5],
    ["expense",540,"Swiggy order","Food","Delivery","account_upi","UPI",6],
    ["expense",1800,"Fuel","Transportation","Fuel","account_cash","Cash",8],
    ["expense",720,"Pharmacy","Health","Pharmacy","account_upi","UPI",10],
    ["expense",2450,"Weekend hotel","Travel","Hotels","account_bank","Debit Card",13],
    ["expense",650,"Groceries","Food","Groceries","account_bank","Debit Card",16],
    ["expense",399,"Spotify","Entertainment","Hobbies","account_card","Credit Card",18],
    ["expense",1100,"New shirt","Shopping","Clothing","account_card","Credit Card",21],
    ["income",45000,"Salary","Other","", "account_bank","Bank Transfer",2],
    ["income",3500,"Freelance project","Other","", "account_bank","Bank Transfer",7],
  ].map(([type,amount,title,category,subcategory,accountId,paymentMethod,daysAgo])=>({
    id:uid("txn"),type,amount,currency:"INR",title,category,subcategory,accountId,paymentMethod,
    date:mk(daysAgo),time:"10:00",notes:"Demo transaction",tags:[category.toLowerCase()],location:"",attachment:null,reviewed:false,createdAt:nowISO()
  }));
  const budgets = [
    {id:uid("bud"),name:"Food & dining",category:"Food",amount:6500,period:"Monthly",startDate:monthKey(today())+"-01",endDate:"",alertPercentage:75},
    {id:uid("bud"),name:"Transport",category:"Transportation",amount:4500,period:"Monthly",startDate:monthKey(today())+"-01",endDate:"",alertPercentage:75},
    {id:uid("bud"),name:"Shopping",category:"Shopping",amount:5000,period:"Monthly",startDate:monthKey(today())+"-01",endDate:"",alertPercentage:90},
    {id:uid("bud"),name:"Entertainment",category:"Entertainment",amount:2500,period:"Monthly",startDate:monthKey(today())+"-01",endDate:"",alertPercentage:90}
  ];
  const recurringTransactions = [
    {id:uid("rec"),name:"Rent",amount:18000,type:"expense",category:"Bills",accountId:"account_bank",frequency:"Monthly",startDate:monthKey(today())+"-01",endDate:"",nextOccurrence:nextDate("Monthly",5),active:true},
    {id:uid("rec"),name:"Salary",amount:45000,type:"income",category:"Other",accountId:"account_bank",frequency:"Monthly",startDate:monthKey(today())+"-01",endDate:"",nextOccurrence:nextDate("Monthly",20),active:true},
    {id:uid("rec"),name:"Internet",amount:999,type:"expense",category:"Bills",accountId:"account_bank",frequency:"Monthly",startDate:monthKey(today())+"-01",endDate:"",nextOccurrence:nextDate("Monthly",12),active:true}
  ];
  const subscriptions = [
    {id:uid("sub"),name:"Netflix",amount:299,cycle:"Monthly",nextBilling:nextDate("Monthly",8),category:"Entertainment",accountId:"account_card",active:true},
    {id:uid("sub"),name:"Spotify",amount:119,cycle:"Monthly",nextBilling:nextDate("Monthly",16),category:"Entertainment",accountId:"account_card",active:true},
    {id:uid("sub"),name:"Cloud storage",amount:149,cycle:"Monthly",nextBilling:nextDate("Monthly",22),category:"Other",accountId:"account_card",active:true}
  ];
  const goals = [
    {id:uid("goal"),name:"Emergency fund",target:100000,current:32500,targetDate:"2027-03-01",icon:"🛟",color:"primary"},
    {id:uid("goal"),name:"New phone",target:60000,current:18500,targetDate:"2027-01-15",icon:"📱",color:"primary-2"}
  ];
  const debts = [{id:uid("debt"),name:"Credit card balance",total:40000,remaining:17800,interest:18.5,minPayment:2500,dueDate:nextDate("Monthly",10),type:"Credit card"}];
  const notifications = [
    {id:uid("note"),title:"Welcome to SpendWise",message:"Demo data is loaded. You can reset it any time from Settings.",date:nowISO(),read:false,type:"info"},
    {id:uid("note"),title:"Budget check",message:"Your Food & dining budget is being tracked automatically.",date:nowISO(),read:false,type:"budget"}
  ];
  return {version:1,users:[],accounts,transactions,categories,budgets,recurringTransactions,subscriptions,goals,debts,notifications,
    settings:{theme:"system",currency:"INR",dateFormat:"DD/MM/YYYY",startScreen:"dashboard",weekStarts:"Monday",defaultAccount:"account_bank",defaultCategory:"Food",
      budgetAlerts:true,recurringAlerts:true,subscriptionAlerts:true,monthlySummary:true,demo:true}};
}
function nextDate(freq,day=1){
  const d=new Date(); d.setHours(0,0,0,0);
  if(freq==="Daily") d.setDate(d.getDate()+day);
  else if(freq==="Weekly") d.setDate(d.getDate()+day);
  else if(freq==="Yearly") d.setFullYear(d.getFullYear()+1);
  else d.setMonth(d.getMonth()+1), d.setDate(Math.min(day,28));
  return d.toISOString().slice(0,10);
}

let state = storage.load();
let currentScreen = state.settings.startScreen || "dashboard";
let dashboardPeriod = "monthly";
let txFilters = {search:"",category:"",account:"",payment:"",type:"",from:"",to:"",tag:"",sort:"newest"};
let reportRange = "month";
let reportType = "category";
let editingId = null;
let settingsTab = "appearance";

function currency(code=state.settings.currency){ return CURRENCIES[code] || CURRENCIES.INR; }
function money(amount, code=state.settings.currency){
  const c=currency(code);
  return `${c.symbol}${Number(amount||0).toLocaleString(undefined,{maximumFractionDigits:2})}`;
}
function expenses(rangeFrom="",rangeTo=""){
  return state.transactions.filter(t=>t.type==="expense" && (!rangeFrom || t.date>=rangeFrom) && (!rangeTo || t.date<=rangeTo));
}
function incomes(rangeFrom="",rangeTo=""){
  return state.transactions.filter(t=>t.type==="income" && (!rangeFrom || t.date>=rangeFrom) && (!rangeTo || t.date<=rangeTo));
}
function sum(arr){ return arr.reduce((n,t)=>n+Number(t.amount||0),0); }
function currentMonthRange(){ return [monthKey(today())+"-01",today()]; }
function totals(){
  const [from,to]=currentMonthRange(), inc=sum(incomes(from,to)), exp=sum(expenses(from,to));
  const allInc=sum(incomes()), allExp=sum(expenses());
  return {inc,exp,savings:inc-exp,rate:inc?((inc-exp)/inc)*100:0,totalBalance:sum(state.accounts.map(a=>a.balance))+allInc-allExp};
}
function accountBalance(accountId){
  const a=state.accounts.find(x=>x.id===accountId); if(!a) return 0;
  // Account starting balance is represented by its stored balance; transaction changes are
  // applied when the transaction is saved. This keeps account balances fast to display.
  return Number(a.balance||0);
}
function categorySpent(category, from, to){ return sum(expenses(from,to).filter(t=>t.category===category)); }
function budgetSpent(b){ return categorySpent(b.category,b.startDate,b.endDate || today()); }
function progressClass(p){ return p>=90?"red":p>=70?"orange":""; }
function getCategory(name){ return state.categories.find(c=>c.name===name); }
function iconFor(category){ return getCategory(category)?.icon || "•"; }
function accountName(id){ return state.accounts.find(a=>a.id===id)?.name || "Unknown account"; }

function applyTheme(){
  const mode=state.settings.theme;
  let theme=mode;
  if(mode==="system") theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  document.documentElement.dataset.theme=theme;
}
function renderNav(){
  $("#sidebarNav").innerHTML=NAV.map(([id,icon,label])=>`<button class="nav-item ${currentScreen===id?"active":""}" data-nav="${id}"><span class="nav-icon">${icon}</span>${label}</button>`).join("");
  $("#bottomNav").innerHTML=MOBILE_NAV.map(([id,icon,label])=>{
    const active=(id==="more" ? ["settings","accounts","categories","budgets","goals","debts","subscriptions","recurring"].includes(currentScreen) : currentScreen===id);
    return `<button class="${active?"active":""} ${id==="add"?"add-mobile":""}" data-nav="${id}"><span>${icon}</span>${label}</button>`;
  }).join("");
}
function navigate(screen){
  if(screen==="more") screen="settings";
  if(screen==="add") screen="add";
  currentScreen=screen; editingId=null; renderNav(); renderScreen(); window.scrollTo({top:0,behavior:"smooth"});
}
function renderScreen(){
  const views={dashboard:renderDashboard,transactions:renderTransactions,add:renderExpense,income:renderIncome,budgets:renderBudgets,accounts:renderAccounts,categories:renderCategories,recurring:renderRecurring,reports:renderReports,goals:renderGoals,debts:renderDebts,subscriptions:renderSubscriptions,settings:renderSettings};
  (views[currentScreen]||renderDashboard)();
  $("#screen").focus({preventScroll:true});
  applyTheme();
}
document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-nav]"); if(nav){navigate(nav.dataset.nav); return;}
  const action=e.target.closest("[data-action]"); if(action) handleAction(action.dataset.action,action);
  const row=e.target.closest("[data-tx]"); if(row && !e.target.closest("button,input")) openTransactionDetail(row.dataset.tx);
});
document.addEventListener("change",e=>{
  if(e.target.dataset.action) handleAction(e.target.dataset.action,e.target);
});
document.addEventListener("input",e=>{
  if(e.target.dataset.live==="transactions"){txFilters.search=e.target.value; renderTransactions();}
});

function handleAction(action,el){
  switch(action){
    case "toggle-sidebar": $(".sidebar").classList.toggle("open"); break;
    case "open-search": openGlobalSearch(); break;
    case "open-notifications": openNotifications(); break;
    case "open-settings": navigate("settings"); break;
    case "add-expense": navigate("add"); break;
    case "add-income": openIncomeModal(); break;
    case "edit-tx": openExpenseModal(el.dataset.id); break;
    case "delete-tx": confirmDelete("transaction",el.dataset.id); break;
    case "duplicate-tx": duplicateTransaction(el.dataset.id); break;
    case "detail-tx": openTransactionDetail(el.dataset.id); break;
    case "mark-reviewed": storage.update("transactions",el.dataset.id,{reviewed:true}); toast("Marked as reviewed","success"); renderScreen(); break;
    case "save-expense": saveExpense(false); break;
    case "save-another": saveExpense(true); break;
    case "cancel-form": navigate("dashboard"); break;
    case "show-filters": $("#transactionFilters").hidden=!$("#transactionFilters").hidden; break;
    case "clear-filters": txFilters={search:"",category:"",account:"",payment:"",type:"",from:"",to:"",tag:"",sort:"newest"}; renderTransactions(); break;
    case "bulk-delete": bulkDelete(); break;
    case "bulk-export": exportCSV(getSelectedTransactions()); break;
    case "bulk-tag": bulkTag(); break;
    case "set-dashboard-period": dashboardPeriod=el.dataset.period; renderDashboard(); break;
    case "edit-account": openAccountModal(el.dataset.id); break;
    case "delete-account": confirmDelete("account",el.dataset.id); break;
    case "save-account": saveAccount(); break;
    case "edit-budget": openBudgetModal(el.dataset.id); break;
    case "delete-budget": confirmDelete("budget",el.dataset.id); break;
    case "save-budget": saveBudget(); break;
    case "edit-category": openCategoryModal(el.dataset.id); break;
    case "delete-category": confirmDelete("category",el.dataset.id); break;
    case "save-category": saveCategory(); break;
    case "edit-recurring": openRecurringModal(el.dataset.id); break;
    case "delete-recurring": confirmDelete("recurringTransactions",el.dataset.id); break;
    case "save-recurring": saveRecurring(); break;
    case "edit-subscription": openSubscriptionModal(el.dataset.id); break;
    case "delete-subscription": confirmDelete("subscription",el.dataset.id); break;
    case "save-subscription": saveSubscription(); break;
    case "edit-goal": openGoalModal(el.dataset.id); break;
    case "delete-goal": confirmDelete("goal",el.dataset.id); break;
    case "save-goal": saveGoal(); break;
    case "add-goal-money": addGoalMoney(el.dataset.id); break;
    case "edit-debt": openDebtModal(el.dataset.id); break;
    case "delete-debt": confirmDelete("debt",el.dataset.id); break;
    case "save-debt": saveDebt(); break;
    case "open-reports": navigate("reports"); break;
    case "settings-tab": settingsTab=el.dataset.tab; renderSettings(); break;
    case "set-theme": state.settings.theme=el.value; storage.save(state); applyTheme(); break;
    case "set-currency": state.settings.currency=el.value; storage.save(state); renderScreen(); toast("Currency updated","success"); break;
    case "save-settings": saveSettings(); break;
    case "export-json": exportJSON(); break;
    case "export-csv": exportCSV(state.transactions); break;
    case "import-json": $("#jsonImport").click(); break;
    case "clear-data": strongClearData(); break;
    case "reset-demo": resetDemo(); break;
    case "close-modal": closeModal(); break;
    case "close-search": closeModal(); break;
    case "confirm-delete": performDelete(el.dataset.kind,el.dataset.id); break;
    case "select-all": toggleSelectAll(el.checked); break;
    case "mark-all-read": state.notifications.forEach(n=>n.read=true); storage.save(state); updateNotificationDot(); closeModal(); break;
  }
}
function toast(message,type=""){
  const wrap=$("#toastRoot"); wrap.className="toast-wrap"; const el=document.createElement("div"); el.className=`toast ${type}`; el.textContent=message; wrap.appendChild(el); setTimeout(()=>el.remove(),2800);
}
function modal(html, cls=""){
  $("#modalRoot").innerHTML=`<div class="modal-backdrop" role="dialog" aria-modal="true"><div class="modal ${cls}">${html}</div></div>`;
}
function closeModal(){ $("#modalRoot").innerHTML=""; }
function confirmDelete(kind,id){
  const labels={transaction:"transaction",account:"account",budget:"budget",category:"category",recurringTransactions:"recurring transaction",subscription:"subscription",goal:"goal",debt:"debt"};
  modal(`<div class="modal-head"><div><h2>Delete ${labels[kind]||"item"}?</h2><p>This action cannot be undone.</p></div><button class="close" data-action="close-modal" aria-label="Close">×</button></div>
    <div class="notice">Are you sure you want to permanently delete this ${labels[kind]||"item"}?</div>
    <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn danger" data-action="confirm-delete" data-kind="${kind}" data-id="${id}">Delete</button></div>`, "small");
}
function performDelete(kind,id){
  if(kind==="transaction"){const t=state.transactions.find(x=>x.id===id); if(t) adjustAccount(t, -1); storage.remove("transactions",id);}
  else if(kind==="account"){ if(state.accounts.length<=1){toast("Keep at least one account","error"); return;} storage.remove("accounts",id); state.transactions=state.transactions.map(t=>t.accountId===id?{...t,accountId:""}:t); storage.save(state);}
  else if(kind==="budget") storage.remove("budgets",id);
  else if(kind==="category"){const c=state.categories.find(x=>x.id===id); if(c){state.transactions.forEach(t=>{if(t.category===c.name)t.category="Other"}); storage.remove("categories",id); storage.save(state);}}
  else if(kind==="recurringTransactions") storage.remove("recurringTransactions",id);
  else if(kind==="subscription") storage.remove("subscriptions",id);
  else if(kind==="goal") storage.remove("goals",id);
  else if(kind==="debt") storage.remove("debts",id);
  closeModal(); toast("Deleted","success"); renderScreen();
}
function adjustAccount(tx, direction){
  const a=state.accounts.find(x=>x.id===tx.accountId); if(!a)return;
  const delta=tx.type==="income"?Number(tx.amount): -Number(tx.amount);
  a.balance += delta*direction; storage.save(state);
}

function renderDashboard(){
  processRecurring();
  const t=totals(), currentMonth=monthKey(today()), recent=state.transactions.filter(x=>monthKey(x.date)===currentMonth).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);
  const budgets=state.budgets.slice(0,4), categoryData=categoryBreakdown(currentMonth+"-01",today());
  const periodLabel=dashboardPeriod==="daily"?"Daily":dashboardPeriod==="weekly"?"Weekly":"Monthly";
  $("#screen").innerHTML=`
    <div class="page-head"><div><h1>Good morning</h1><p>${new Intl.DateTimeFormat(undefined,{weekday:"long",month:"long",day:"numeric"}).format(new Date())} · ${state.settings.demo?"Demo data":"Your private wallet"}</p></div>
      <div class="head-actions"><button class="btn" data-action="open-search">⌕ Search</button><button class="btn primary" data-action="add-expense">＋ Add expense</button></div></div>
    <div class="grid grid-4">
      ${stat("Total balance",money(t.totalBalance),"Across all accounts","▣")}
      ${stat("Income this month",money(t.inc),"Compared with last period","↗","positive")}
      ${stat("Expenses this month",money(t.exp),"This month's spending","↘","negative")}
      ${stat("Savings",money(t.savings),`${t.rate.toFixed(1)}% savings rate`,"◎",t.savings>=0?"positive":"negative")}
    </div>
    <div class="dashboard-grid">
      <div class="card chart-card"><div class="chart-head"><div><h3>Spending trend</h3><span class="kpi">Actual expense transactions</span></div>
        <div class="segmented">${["daily","weekly","monthly"].map(p=>`<button class="${dashboardPeriod===p?"active":""}" data-action="set-dashboard-period" data-period="${p}">${p[0].toUpperCase()+p.slice(1)}</button>`).join("")}</div></div>
        <div class="chart-wrap">${lineChart(dashboardTrend())}</div></div>
      <div class="card chart-card"><div class="chart-head"><div><h3>Expense by category</h3><span class="kpi">${money(sum(categoryData.map(x=>x.value)))}</span></div></div>
        ${donutChart(categoryData)}</div>
    </div>
    <div class="dashboard-grid">
      <div class="card"><div class="chart-head"><h3>Recent transactions</h3><button class="btn small" data-nav="transactions">View all</button></div>
        <div class="list">${recent.length?recent.map(txRow).join(""):emptyState("No transactions yet","Start tracking your spending by adding your first expense.")}</div></div>
      <div class="card"><div class="chart-head"><h3>Budget progress</h3><button class="btn small" data-nav="budgets">Manage</button></div>
        ${budgets.length?budgets.map(budgetMini).join(""):emptyState("No budgets yet","Create a budget to stay on track.")}</div>
    </div>
    <div class="card section-card"><div class="chart-head"><h3>Financial insights</h3><span class="pill">Automatic</span></div>${insights().map(i=>`<div class="insight"><div class="insight-icon">${i.icon}</div><p>${i.text}</p></div>`).join("")}</div>
    <button class="fab" data-action="add-expense" aria-label="Add expense">＋</button>`;
}
function stat(label,value,meta,icon,cls=""){return `<div class="card stat-card"><span class="stat-label">${label}</span><div class="stat-value ${cls}">${value}</div><div class="stat-meta">${meta}</div><span class="stat-icon">${icon}</span></div>`}
function emptyState(title,text,button="Add Expense"){return `<div class="empty"><div class="empty-icon">◌</div><h3>${title}</h3><p>${text}</p>${button?`<button class="btn primary small" data-action="add-expense">${button}</button>`:""}</div>`}
function txRow(t){
  return `<div class="tx-row" data-tx="${t.id}">
    <div class="tx-icon">${iconFor(t.category)}</div><div class="tx-main"><div class="tx-title">${escapeHtml(t.title)}</div><div class="tx-sub">${escapeHtml(t.category)}${t.subcategory?" · "+escapeHtml(t.subcategory):""} · ${fmtDate(t.date)} · ${escapeHtml(accountName(t.accountId))}</div></div>
    <div class="tx-amount ${t.type==="income"?"positive":"negative"}">${t.type==="income"?"+":"−"}${money(t.amount,t.currency)}</div>
    <div class="row-actions"><button class="btn icon small" data-action="edit-tx" data-id="${t.id}" aria-label="Edit transaction">✎</button><button class="btn icon small" data-action="delete-tx" data-id="${t.id}" aria-label="Delete transaction">×</button></div>
  </div>`;
}
function budgetMini(b){
  const spent=budgetSpent(b), p=b.amount?Math.min(100,(spent/b.amount)*100):0;
  return `<div class="budget-card"><div class="budget-line"><strong>${escapeHtml(b.name)}</strong><span>${money(spent)} / ${money(b.amount)}</span></div><div class="progress ${progressClass(p)}"><span style="width:${p}%"></span></div><div class="budget-line"><span>${p.toFixed(0)}% used</span><span class="${p>=100?"negative":""}">${money(Math.max(0,b.amount-spent))} left</span></div></div>`;
}
function categoryBreakdown(from,to){
  const vals={}; expenses(from,to).forEach(t=>vals[t.category]=(vals[t.category]||0)+Number(t.amount));
  return Object.entries(vals).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value,icon:iconFor(name)})).slice(0,8);
}
function dashboardTrend(){
  const e=expenses(), days={}; const start=new Date(); start.setDate(start.getDate()-29);
  e.forEach(t=>{if(t.date>=start.toISOString().slice(0,10))days[t.date]=(days[t.date]||0)+Number(t.amount)});
  if(dashboardPeriod==="monthly"){ const m={}; e.forEach(t=>{const k=monthKey(t.date);m[k]=(m[k]||0)+Number(t.amount)}); return Object.entries(m).slice(-6).map(([label,value])=>({label:label.slice(5),value}));}
  if(dashboardPeriod==="weekly"){ const w={}; e.forEach(t=>{const d=new Date(t.date+"T00:00:00"), key=`W${getWeek(d)}`;w[key]=(w[key]||0)+Number(t.amount)}); return Object.entries(w).slice(-8).map(([label,value])=>({label,value}));}
  return Object.entries(days).slice(-14).map(([label,value])=>({label:label.slice(5),value}));
}
function getWeek(d){const onejan=new Date(d.getFullYear(),0,1);return Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7)}
function lineChart(data){
  if(!data.length)return `<div class="empty">No expense data for this period.</div>`;
  const w=720,h=230,pad=25,max=Math.max(...data.map(x=>x.value),1), step=(w-pad*2)/Math.max(1,data.length-1);
  const points=data.map((x,i)=>`${pad+i*step},${h-pad-(x.value/max)*(h-pad*2)}`).join(" ");
  const circles=data.map((x,i)=>{const y=h-pad-(x.value/max)*(h-pad*2);return `<circle cx="${pad+i*step}" cy="${y}" r="3.5" fill="var(--primary)"><title>${escapeHtml(x.label)}: ${money(x.value)}</title></circle>`}).join("");
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Spending trend chart"><line x1="${pad}" x2="${w-pad}" y1="${h-pad}" y2="${h-pad}" stroke="var(--border)"/><polyline points="${points}" fill="none" stroke="var(--primary)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}
    <text x="${pad}" y="${h-5}" font-size="10" fill="var(--muted)">${escapeHtml(data[0].label)}</text><text x="${w-pad}" y="${h-5}" text-anchor="end" font-size="10" fill="var(--muted)">${escapeHtml(data[data.length-1].label)}</text></svg>`;
}
function donutChart(data){
  const total=sum(data); if(!total)return emptyState("No expense breakdown","Add expenses to see category insights.");
  const palette=["#4F46E5","#7C3AED","#10B981","#F59E0B","#EF4444","#0EA5E9","#EC4899","#94A3B8"];
  let cursor=0; const stops=data.map((x,i)=>{const s=cursor;cursor+=(x.value/total)*100;return `${palette[i%palette.length]} ${s}% ${cursor}%`}).join(",");
  return `<div class="donut-wrap"><div class="donut" style="background:conic-gradient(${stops})"></div><div class="donut-center"><strong>${money(total)}</strong><span>This month</span></div></div><div class="legend">${data.map((x,i)=>`<div class="legend-row"><span class="dot" style="background:${palette[i%palette.length]}"></span>${escapeHtml(x.name)} <strong>${((x.value/total)*100).toFixed(0)}%</strong></div>`).join("")}</div>`;
}
function insights(){
  const [from,to]=currentMonthRange(), cur=categoryBreakdown(from,to), prevStart=new Date();prevStart.setMonth(prevStart.getMonth()-1,1);
  const prevFrom=prevStart.toISOString().slice(0,10), prevEnd=new Date(new Date().getFullYear(),new Date().getMonth(),0).toISOString().slice(0,10);
  const prev=categoryBreakdown(prevFrom,prevEnd), arr=[];
  if(cur[0]){const p=prev.find(x=>x.name===cur[0].name)?.value||0; const pct=p?((cur[0].value-p)/p)*100:0; arr.push({icon:"◔",text:`${escapeHtml(cur[0].name)} is your largest category this month at ${money(cur[0].value)}${p?` (${pct>=0?Math.abs(pct).toFixed(0)+"% more":"less"} than last month)`: "."}`});}
  const t=totals(); arr.push(t.savings>=0?{icon:"✓",text:`You are within your monthly cash flow: ${money(t.savings)} saved so far this month.`}:{icon:"!",text:`Expenses are ${money(Math.abs(t.savings))} above income this month. Review your budgets and recent spending.`});
  const b=state.budgets.find(x=>budgetSpent(x)/x.amount>=.9); if(b)arr.push({icon:"⚠",text:`Your ${escapeHtml(b.name)} budget is close to its limit. ${money(Math.max(0,b.amount-budgetSpent(b)))} remains.`});
  else arr.push({icon:"◎",text:`You have ${state.budgets.length} active budgets. Budget progress updates automatically as you add, edit, or delete transactions.`});
  return arr.slice(0,3);
}

function renderTransactions(){
  const rows=filteredTransactions();
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Transactions</h1><p>Search, filter, review, edit, duplicate, and export your history.</p></div><div class="head-actions"><button class="btn" data-action="bulk-export">Export selected</button><button class="btn primary" data-action="add-expense">＋ Add expense</button></div></div>
    <div class="card"><div class="toolbar"><input class="search-input" data-live="transactions" value="${escapeHtml(txFilters.search)}" placeholder="Search merchant, notes, tags..." aria-label="Search transactions"><button class="btn" data-action="show-filters">☷ Filters</button><button class="btn" data-action="clear-filters">Reset</button></div>
    <div id="transactionFilters" class="filter-panel" ${Object.values(txFilters).some(Boolean)?"":"hidden"}>
      ${selectField("Category","txCategory",state.categories.map(c=>[c.name,c.name]),txFilters.category,"data-filter")}
      ${selectField("Account","txAccount",state.accounts.map(a=>[a.id,a.name]),txFilters.account,"data-filter")}
      ${selectField("Payment","txPayment",["Cash","Credit Card","Debit Card","UPI","Bank Transfer","Wallet","Other"].map(x=>[x,x]),txFilters.payment,"data-filter")}
      ${selectField("Type","txType",[["expense","Expense"],["income","Income"]],txFilters.type,"data-filter")}
      <div class="field"><label>From</label><input type="date" data-filter="from" value="${txFilters.from}"></div>
      <div class="field"><label>To</label><input type="date" data-filter="to" value="${txFilters.to}"></div>
      <div class="field"><label>Tag</label><input data-filter="tag" value="${escapeHtml(txFilters.tag)}" placeholder="food"></div>
      ${selectField("Sort","txSort",[["newest","Newest"],["oldest","Oldest"],["high","Highest amount"],["low","Lowest amount"]],txFilters.sort,"data-filter")}
    </div>
    <div class="table-wrap"><table class="data-table"><thead><tr><th><input type="checkbox" class="table-check" data-action="select-all"></th><th>Transaction</th><th>Category</th><th>Date</th><th>Account</th><th>Amount</th><th></th></tr></thead>
    <tbody>${rows.length?rows.map(t=>`<tr data-tx="${t.id}"><td><input type="checkbox" class="table-check tx-select" value="${t.id}"></td><td><div class="tx-title">${iconFor(t.category)} ${escapeHtml(t.title)}</div><div class="tx-sub">${escapeHtml(t.paymentMethod)}${t.reviewed?" · Reviewed":""}</div></td><td><span class="pill">${escapeHtml(t.category)}</span></td><td>${fmtDate(t.date)}</td><td>${escapeHtml(accountName(t.accountId))}</td><td class="${t.type==="income"?"positive":"negative"}">${t.type==="income"?"+":"−"}${money(t.amount,t.currency)}</td><td><div class="row-actions"><button class="btn icon small" data-action="edit-tx" data-id="${t.id}">✎</button><button class="btn icon small" data-action="duplicate-tx" data-id="${t.id}">⧉</button><button class="btn icon small" data-action="delete-tx" data-id="${t.id}">×</button></div></td></tr>`).join(""):`<tr><td colspan="7">${emptyState("No transactions found","Try changing your filters or add a new expense.")}</td></tr>`}</tbody></table></div>
    <div class="toolbar" style="justify-content:flex-end;margin-top:12px"><button class="btn small" data-action="bulk-tag">Add tag to selected</button><button class="btn small danger" data-action="bulk-delete">Delete selected</button></div></div>`;
  $$("[data-filter]").forEach(x=>x.addEventListener("change",()=>{const key=x.dataset.filter;txFilters[key]=x.value;renderTransactions();}));
}
function filteredTransactions(){
  let rows=[...state.transactions];
  const f=txFilters;
  if(f.search){const q=f.search.toLowerCase();rows=rows.filter(t=>[t.title,t.category,t.subcategory,t.notes,(t.tags||[]).join(" ")].join(" ").toLowerCase().includes(q));}
  if(f.category)rows=rows.filter(t=>t.category===f.category); if(f.account)rows=rows.filter(t=>t.accountId===f.account); if(f.payment)rows=rows.filter(t=>t.paymentMethod===f.payment); if(f.type)rows=rows.filter(t=>t.type===f.type);
  if(f.from)rows=rows.filter(t=>t.date>=f.from);if(f.to)rows=rows.filter(t=>t.date<=f.to);if(f.tag)rows=rows.filter(t=>(t.tags||[]).some(x=>x.toLowerCase().includes(f.tag.toLowerCase())));
  if(f.sort==="oldest")rows.sort((a,b)=>a.date.localeCompare(b.date)); else if(f.sort==="high")rows.sort((a,b)=>b.amount-a.amount); else if(f.sort==="low")rows.sort((a,b)=>a.amount-b.amount); else rows.sort((a,b)=>b.date.localeCompare(a.date));
  return rows;
}
function getSelectedTransactions(){const ids=$$(".tx-select:checked").map(x=>x.value);return state.transactions.filter(t=>ids.includes(t.id));}
function toggleSelectAll(v){$$(".tx-select").forEach(x=>x.checked=v)}
function bulkDelete(){const rows=getSelectedTransactions();if(!rows.length){toast("Select transactions first","error");return} modal(`<div class="modal-head"><div><h2>Delete ${rows.length} transactions?</h2><p>This cannot be undone.</p></div><button class="close" data-action="close-modal">×</button></div><div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn danger" id="bulkConfirm">Delete</button></div>`,"small");$("#bulkConfirm").onclick=()=>{rows.forEach(t=>{adjustAccount(t,-1);state.transactions=state.transactions.filter(x=>x.id!==t.id)});storage.save(state);closeModal();toast("Transactions deleted","success");renderTransactions();}}
function bulkTag(){const rows=getSelectedTransactions();if(!rows.length){toast("Select transactions first","error");return}modal(`<div class="modal-head"><div><h2>Add tag</h2><p>Apply a tag to ${rows.length} selected transactions.</p></div><button class="close" data-action="close-modal">×</button></div><div class="field"><label>Tag</label><input id="bulkTagInput" placeholder="e.g. reviewed"></div><div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="bulkTagConfirm">Add tag</button></div>`,"small");$("#bulkTagConfirm").onclick=()=>{const tag=$("#bulkTagInput").value.trim();if(!tag)return toast("Enter a tag","error");rows.forEach(t=>{t.tags=[...new Set([...(t.tags||[]),tag])]});storage.save(state);closeModal();toast("Tag added","success");renderTransactions();}}
function duplicateTransaction(id){const t=state.transactions.find(x=>x.id===id);if(!t)return;const copy={...t,id:uid("txn"),title:t.title+" (copy)",createdAt:nowISO()};state.transactions.push(copy);adjustAccount(copy,1);storage.save(state);toast("Transaction duplicated","success");renderTransactions();}

function expenseForm(t={}){
  const isEdit=!!t.id, cat=t.category||state.settings.defaultCategory||state.categories[0]?.name||"Other";
  return `<div class="form-grid">
    <div class="field"><label for="expAmount">Amount *</label><input id="expAmount" type="number" min="0.01" step="0.01" value="${t.amount??""}" placeholder="0.00"></div>
    <div class="field"><label for="expTitle">Merchant / title *</label><input id="expTitle" value="${escapeHtml(t.title||"")}" placeholder="e.g. Dinner"></div>
    <div class="field"><label for="expCategory">Category *</label><select id="expCategory">${state.categories.map(c=>`<option ${c.name===cat?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div>
    <div class="field"><label for="expSubcategory">Subcategory</label><input id="expSubcategory" value="${escapeHtml(t.subcategory||"")}" placeholder="Optional"></div>
    <div class="field"><label for="expDate">Date *</label><input id="expDate" type="date" value="${t.date||today()}"></div>
    <div class="field"><label for="expTime">Time</label><input id="expTime" type="time" value="${t.time||"10:00"}"></div>
    <div class="field"><label for="expAccount">Account *</label><select id="expAccount">${state.accounts.map(a=>`<option value="${a.id}" ${a.id===(t.accountId||state.settings.defaultAccount)?"selected":""}>${escapeHtml(a.name)}</option>`).join("")}</select></div>
    <div class="field"><label for="expPayment">Payment method *</label><select id="expPayment">${["Cash","Credit Card","Debit Card","UPI","Bank Transfer","Wallet","Other"].map(x=>`<option ${x===(t.paymentMethod||"UPI")?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="field"><label for="expLocation">Location</label><input id="expLocation" value="${escapeHtml(t.location||"")}" placeholder="Optional"></div>
    <div class="field"><label for="expTags">Tags</label><input id="expTags" value="${escapeHtml((t.tags||[]).join(", "))}" placeholder="food, weekend"></div>
    <div class="field full"><label for="expNotes">Notes</label><textarea id="expNotes" placeholder="Add a note...">${escapeHtml(t.notes||"")}</textarea></div>
    <div class="field full"><label for="expReceipt">Receipt image</label><input id="expReceipt" type="file" accept="image/*"><span class="muted">${t.attachment?"A receipt is already attached. Choose a new image to replace it.":"Stored locally on this device; not uploaded."}</span></div>
  </div>`;
}
function renderExpense(){
  const t=editingId?state.transactions.find(x=>x.id===editingId):null;
  $("#screen").innerHTML=`<div class="page-head"><div><h1>${t?"Edit expense":"Add expense"}</h1><p>Capture spending in a few seconds. Data stays on this device.</p></div></div>
    <div class="card">${expenseForm(t||{})}<div class="form-actions"><button class="btn" data-action="cancel-form">Cancel</button><button class="btn" data-action="save-another">Save & Add Another</button><button class="btn primary" data-action="save-expense">${t?"Update expense":"Save expense"}</button></div></div>`;
}
function saveExpense(addAnother){
  const amount=Number($("#expAmount").value), title=$("#expTitle").value.trim(), date=$("#expDate").value, accountId=$("#expAccount").value;
  if(!(amount>0)){fieldError("#expAmount","Enter an amount greater than zero.");return}
  if(!title){fieldError("#expTitle","Enter a merchant or title.");return}
  if(!date || Number.isNaN(new Date(date).getTime())){fieldError("#expDate","Choose a valid date.");return}
  const old=editingId?state.transactions.find(x=>x.id===editingId):null;
  if(old) adjustAccount(old,-1);
  const file=$("#expReceipt").files[0];
  const finish=(attachment)=>{
    const item={id:old?.id||uid("txn"),type:"expense",amount,currency:state.settings.currency,title,category:$("#expCategory").value,subcategory:$("#expSubcategory").value.trim(),
      accountId,paymentMethod:$("#expPayment").value,date,time:$("#expTime").value,notes:$("#expNotes").value.trim(),tags:$("#expTags").value.split(",").map(x=>x.trim()).filter(Boolean),
      location:$("#expLocation").value.trim(),attachment:attachment||old?.attachment||null,reviewed:old?.reviewed||false,createdAt:old?.createdAt||nowISO()};
    if(old)storage.update("transactions",old.id,item);else state.transactions.push(item);
    adjustAccount(item,1);storage.save(state);processBudgetNotifications();toast(old?"Expense updated":"Expense saved","success");
    if(addAnother){editingId=null;renderExpense();}else{editingId=null;navigate("transactions");}
  };
  if(file){const reader=new FileReader();reader.onload=()=>finish({name:file.name,type:file.type,data:reader.result});reader.onerror=()=>finish(null);reader.readAsDataURL(file);}else finish(null);
}
function fieldError(selector,msg){const el=$(selector);el.focus();toast(msg,"error")}

function renderIncome(){
  const rows=state.transactions.filter(t=>t.type==="income").sort((a,b)=>b.date.localeCompare(a.date));
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Income</h1><p>Track salary, freelance work, refunds, investments, and other inflows.</p></div><button class="btn primary" data-action="add-income">＋ Add income</button></div>
  <div class="grid grid-3"><div class="card"><span class="stat-label">This month</span><div class="stat-value positive">${money(totals().inc)}</div><span class="stat-meta">Income received</span></div><div class="card"><span class="stat-label">Transactions</span><div class="stat-value">${rows.length}</div><span class="stat-meta">All recorded income</span></div><div class="card"><span class="stat-label">Average</span><div class="stat-value">${money(rows.length?sum(rows)/rows.length:0)}</div><span class="stat-meta">Per income transaction</span></div></div>
  <div class="card section-card"><div class="list">${rows.length?rows.map(txRow).join(""):emptyState("No income yet","Add your salary or another income source.","Add income")}</div></div>`;
}
function openIncomeModal(id=null){
  const t=id?state.transactions.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${t?"Edit income":"Add income"}</h2><p>Income affects balances, cash flow, and savings.</p></div><button class="close" data-action="close-modal">×</button></div>
    <div class="form-grid">
    <div class="field"><label>Amount *</label><input id="incAmount" type="number" min=".01" step=".01" value="${t?.amount||""}"></div>
    <div class="field"><label>Source *</label><input id="incSource" value="${escapeHtml(t?.title||"")}" placeholder="Salary"></div>
    <div class="field"><label>Category</label><select id="incCategory">${["Salary","Freelance income","Business income","Investment income","Interest","Gift","Refund","Other"].map(x=>`<option ${x===(t?.category||"Other")?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="field"><label>Date *</label><input id="incDate" type="date" value="${t?.date||today()}"></div>
    <div class="field"><label>Account *</label><select id="incAccount">${state.accounts.map(a=>`<option value="${a.id}" ${a.id===(t?.accountId||state.settings.defaultAccount)?"selected":""}>${escapeHtml(a.name)}</option>`).join("")}</select></div>
    <div class="field"><label>Payment method</label><select id="incPayment">${["Bank Transfer","Cash","UPI","Other"].map(x=>`<option ${x===(t?.paymentMethod||"Bank Transfer")?"selected":""}>${x}</option>`).join("")}</select></div>
    <div class="field full"><label>Notes</label><textarea id="incNotes">${escapeHtml(t?.notes||"")}</textarea></div>
    <div class="field full"><label class="checkbox-line"><input id="incRecurring" type="checkbox" ${t?.recurring?"checked":""}> Add as a recurring income template</label></div></div>
    <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveIncome">${t?"Update income":"Save income"}</button></div>`);
  $("#saveIncome").onclick=()=>saveIncome(t);
}
function saveIncome(old){
  const amount=Number($("#incAmount").value),title=$("#incSource").value.trim(),date=$("#incDate").value;
  if(!(amount>0)||!title||!date){toast("Complete amount, source, and date","error");return}
  if(old)adjustAccount(old,-1);
  const item={id:old?.id||uid("txn"),type:"income",amount,currency:state.settings.currency,title,category:$("#incCategory").value,subcategory:"",accountId:$("#incAccount").value,paymentMethod:$("#incPayment").value,date,time:"10:00",notes:$("#incNotes").value.trim(),tags:["income"],location:"",attachment:null,reviewed:false,recurring:$("#incRecurring").checked,createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("transactions",old.id,item);else state.transactions.push(item);adjustAccount(item,1);storage.save(state);
  if(item.recurring&&!old) state.recurringTransactions.push({id:uid("rec"),name:item.title,amount:item.amount,type:"income",category:item.category,accountId:item.accountId,frequency:"Monthly",startDate:item.date,endDate:"",nextOccurrence:nextDate("Monthly",new Date().getDate()),active:true});
  storage.save(state);closeModal();toast("Income saved","success");renderScreen();
}

function renderBudgets(){
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Budgets</h1><p>Set spending limits and track category progress.</p></div><button class="btn primary" data-action="edit-budget">＋ Create budget</button></div>
  <div class="grid grid-4">${state.budgets.map(b=>{const s=budgetSpent(b),p=b.amount?s/b.amount*100:0;return `<div class="card budget-card"><div class="chart-head"><div><h3>${escapeHtml(b.name)}</h3><span class="muted">${escapeHtml(b.period)} · ${escapeHtml(b.category)}</span></div><div class="row-actions"><button class="btn icon small" data-action="edit-budget" data-id="${b.id}">✎</button><button class="btn icon small" data-action="delete-budget" data-id="${b.id}">×</button></div></div><div class="big-number">${money(Math.max(0,b.amount-s))}</div><div class="budget-line"><span>remaining</span><span>${money(s)} / ${money(b.amount)}</span></div><div class="progress ${progressClass(p)}"><span style="width:${Math.min(100,p)}%"></span></div><div class="budget-line"><span>${p.toFixed(0)}% used</span><span>${p>=100?"Exceeded":p>=b.alertPercentage?"Alert zone":"On track"}</span></div></div>`}).join("") || emptyState("No budgets","Create a category budget to start.")}</div>`;
}
function openBudgetModal(id=null){
  const b=id?state.budgets.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${b?"Edit budget":"Create budget"}</h2><p>Budget spending is calculated from matching expense transactions.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Budget name *</label><input id="budName" value="${escapeHtml(b?.name||"")}"></div><div class="field"><label>Category *</label><select id="budCat">${state.categories.map(c=>`<option ${c.name===(b?.category||"")?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div>
  <div class="field"><label>Amount *</label><input id="budAmount" type="number" min="0.01" step=".01" value="${b?.amount||""}"></div><div class="field"><label>Period</label><select id="budPeriod">${["Weekly","Monthly","Custom"].map(x=>`<option ${x===(b?.period||"Monthly")?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="field"><label>Start date *</label><input id="budStart" type="date" value="${b?.startDate||monthKey(today())+"-01"}"></div><div class="field"><label>End date</label><input id="budEnd" type="date" value="${b?.endDate||""}"></div>
  <div class="field"><label>Alert percentage</label><input id="budAlert" type="number" min="1" max="100" value="${b?.alertPercentage||75}"></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveBudgetBtn">Save budget</button></div>`,"");
  $("#saveBudgetBtn").onclick=()=>saveBudget(b);
}
function saveBudget(old){
  const name=$("#budName").value.trim(),amount=Number($("#budAmount").value),start=$("#budStart").value,end=$("#budEnd").value;
  if(!name||!(amount>0)||!start||(end&&end<start)){toast("Enter a valid name, amount, and date range","error");return}
  const item={id:old?.id||uid("bud"),name,category:$("#budCat").value,amount,period:$("#budPeriod").value,startDate:start,endDate:end,alertPercentage:Math.min(100,Math.max(1,Number($("#budAlert").value)||75))};
  if(old)storage.update("budgets",old.id,item);else state.budgets.push(item);storage.save(state);closeModal();toast("Budget saved","success");renderScreen();
}

function renderAccounts(){
  const total=state.accounts.reduce((n,a)=>n+Number(a.balance||0),0);
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Accounts</h1><p>Keep cash, banks, cards, wallets, and other accounts organized.</p></div><button class="btn primary" data-action="edit-account">＋ Add account</button></div>
  <div class="grid grid-3"><div class="card"><span class="stat-label">Total account balance</span><div class="stat-value">${money(total)}</div><span class="stat-meta">${state.accounts.length} accounts</span></div><div class="card"><span class="stat-label">Assets</span><div class="stat-value">${money(state.accounts.filter(a=>a.type!=="Credit card").reduce((n,a)=>n+a.balance,0))}</div></div><div class="card"><span class="stat-label">Credit accounts</span><div class="stat-value">${money(state.accounts.filter(a=>a.type==="Credit card").reduce((n,a)=>n+a.balance,0))}</div></div></div>
  <div class="grid grid-3 section-card">${state.accounts.map(a=>`<div class="card"><div class="chart-head"><div><div class="tx-icon" style="display:inline-grid;margin-right:8px">▣</div><span class="pill">${escapeHtml(a.type)}</span></div><div class="row-actions"><button class="btn icon small" data-action="edit-account" data-id="${a.id}">✎</button><button class="btn icon small" data-action="delete-account" data-id="${a.id}">×</button></div></div><h3 style="margin:6px 0">${escapeHtml(a.name)}</h3><div class="big-number">${money(a.balance,a.currency)}</div><span class="muted">${escapeHtml(a.currency)} · Updated today</span></div>`).join("")}</div>`;
}
function openAccountModal(id=null){
  const a=id?state.accounts.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${a?"Edit account":"Add account"}</h2><p>Starting balance is used as the account's local opening balance.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Account name *</label><input id="accName" value="${escapeHtml(a?.name||"")}"></div><div class="field"><label>Account type</label><select id="accType">${["Cash","Bank account","Credit card","Debit card","UPI wallet","Investment account","Savings account","Other"].map(x=>`<option ${x===(a?.type||"Bank account")?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="field"><label>Current / opening balance *</label><input id="accBalance" type="number" step=".01" value="${a?.balance??""}"></div><div class="field"><label>Currency</label><select id="accCurrency">${Object.keys(CURRENCIES).map(k=>`<option ${k===(a?.currency||state.settings.currency)?"selected":""}>${k}</option>`).join("")}</select></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveAccountBtn">Save account</button></div>`,"small");
  $("#saveAccountBtn").onclick=()=>saveAccount(a);
}
function saveAccount(old){
  const name=$("#accName").value.trim(),balance=Number($("#accBalance").value);
  if(!name||Number.isNaN(balance)){toast("Enter a valid account name and balance","error");return}
  const item={id:old?.id||uid("account"),name,type:$("#accType").value,balance,currency:$("#accCurrency").value,createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("accounts",old.id,item);else state.accounts.push(item);storage.save(state);closeModal();toast("Account saved","success");renderScreen();
}

function renderCategories(){
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Categories</h1><p>Organize expenses with icons and subcategories.</p></div><button class="btn primary" data-action="edit-category">＋ Add category</button></div>
  <div class="grid grid-3">${state.categories.map(c=>`<div class="card"><div class="chart-head"><div class="tx-icon">${c.icon}</div><div class="row-actions"><button class="btn icon small" data-action="edit-category" data-id="${c.id}">✎</button><button class="btn icon small" data-action="delete-category" data-id="${c.id}">×</button></div></div><h3>${escapeHtml(c.name)}</h3><p class="muted">${(c.subcategories||[]).length} subcategories</p><div class="legend">${(c.subcategories||[]).map(s=>`<span class="pill">${escapeHtml(s)}</span>`).join("")}</div></div>`).join("")}</div>`;
}
function openCategoryModal(id=null){
  const c=id?state.categories.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${c?"Edit category":"Add category"}</h2><p>Choose an icon and optional comma-separated subcategories.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Name *</label><input id="catName" value="${escapeHtml(c?.name||"")}"></div><div class="field"><label>Color</label><select id="catColor">${["primary","primary-2","success","warning","danger","muted"].map(x=>`<option ${x===(c?.color||"primary")?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="field full"><label>Icon</label><div class="icon-grid">${ICONS.map(i=>`<button type="button" class="icon-choice ${i===(c?.icon||"📦")?"selected":""}" data-icon="${i}">${i}</button>`).join("")}</div><input type="hidden" id="catIcon" value="${escapeHtml(c?.icon||"📦")}"></div>
  <div class="field full"><label>Subcategories</label><input id="catSubs" value="${escapeHtml((c?.subcategories||[]).join(", "))}" placeholder="Restaurants, Coffee, Delivery"></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveCatBtn">Save category</button></div>`);
  $$(".icon-choice").forEach(b=>b.onclick=()=>{$$(".icon-choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected");$("#catIcon").value=b.dataset.icon});
  $("#saveCatBtn").onclick=()=>saveCategory(c);
}
function saveCategory(old){
  const name=$("#catName").value.trim();if(!name){toast("Category name is required","error");return}
  const item={id:old?.id||uid("cat"),name,icon:$("#catIcon").value,color:$("#catColor").value,subcategories:$("#catSubs").value.split(",").map(x=>x.trim()).filter(Boolean),createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("categories",old.id,item);else state.categories.push(item);storage.save(state);closeModal();toast("Category saved","success");renderScreen();
}

function renderRecurring(){
  processRecurring();
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Recurring</h1><p>Templates for rent, salary, utilities, loans, and other repeated entries.</p></div><button class="btn primary" data-action="edit-recurring">＋ Add recurring</button></div>
  <div class="grid grid-2">${state.recurringTransactions.map(r=>`<div class="card"><div class="chart-head"><div><h3>${escapeHtml(r.name)}</h3><span class="pill">${escapeHtml(r.frequency)} · ${r.type}</span></div><div class="row-actions"><button class="btn icon small" data-action="edit-recurring" data-id="${r.id}">✎</button><button class="btn icon small" data-action="delete-recurring" data-id="${r.id}">×</button></div></div><div class="big-number ${r.type==="income"?"positive":"negative"}">${r.type==="income"?"+":"−"}${money(r.amount)}</div><div class="metric-row"><span>Category</span><strong>${escapeHtml(r.category)}</strong></div><div class="metric-row"><span>Next occurrence</span><strong>${fmtDate(r.nextOccurrence)}</strong></div><div class="metric-row"><span>Account</span><strong>${escapeHtml(accountName(r.accountId))}</strong></div></div>`).join("")||emptyState("No recurring items","Create a recurring transaction template.")}</div>`;
}
function openRecurringModal(id=null){
  const r=id?state.recurringTransactions.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${r?"Edit recurring":"Add recurring"}</h2><p>Due items are generated when the app is opened.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Name *</label><input id="recName" value="${escapeHtml(r?.name||"")}"></div><div class="field"><label>Amount *</label><input id="recAmount" type="number" min=".01" value="${r?.amount||""}"></div>
  <div class="field"><label>Type</label><select id="recType"><option ${r?.type!=="income"?"selected":""}>expense</option><option ${r?.type==="income"?"selected":""}>income</option></select></div><div class="field"><label>Category</label><select id="recCat">${state.categories.map(c=>`<option ${c.name===(r?.category||"Other")?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div>
  <div class="field"><label>Account</label><select id="recAccount">${state.accounts.map(a=>`<option value="${a.id}" ${a.id===(r?.accountId||state.settings.defaultAccount)?"selected":""}>${escapeHtml(a.name)}</option>`).join("")}</select></div>
  <div class="field"><label>Frequency</label><select id="recFreq">${["Daily","Weekly","Monthly","Yearly","Custom"].map(x=>`<option ${x===(r?.frequency||"Monthly")?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="field"><label>Start date</label><input id="recStart" type="date" value="${r?.startDate||today()}"></div><div class="field"><label>End date</label><input id="recEnd" type="date" value="${r?.endDate||""}"></div>
  <div class="field"><label>Next occurrence</label><input id="recNext" type="date" value="${r?.nextOccurrence||nextDate("Monthly",new Date().getDate())}"></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveRecBtn">Save recurring</button></div>`,"");
  $("#saveRecBtn").onclick=()=>saveRecurring(r);
}
function saveRecurring(old){
  const name=$("#recName").value.trim(),amount=Number($("#recAmount").value);if(!name||!(amount>0)){toast("Enter a name and positive amount","error");return}
  const item={id:old?.id||uid("rec"),name,amount,type:$("#recType").value,category:$("#recCat").value,accountId:$("#recAccount").value,frequency:$("#recFreq").value,startDate:$("#recStart").value,endDate:$("#recEnd").value,nextOccurrence:$("#recNext").value,active:true,createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("recurringTransactions",old.id,item);else state.recurringTransactions.push(item);storage.save(state);closeModal();toast("Recurring item saved","success");renderScreen();
}
function processRecurring(){
  let changed=false, guard=0; const todayStr=today();
  state.recurringTransactions.forEach(r=>{
    while(r.active && r.nextOccurrence && r.nextOccurrence<=todayStr && guard++<100){
      if(r.endDate && r.nextOccurrence>r.endDate){r.active=false;break}
      const exists=state.transactions.some(t=>t.recurringId===r.id&&t.date===r.nextOccurrence);
      if(!exists){const tx={id:uid("txn"),type:r.type,amount:r.amount,currency:state.settings.currency,title:r.name,category:r.category,subcategory:"",accountId:r.accountId,paymentMethod:r.type==="income"?"Bank Transfer":"Other",date:r.nextOccurrence,time:"09:00",notes:"Generated from recurring transaction",tags:["recurring"],location:"",attachment:null,reviewed:false,recurringId:r.id,createdAt:nowISO()};state.transactions.push(tx);adjustAccount(tx,1);changed=true;}
      r.nextOccurrence=advanceDate(r.nextOccurrence,r.frequency);changed=true;
    }
  });
  if(changed)storage.save(state);
}
function advanceDate(date,freq){const d=new Date(date+"T00:00:00");if(freq==="Daily")d.setDate(d.getDate()+1);else if(freq==="Weekly")d.setDate(d.getDate()+7);else if(freq==="Yearly")d.setFullYear(d.getFullYear()+1);else d.setMonth(d.getMonth()+1);return d.toISOString().slice(0,10)}

function renderSubscriptions(){
  const active=state.subscriptions.filter(s=>s.active),monthly=sum(active.filter(s=>s.cycle==="Monthly").map(s=>s.amount))+sum(active.filter(s=>s.cycle==="Yearly").map(s=>s.amount))/12;
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Subscriptions</h1><p>Know what renews next and how much recurring services cost.</p></div><button class="btn primary" data-action="edit-subscription">＋ Add subscription</button></div>
  <div class="grid grid-3"><div class="card"><span class="stat-label">Monthly cost</span><div class="stat-value">${money(monthly)}</div></div><div class="card"><span class="stat-label">Yearly cost</span><div class="stat-value">${money(monthly*12)}</div></div><div class="card"><span class="stat-label">Upcoming</span><div class="stat-value">${active.filter(s=>s.nextBilling>=today()).length}</div><span class="stat-meta">Active subscriptions</span></div></div>
  <div class="grid grid-2 section-card">${state.subscriptions.map(s=>`<div class="card"><div class="chart-head"><div><h3>${escapeHtml(s.name)}</h3><span class="pill">${s.active?"Active":"Cancelled"} · ${escapeHtml(s.cycle)}</span></div><div class="row-actions"><button class="btn icon small" data-action="edit-subscription" data-id="${s.id}">✎</button><button class="btn icon small" data-action="delete-subscription" data-id="${s.id}">×</button></div></div><div class="big-number">${money(s.amount)}</div><div class="metric-row"><span>Next billing</span><strong>${fmtDate(s.nextBilling)}</strong></div><div class="metric-row"><span>Category</span><strong>${escapeHtml(s.category)}</strong></div><div class="metric-row"><span>Account</span><strong>${escapeHtml(accountName(s.accountId))}</strong></div></div>`).join("")||emptyState("No subscriptions","Add services such as streaming, software, or cloud storage.")}</div>`;
}
function openSubscriptionModal(id=null){
  const s=id?state.subscriptions.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${s?"Edit subscription":"Add subscription"}</h2><p>Track active or cancelled subscriptions.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Name *</label><input id="subName" value="${escapeHtml(s?.name||"")}"></div><div class="field"><label>Amount *</label><input id="subAmount" type="number" min=".01" value="${s?.amount||""}"></div>
  <div class="field"><label>Billing cycle</label><select id="subCycle">${["Monthly","Yearly","Weekly"].map(x=>`<option ${x===(s?.cycle||"Monthly")?"selected":""}>${x}</option>`).join("")}</select></div><div class="field"><label>Next billing</label><input id="subNext" type="date" value="${s?.nextBilling||nextDate("Monthly",new Date().getDate())}"></div>
  <div class="field"><label>Category</label><select id="subCat">${state.categories.map(c=>`<option ${c.name===(s?.category||"Other")?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div><div class="field"><label>Account</label><select id="subAccount">${state.accounts.map(a=>`<option value="${a.id}" ${a.id===(s?.accountId||state.settings.defaultAccount)?"selected":""}>${escapeHtml(a.name)}</option>`).join("")}</select></div>
  <div class="field full"><label class="checkbox-line"><input id="subActive" type="checkbox" ${s?.active!==false?"checked":""}> Active subscription</label></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveSubBtn">Save subscription</button></div>`,"");
  $("#saveSubBtn").onclick=()=>saveSubscription(s);
}
function saveSubscription(old){
  const name=$("#subName").value.trim(),amount=Number($("#subAmount").value);if(!name||!(amount>0)){toast("Enter a name and positive amount","error");return}
  const item={id:old?.id||uid("sub"),name,amount,cycle:$("#subCycle").value,nextBilling:$("#subNext").value,category:$("#subCat").value,accountId:$("#subAccount").value,active:$("#subActive").checked,createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("subscriptions",old.id,item);else state.subscriptions.push(item);storage.save(state);closeModal();toast("Subscription saved","success");renderScreen();
}

function renderGoals(){
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Goals</h1><p>Turn savings targets into visible progress.</p></div><button class="btn primary" data-action="edit-goal">＋ Add goal</button></div>
  <div class="grid grid-2">${state.goals.map(g=>{const p=g.target?Math.min(100,g.current/g.target*100):0;const months=Math.max(1,monthsUntil(g.targetDate));const req=Math.max(0,(g.target-g.current)/months);return `<div class="card"><div class="chart-head"><div class="tx-icon">${g.icon}</div><div class="row-actions"><button class="btn icon small" data-action="edit-goal" data-id="${g.id}">✎</button><button class="btn icon small" data-action="delete-goal" data-id="${g.id}">×</button></div></div><h3>${escapeHtml(g.name)}</h3><div class="big-number">${money(g.current)}</div><div class="budget-line"><span>of ${money(g.target)}</span><span>${p.toFixed(0)}%</span></div><div class="progress"><span style="width:${p}%"></span></div><div class="metric-row"><span>Remaining</span><strong>${money(Math.max(0,g.target-g.current))}</strong></div><div class="metric-row"><span>Target date</span><strong>${fmtDate(g.targetDate)}</strong></div><div class="metric-row"><span>Required monthly saving</span><strong>${money(req)}</strong></div><button class="btn success" data-action="add-goal-money" data-id="${g.id}">＋ Add money</button></div>`}).join("")||emptyState("No goals","Create a savings goal for something important.")}</div>`;
}
function monthsUntil(date){const d=new Date(date+"T00:00:00"),n=new Date();return Math.max(1,(d.getFullYear()-n.getFullYear())*12+d.getMonth()-n.getMonth())}
function openGoalModal(id=null){
  const g=id?state.goals.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${g?"Edit goal":"Add goal"}</h2><p>Set a target amount and date.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Goal name *</label><input id="goalName" value="${escapeHtml(g?.name||"")}"></div><div class="field"><label>Target amount *</label><input id="goalTarget" type="number" min=".01" value="${g?.target||""}"></div><div class="field"><label>Current amount</label><input id="goalCurrent" type="number" min="0" value="${g?.current||0}"></div><div class="field"><label>Target date</label><input id="goalDate" type="date" value="${g?.targetDate||"2027-03-01"}"></div><div class="field"><label>Icon</label><select id="goalIcon">${["🛟","✈️","📱","🚗","🏠","📚","💰","🎯"].map(x=>`<option ${x===(g?.icon||"🎯")?"selected":""}>${x}</option>`).join("")}</select></div><div class="field"><label>Accent</label><select id="goalColor"><option>primary</option><option>primary-2</option><option>success</option></select></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveGoalBtn">Save goal</button></div>`,"small");
  $("#saveGoalBtn").onclick=()=>saveGoal(g);
}
function saveGoal(old){
  const name=$("#goalName").value.trim(),target=Number($("#goalTarget").value),current=Number($("#goalCurrent").value)||0;if(!name||!(target>0)||current<0){toast("Enter a valid goal","error");return}
  const item={id:old?.id||uid("goal"),name,target,current:Math.min(current,target),targetDate:$("#goalDate").value,icon:$("#goalIcon").value,color:$("#goalColor").value,createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("goals",old.id,item);else state.goals.push(item);storage.save(state);closeModal();toast("Goal saved","success");renderScreen();
}
function addGoalMoney(id){const g=state.goals.find(x=>x.id===id);if(!g)return;modal(`<div class="modal-head"><div><h2>Add money to ${escapeHtml(g.name)}</h2><p>Goal balances are tracked separately from account balances in this local version.</p></div><button class="close" data-action="close-modal">×</button></div><div class="field"><label>Amount</label><input id="goalAdd" type="number" min=".01" step=".01"></div><div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="goalAddBtn">Add</button></div>`,"small");$("#goalAddBtn").onclick=()=>{const n=Number($("#goalAdd").value);if(!(n>0)){toast("Enter a positive amount","error");return}storage.update("goals",id,{current:Math.min(g.target,g.current+n)});closeModal();toast("Goal updated","success");renderGoals();}}

function renderDebts(){
  const total=sum(state.debts.map(d=>d.total)),remaining=sum(state.debts.map(d=>d.remaining)),monthly=sum(state.debts.map(d=>d.minPayment));
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Debts</h1><p>Track loans, cards, and other obligations.</p></div><button class="btn primary" data-action="edit-debt">＋ Add debt</button></div>
  <div class="grid grid-3"><div class="card"><span class="stat-label">Total debt</span><div class="stat-value">${money(total)}</div></div><div class="card"><span class="stat-label">Remaining</span><div class="stat-value negative">${money(remaining)}</div></div><div class="card"><span class="stat-label">Minimum monthly payment</span><div class="stat-value">${money(monthly)}</div></div></div>
  <div class="grid grid-2 section-card">${state.debts.map(d=>{const p=d.total?100-(d.remaining/d.total*100):0;return `<div class="card"><div class="chart-head"><div><h3>${escapeHtml(d.name)}</h3><span class="pill">${escapeHtml(d.type)}</span></div><div class="row-actions"><button class="btn icon small" data-action="edit-debt" data-id="${d.id}">✎</button><button class="btn icon small" data-action="delete-debt" data-id="${d.id}">×</button></div></div><div class="big-number">${money(d.remaining)}</div><div class="budget-line"><span>of ${money(d.total)} remaining</span><span>${p.toFixed(0)}% paid</span></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,p))}%"></span></div><div class="metric-row"><span>Interest</span><strong>${d.interest}%</strong></div><div class="metric-row"><span>Minimum payment</span><strong>${money(d.minPayment)}</strong></div><div class="metric-row"><span>Due date</span><strong>${fmtDate(d.dueDate)}</strong></div></div>`}).join("")||emptyState("No debts","Add a loan or credit card balance to track payoff progress.")}</div>`;
}
function openDebtModal(id=null){
  const d=id?state.debts.find(x=>x.id===id):null;
  modal(`<div class="modal-head"><div><h2>${d?"Edit debt":"Add debt"}</h2><p>Record balances and payment terms.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="form-grid"><div class="field"><label>Debt name *</label><input id="debtName" value="${escapeHtml(d?.name||"")}"></div><div class="field"><label>Type</label><select id="debtType">${["Loan","Credit card","Personal debt","Other"].map(x=>`<option ${x===(d?.type||"Loan")?"selected":""}>${x}</option>`).join("")}</select></div>
  <div class="field"><label>Total amount *</label><input id="debtTotal" type="number" min=".01" value="${d?.total||""}"></div><div class="field"><label>Remaining amount *</label><input id="debtRemaining" type="number" min="0" value="${d?.remaining??""}"></div>
  <div class="field"><label>Interest rate %</label><input id="debtInterest" type="number" min="0" step=".01" value="${d?.interest||0}"></div><div class="field"><label>Minimum payment</label><input id="debtPayment" type="number" min="0" value="${d?.minPayment||0}"></div><div class="field"><label>Due date</label><input id="debtDue" type="date" value="${d?.dueDate||today()}"></div></div>
  <div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="saveDebtBtn">Save debt</button></div>`,"");
  $("#saveDebtBtn").onclick=()=>saveDebt(d);
}
function saveDebt(old){
  const name=$("#debtName").value.trim(),total=Number($("#debtTotal").value),remaining=Number($("#debtRemaining").value);if(!name||!(total>0)||remaining<0||remaining>total){toast("Check debt amounts","error");return}
  const item={id:old?.id||uid("debt"),name,type:$("#debtType").value,total,remaining,interest:Number($("#debtInterest").value)||0,minPayment:Number($("#debtPayment").value)||0,dueDate:$("#debtDue").value,createdAt:old?.createdAt||nowISO()};
  if(old)storage.update("debts",old.id,item);else state.debts.push(item);storage.save(state);closeModal();toast("Debt saved","success");renderScreen();
}

function renderReports(){
  const [from,to]=reportRangeDates(); const e=expenses(from,to),i=incomes(from,to), cats=categoryBreakdown(from,to), byAccount=groupBy(e,t=>accountName(t.accountId)), byPay=groupBy(e,t=>t.paymentMethod);
  const title={today:"Today",week:"This week",month:"This month",lastmonth:"Last month",year:"This year",custom:"Custom range"}[reportRange];
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Reports & analytics</h1><p>Understand where money goes across ${title.toLowerCase()}.</p></div></div>
  <div class="toolbar"><div class="segmented">${["today","week","month","lastmonth","year","custom"].map(x=>`<button class="${reportRange===x?"active":""}" data-report-range="${x}">${x==="lastmonth"?"Last month":x[0].toUpperCase()+x.slice(1)}</button>`).join("")}</div>${reportRange==="custom"?`<input type="date" id="reportFrom" value="${from}"><input type="date" id="reportTo" value="${to}"><button class="btn" id="applyReport">Apply</button>`:""}</div>
  <div class="grid grid-4"><div class="card"><span class="stat-label">Expenses</span><div class="stat-value negative">${money(sum(e))}</div></div><div class="card"><span class="stat-label">Income</span><div class="stat-value positive">${money(sum(i))}</div></div><div class="card"><span class="stat-label">Net cash flow</span><div class="stat-value">${money(sum(i)-sum(e))}</div></div><div class="card"><span class="stat-label">Transactions</span><div class="stat-value">${e.length+i.length}</div></div></div>
  <div class="dashboard-grid"><div class="card chart-card"><div class="chart-head"><h3>Spending by category</h3></div>${barChart(cats)}</div><div class="card chart-card"><div class="chart-head"><h3>Category mix</h3></div>${donutChart(cats)}</div></div>
  <div class="grid grid-2 section-card"><div class="card"><div class="chart-head"><h3>Spending by account</h3></div>${reportList(byAccount)}</div><div class="card"><div class="chart-head"><h3>Payment methods</h3></div>${reportList(byPay)}</div></div>
  <div class="card section-card"><div class="chart-head"><h3>Cash flow</h3><span class="pill">Income vs expenses</span></div>${cashFlowChart(from,to)}</div>
  <div class="grid grid-2 section-card"><div class="card"><h3 class="section-title">Top merchants</h3>${reportList(groupBy(e,t=>t.title).slice(0,8))}</div><div class="card"><h3 class="section-title">Budget performance</h3>${state.budgets.length?state.budgets.map(budgetMini).join(""):emptyState("No budgets","Create budgets to compare planned vs actual.")}</div></div>`;
  $$("[data-report-range]").forEach(b=>b.onclick=()=>{reportRange=b.dataset.reportRange;renderReports()});
  if($("#applyReport"))$("#applyReport").onclick=()=>{reportCustom={from:$("#reportFrom").value,to:$("#reportTo").value};renderReports()};
}
let reportCustom={from:monthKey(today())+"-01",to:today()};
function reportRangeDates(){
  const d=new Date(),t=today();
  if(reportRange==="today")return [t,t];
  if(reportRange==="week")return [startOfWeek().toISOString().slice(0,10),t];
  if(reportRange==="month")return [monthKey(t)+"-01",t];
  if(reportRange==="lastmonth"){const s=new Date(d.getFullYear(),d.getMonth()-1,1),e=new Date(d.getFullYear(),d.getMonth(),0);return [s.toISOString().slice(0,10),e.toISOString().slice(0,10)]}
  if(reportRange==="year")return [`${d.getFullYear()}-01-01`,t];
  return [reportCustom.from,reportCustom.to];
}
function groupBy(arr,keyFn){const o={};arr.forEach(x=>{const k=keyFn(x);o[k]=(o[k]||0)+Number(x.amount)});return Object.entries(o).sort((a,b)=>b[1]-a[1]).map(([name,value])=>({name,value}))}
function barChart(data){
  if(!data.length)return `<div class="empty">No data in this range.</div>`;const max=Math.max(...data.map(x=>x.value),1);
  return `<div class="bar-chart">${data.slice(0,8).map(x=>`<div class="bar-item"><span class="bar-value">${money(x.value)}</span><div class="bar" style="height:${Math.max(2,x.value/max*175)}px" title="${escapeHtml(x.name)}: ${money(x.value)}"></div><span class="bar-label">${escapeHtml(x.name.slice(0,12))}</span></div>`).join("")}</div>`;
}
function reportList(data){if(!data.length)return `<div class="empty">No data.</div>`;return data.map(x=>`<div class="metric-row"><span>${escapeHtml(x.name)}</span><strong>${money(x.value)}</strong></div>`).join("")}
function cashFlowChart(from,to){
  const e=groupDaily(expenses(from,to)),i=groupDaily(incomes(from,to)),keys=[...new Set([...Object.keys(e),...Object.keys(i)])].sort();if(!keys.length)return `<div class="empty">No cash flow data.</div>`;
  const max=Math.max(...keys.map(k=>Math.max(e[k]||0,i[k]||0)),1);
  return `<div class="bar-chart">${keys.slice(-14).map(k=>`<div class="bar-item"><div style="display:flex;gap:3px;align-items:end;height:180px"><div class="bar" style="height:${Math.max(2,(i[k]||0)/max*170)}px;background:var(--success)" title="Income ${money(i[k]||0)}"></div><div class="bar" style="height:${Math.max(2,(e[k]||0)/max*170)}px;background:var(--danger)" title="Expense ${money(e[k]||0)}"></div></div><span class="bar-label">${k.slice(5)}</span></div>`).join("")}</div><div class="legend"><div class="legend-row"><span class="dot" style="background:var(--success)"></span>Income</div><div class="legend-row"><span class="dot" style="background:var(--danger)"></span>Expenses</div></div>`;
}
function groupDaily(arr){const o={};arr.forEach(t=>o[t.date]=(o[t.date]||0)+t.amount);return o}

function renderSettings(){
  const tabs=[["appearance","Appearance"],["preferences","Preferences"],["notifications","Notifications"],["data","Data & privacy"],["security","Security"]];
  $("#screen").innerHTML=`<div class="page-head"><div><h1>Settings</h1><p>Customize SpendWise and manage your local data.</p></div></div>
  <div class="card"><div class="settings-grid"><div class="settings-menu">${tabs.map(([id,l])=>`<button class="${settingsTab===id?"active":""}" data-action="settings-tab" data-tab="${id}">${l}</button>`).join("")}</div><div>${settingsContent()}</div></div></div>`;
}
function settingsContent(){
  if(settingsTab==="appearance")return `<h3 class="section-title">Appearance</h3>
    <div class="setting-row"><div><h4>Theme</h4><p>Light, dark, or follow the device.</p></div><select data-action="set-theme"><option value="system" ${state.settings.theme==="system"?"selected":""}>System</option><option value="light" ${state.settings.theme==="light"?"selected":""}>Light</option><option value="dark" ${state.settings.theme==="dark"?"selected":""}>Dark</option></select></div>
    <div class="setting-row"><div><h4>Currency</h4><p>Used for new transactions and dashboard totals. No live exchange rates are used.</p></div><select data-action="set-currency">${Object.values(CURRENCIES).map(c=>`<option value="${c.code}" ${state.settings.currency===c.code?"selected":""}>${c.code} — ${c.symbol}</option>`).join("")}</select></div>
    <div class="setting-row"><div><h4>Accent color</h4><p>SpendWise currently uses its built-in indigo accent.</p></div><span class="pill">#4F46E5</span></div>`;
  if(settingsTab==="preferences")return `<h3 class="section-title">Preferences</h3><div class="form-grid" style="margin-top:10px">
    <div class="field"><label>Start screen</label><select id="setStart">${NAV.filter(x=>!["add"].includes(x[0])).map(x=>`<option value="${x[0]}" ${state.settings.startScreen===x[0]?"selected":""}>${x[2]}</option>`).join("")}</select></div>
    <div class="field"><label>Date format</label><select id="setDate"><option ${state.settings.dateFormat==="DD/MM/YYYY"?"selected":""}>DD/MM/YYYY</option><option ${state.settings.dateFormat==="MM/DD/YYYY"?"selected":""}>MM/DD/YYYY</option><option ${state.settings.dateFormat==="YYYY-MM-DD"?"selected":""}>YYYY-MM-DD</option></select></div>
    <div class="field"><label>Week starts on</label><select id="setWeek"><option ${state.settings.weekStarts==="Monday"?"selected":""}>Monday</option><option ${state.settings.weekStarts==="Sunday"?"selected":""}>Sunday</option></select></div>
    <div class="field"><label>Default account</label><select id="setAccount">${state.accounts.map(a=>`<option value="${a.id}" ${state.settings.defaultAccount===a.id?"selected":""}>${escapeHtml(a.name)}</option>`).join("")}</select></div>
    <div class="field"><label>Default category</label><select id="setCat">${state.categories.map(c=>`<option ${state.settings.defaultCategory===c.name?"selected":""}>${escapeHtml(c.name)}</option>`).join("")}</select></div></div><div class="form-actions"><button class="btn primary" data-action="save-settings">Save preferences</button></div>`;
  if(settingsTab==="notifications")return `<h3 class="section-title">Notifications</h3>${settingSwitch("budgetAlerts","Budget alerts","Alert when budgets reach their configured threshold.")}${settingSwitch("recurringAlerts","Recurring payment alerts","Notify about upcoming recurring transactions.")}${settingSwitch("subscriptionAlerts","Subscription alerts","Notify about upcoming subscription payments.")}${settingSwitch("monthlySummary","Monthly summary","Show a local monthly spending summary when implemented.")}`;
  if(settingsTab==="data")return `<h3 class="section-title">Data & privacy</h3><div class="notice" style="margin:10px 0">Your financial data is stored locally in this browser using LocalStorage. SpendWise does not send it to a server in this version. Browser storage can be cleared by browser settings, so export backups are recommended.</div>
    <div class="head-actions"><button class="btn" data-action="export-json">Export JSON</button><button class="btn" data-action="export-csv">Export CSV</button><button class="btn" data-action="import-json">Import JSON</button></div>
    <input id="jsonImport" type="file" accept=".json,application/json" hidden><div class="card danger-zone" style="margin-top:16px"><h3>Demo & reset</h3><p class="muted">Demo data is clearly labeled. Resetting recreates the original sample wallet and removes current local data.</p><button class="btn" data-action="reset-demo">Reset demo data</button> <button class="btn danger" data-action="clear-data">Clear all data</button></div>`;
  return `<h3 class="section-title">Security</h3><div class="notice" style="margin:10px 0">PIN lock, biometric authentication, and app lock are intentionally placeholders. They are not implemented and should not be treated as security features.</div>${["PIN lock","Biometric authentication","App lock"].map(x=>`<div class="setting-row"><div><h4>${x}</h4><p>Future backend/device-security integration.</p></div><button class="switch" disabled aria-label="${x} unavailable"></button></div>`).join("")}`;
}
function settingSwitch(key,title,desc){return `<div class="setting-row"><div><h4>${title}</h4><p>${desc}</p></div><button class="switch ${state.settings[key]?"on":""}" data-toggle="${key}" aria-label="${title}"></button></div>`}
document.addEventListener("click",e=>{const s=e.target.closest("[data-toggle]");if(s){const k=s.dataset.toggle;state.settings[k]=!state.settings[k];storage.save(state);renderSettings();toast("Preference updated","success")}});

function saveSettings(){
  state.settings.startScreen=$("#setStart").value;state.settings.dateFormat=$("#setDate").value;state.settings.weekStarts=$("#setWeek").value;state.settings.defaultAccount=$("#setAccount").value;state.settings.defaultCategory=$("#setCat").value;storage.save(state);toast("Preferences saved","success");renderSettings();
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});downloadBlob(blob,`spendwise-backup-${today()}.json`);toast("JSON backup exported","success");
}
function exportCSV(rows=state.transactions){
  const headers=["id","type","amount","currency","title","category","subcategory","account","paymentMethod","date","time","notes","tags","location"];
  const lines=[headers.join(",")].concat(rows.map(t=>headers.map(h=>csvEscape(h==="account"?accountName(t.accountId):h==="tags"?(t.tags||[]).join("|"):t[h])).join(",")));
  downloadBlob(new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),`spendwise-transactions-${today()}.csv`);toast("CSV exported","success");
}
function csvEscape(v){const s=String(v??"");return `"${s.replace(/"/g,'""')}"`}
function downloadBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function strongClearData(){
  modal(`<div class="modal-head"><div><h2>Clear all data?</h2><p>This permanently removes all SpendWise data stored in this browser.</p></div><button class="close" data-action="close-modal">×</button></div><div class="notice">This cannot be undone unless you have an exported backup.</div><div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn danger" id="clearConfirm">Clear everything</button></div>`,"small");
  $("#clearConfirm").onclick=()=>{localStorage.removeItem(STORAGE_KEY);state={version:1,users:[],accounts:[],transactions:[],categories:[],budgets:[],recurringTransactions:[],subscriptions:[],goals:[],debts:[],notifications:[],settings:{theme:"system",currency:"INR",dateFormat:"DD/MM/YYYY",startScreen:"dashboard",weekStarts:"Monday",defaultAccount:"",defaultCategory:"Other",budgetAlerts:true,recurringAlerts:true,subscriptionAlerts:true,monthlySummary:true,demo:false}};storage.save(state);closeModal();navigate("dashboard");toast("All local data cleared","success")}
}
function resetDemo(){state=seedData();storage.save(state);closeModal();navigate("dashboard");toast("Demo data restored","success")}

function openTransactionDetail(id){
  const t=state.transactions.find(x=>x.id===id);if(!t)return;
  modal(`<div class="modal-head"><div><h2>${escapeHtml(t.title)}</h2><p>${escapeHtml(t.category)} · ${fmtDate(t.date)}</p></div><button class="close" data-action="close-modal">×</button></div>
    <div class="big-number ${t.type==="income"?"positive":"negative"}">${t.type==="income"?"+":"−"}${money(t.amount,t.currency)}</div>
    <div class="detail-grid" style="margin-top:16px"><div class="detail-item"><small>Category</small><strong>${escapeHtml(t.category)}${t.subcategory?" · "+escapeHtml(t.subcategory):""}</strong></div><div class="detail-item"><small>Account</small><strong>${escapeHtml(accountName(t.accountId))}</strong></div><div class="detail-item"><small>Date & time</small><strong>${fmtDate(t.date)} · ${escapeHtml(t.time||"")}</strong></div><div class="detail-item"><small>Payment method</small><strong>${escapeHtml(t.paymentMethod)}</strong></div><div class="detail-item"><small>Tags</small><strong>${escapeHtml((t.tags||[]).join(", ")||"—")}</strong></div><div class="detail-item"><small>Location</small><strong>${escapeHtml(t.location||"—")}</strong></div></div>
    <div class="detail-item" style="margin-top:12px"><small>Notes</small><strong>${escapeHtml(t.notes||"No notes")}</strong></div>
    ${t.attachment?`<div style="margin-top:12px"><small class="muted">Receipt</small><img src="${t.attachment.data}" alt="Receipt" style="max-width:100%;max-height:240px;object-fit:contain;border-radius:12px;margin-top:7px"></div>`:""}
    <div class="form-actions"><button class="btn" data-action="mark-reviewed" data-id="${t.id}">✓ Mark reviewed</button><button class="btn" data-action="duplicate-tx" data-id="${t.id}">⧉ Duplicate</button><button class="btn" data-action="edit-tx" data-id="${t.id}">✎ Edit</button><button class="btn danger" data-action="delete-tx" data-id="${t.id}">Delete</button></div>`);
}
function openGlobalSearch(){
  modal(`<div class="modal-head"><div><h2>Global search</h2><p>Search transactions, accounts, categories, merchants, notes, and tags.</p></div><button class="close" data-action="close-search">×</button></div><div class="field"><label>Search</label><input id="globalSearch" autofocus placeholder="Try “Amazon”, “Food”, or “UPI”"></div><div id="globalResults" class="list" style="margin-top:10px"></div>`);
  const input=$("#globalSearch"),out=$("#globalResults");
  const render=()=>{const q=input.value.trim().toLowerCase();if(!q){out.innerHTML=`<div class="empty">Start typing to search your local wallet.</div>`;return}
    const tx=state.transactions.filter(t=>[t.title,t.category,t.notes,(t.tags||[]).join(" "),t.paymentMethod].join(" ").toLowerCase().includes(q)).slice(0,8);
    const acc=state.accounts.filter(a=>a.name.toLowerCase().includes(q)).slice(0,5),cat=state.categories.filter(c=>c.name.toLowerCase().includes(q)).slice(0,5);
    out.innerHTML=(tx.length?`<h4>Transactions</h4>${tx.map(txRow).join("")}`:"")+(acc.length?`<h4>Accounts</h4>${acc.map(a=>`<div class="metric-row"><span>▣ ${escapeHtml(a.name)}</span><strong>${money(a.balance)}</strong></div>`).join("")}`:"")+(cat.length?`<h4>Categories</h4>${cat.map(c=>`<div class="metric-row"><span>${c.icon} ${escapeHtml(c.name)}</span><strong>${(c.subcategories||[]).length} subcategories</strong></div>`).join("")}`:"")||`<div class="empty">No results.</div>`};
  input.oninput=render;render();
}
function openNotifications(){
  const notes=[...state.notifications].sort((a,b)=>b.date.localeCompare(a.date));
  modal(`<div class="modal-head"><div><h2>Notifications</h2><p>Local alerts and reminders.</p></div><button class="close" data-action="close-modal">×</button></div>${notes.length?notes.map(n=>`<div class="notification-item ${n.read?"":"unread"}"><div class="insight-icon">${n.type==="budget"?"⚠":"♢"}</div><div><p><strong>${escapeHtml(n.title)}</strong> — ${escapeHtml(n.message)}</p><small>${new Date(n.date).toLocaleString()}</small></div></div>`).join(""):emptyState("No notifications","You're all caught up.",null)}<div class="form-actions"><button class="btn" data-action="mark-all-read">Mark all read</button></div>`);
  state.notifications.forEach(n=>n.read=true);storage.save(state);updateNotificationDot();
}
function updateNotificationDot(){const unread=state.notifications.some(n=>!n.read);$("#notificationDot").style.display=unread?"block":"none"}
function processBudgetNotifications(){
  state.budgets.forEach(b=>{const p=b.amount?budgetSpent(b)/b.amount*100:0;if(p>=b.alertPercentage){const key=`budget-${b.id}-${Math.floor(p/10)}`;if(!state.notifications.some(n=>n.key===key)){state.notifications.push({id:uid("note"),key,title:p>=100?"Budget exceeded":"Budget alert",message:`${b.name} is at ${p.toFixed(0)}% of its ${money(b.amount)} limit.`,date:nowISO(),read:false,type:"budget"})}}});storage.save(state);updateNotificationDot();
}

document.addEventListener("change",e=>{
  if(e.target.id==="jsonImport")handleImport(e.target.files[0]);
});
function handleImport(file){
  if(!file)return;const reader=new FileReader();reader.onload=()=>{try{const incoming=JSON.parse(reader.result);previewImport(incoming)}catch{toast("Invalid JSON backup","error")}};reader.readAsText(file);
}
function previewImport(incoming){
  const keys=["accounts","transactions","categories","budgets","recurringTransactions","subscriptions","goals","debts","notifications","settings"];
  if(!incoming || !keys.every(k=>Array.isArray(incoming[k])||k==="settings")){toast("This does not look like a SpendWise backup","error");return}
  modal(`<div class="modal-head"><div><h2>Import preview</h2><p>Review what will replace your current local dataset.</p></div><button class="close" data-action="close-modal">×</button></div>
  <div class="status-grid">${keys.filter(k=>k!=="settings").map(k=>`<div class="mini-stat"><small>${k}</small><strong>${incoming[k].length}</strong></div>`).join("")}</div><div class="notice" style="margin-top:14px">Import replaces the current local data. Export a backup first if you want to keep it.</div><div class="form-actions"><button class="btn" data-action="close-modal">Cancel</button><button class="btn primary" id="importConfirm">Replace & import</button></div>`,"small");
  $("#importConfirm").onclick=()=>{state={...incoming,version:1};storage.save(state);closeModal();navigate("dashboard");toast("Backup imported","success")}
}

function registerPWA(){
  if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(e=>console.warn("Service worker registration failed",e));
}
function init(){
  applyTheme();renderNav();renderScreen();processBudgetNotifications();updateNotificationDot();registerPWA();
  window.addEventListener("storage",()=>{state=storage.load();renderScreen()});
  window.addEventListener("error",e=>{console.error(e.error||e.message);toast("Something went wrong. Your data is still stored locally.","error")});
}
init();
})();