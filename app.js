const SUPABASE_URL = "https://ixnlxbonzjoysecwtrkj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Qf5rsKWOKKc_gOiLF6AD4A_wSsOOHm4";
const WEEKLY_QUOTA = 5;
const TEAM = [
  {name:"Andrea", smart:"G V", trcor:"NO", drink:"Caffè"},
  {name:"Valentina", smart:"G V", trcor:"NO", drink:"Caffè/Cappuccino"},
  {name:"Matteo T", smart:"G V", trcor:"SI", drink:"Caffè"},
  {name:"Matteo F", smart:"G V", trcor:"SI", drink:"Cappuccino"},
  {name:"Daniele", smart:"G V", trcor:"NO", drink:"Caffè"},
  {name:"Valerio", smart:"L V", trcor:"NO", drink:"Cappuccino"},
  {name:"Francesco", smart:"L V", trcor:"NO", drink:"Caffè"},
  {name:"Riccardo", smart:"L V", trcor:"SI", drink:"Caffè"},
  {name:"Alessia", smart:"L V", trcor:"SI", drink:"Cappuccino"},
  {name:"Giorgia G", smart:"L V", trcor:"NO", drink:"Caffè"},
  {name:"Giorgia M", smart:"L V", trcor:"NO", drink:"Caffè"}
];
const PRICE = {"Caffè":1.20,"Cappuccino":1.50,"Cornetto":1.00,"Tramezzino":2.70};
const $ = (id) => document.getElementById(id);
let supabase = null, currentUser = null, members = [], expenses = [], payments = [], activeTab = "expense";
const euro = (n) => new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(n||0));
const dateISO = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const monthStart = (month) => `${month}-01`;
const monthEnd = (month) => { const [y,m]=month.split("-").map(Number); return dateISO(new Date(y,m,0)); };
const monthLabel = (month) => new Date(`${month}-01T12:00:00`).toLocaleDateString("it-IT",{month:"long",year:"numeric"});
const esc = (s) => String(s??"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function toast(msg,error=false){const el=$("toast");el.textContent=msg;el.classList.remove("hidden","error");if(error)el.classList.add("error");setTimeout(()=>el.classList.add("hidden"),3400)}
function message(id,msg,error=false){const el=$(id);el.textContent=msg;el.classList.toggle("error",error)}
function configReady(){
  try{
    const url=new URL(SUPABASE_URL);
    const validProtocol=url.protocol==="https:"||(url.protocol==="http:"&&["localhost","127.0.0.1"].includes(url.hostname));
    return validProtocol&&url.pathname==="/"&&!url.search&&!url.hash&&SUPABASE_ANON_KEY.length>20&&!SUPABASE_URL.includes("INSERISCI_")&&!SUPABASE_ANON_KEY.includes("INSERISCI_");
  }catch{return false}
}
function setView(view){$("loginView").classList.toggle("hidden",view!=="login");$("appView").classList.toggle("hidden",view!=="app");$("userArea").classList.toggle("hidden",view!=="app");}
function setTodayDefaults(){const today=dateISO();$("expenseDate").value=today;$("paymentDate").value=today;const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));$("paymentWeek").value=dateISO(d);$("monthPicker").value=today.slice(0,7)}
function setupProductUI(){const update=()=>{$("expenseTotal").textContent=euro((Number($("expenseQty").value)||0)*(Number($("expensePrice").value)||0))};$("expenseProduct").addEventListener("change",()=>{const p=$("expenseProduct").value;$("expensePrice").value=PRICE[p].toFixed(2);$("expenseCategory").value=p==="Cornetto"?"Cornetti":p==="Tramezzino"?"Tramezzini":"Bevande";update()});$("expenseQty").addEventListener("input",update);$("expensePrice").addEventListener("input",update);$("expenseCategory").addEventListener("change",()=>{const c=$("expenseCategory").value;const p=c==="Cornetti"?"Cornetto":c==="Tramezzini"?"Tramezzino":"Caffè";$("expenseProduct").value=p;$("expensePrice").value=PRICE[p].toFixed(2);update()});}
function renderMembers(){const select=$("paymentMember");select.innerHTML=members.map(m=>`<option value="${esc(m.id)}">${esc(m.name)}</option>`).join("")}
async function loadMembers(){const {data,error}=await supabase.from("members").select("*").order("name");if(error)throw error;members=data||[];renderMembers()}
async function loadData(){const month=$("monthPicker").value;const start=monthStart(month),end=monthEnd(month);const [e,p,allE,allP]=await Promise.all([
  supabase.from("expenses").select("*").gte("spent_on",start).lte("spent_on",end).order("spent_on",{ascending:false}).order("created_at",{ascending:false}),
  supabase.from("payments").select("*, members(name)").gte("paid_on",start).lte("paid_on",end).order("paid_on",{ascending:false}).order("created_at",{ascending:false}),
  supabase.from("expenses").select("spent_on,amount"),
  supabase.from("payments").select("paid_on,amount")
]);for(const x of [e,p,allE,allP])if(x.error)throw x.error;expenses=e.data||[];payments=p.data||[];renderDashboard(allE.data||[],allP.data||[])}
function monthTotal(rows){return rows.reduce((s,r)=>s+Number(r.amount||0),0)}
function renderDashboard(allExpenses,allPayments){
  const month=$("monthPicker").value;const income=monthTotal(payments),out=monthTotal(expenses),balance=income-out;
  $("monthBalance").textContent=euro(balance);$("monthBalanceNote").textContent=balance<0?"Le spese superano le quote nel periodo":"Entrate meno spese nel mese selezionato";
  $("monthIncome").textContent=euro(income);$("incomeCount").textContent=`${payments.length} versament${payments.length===1?"o":"i"} registrat${payments.length===1?"o":"i"}`;
  $("monthExpenses").textContent=euro(out);$("expenseCount").textContent=`${expenses.length} acquist${expenses.length===1?"o":"i"} registrat${expenses.length===1?"o":"i"}`;
  // Quota pendente stimata: membri attivi x quota x settimane del mese meno pagamenti effettivi del mese.
  const [y,m]=month.split("-").map(Number),days=new Date(y,m,0).getDate(),firstDow=new Date(y,m-1,1).getDay()||7,weeks=Math.ceil((days+firstDow-1)/7);
  const expected=members.length*WEEKLY_QUOTA*weeks;const pending=Math.max(0,expected-income);
  $("pendingAmount").textContent=euro(pending);$("pendingCount").textContent=`stima su ${weeks} settimane · ${members.length} colleghi`;
  $("balanceTrack").style.width=`${Math.max(0,Math.min(100,income?balance/income*100:0))}%`;
  const cats=[{name:"Bevande",color:"",sum:0},{name:"Cornetti",color:"orange",sum:0},{name:"Tramezzini",color:"blue",sum:0}];
  expenses.forEach(e=>{const c=cats.find(x=>x.name===e.category);if(c)c.sum+=Number(e.amount||0)});
  $("categoryBreakdown").innerHTML=cats.map(c=>{const pct=out?c.sum/out*100:0;return `<div><div class="breakdown-item-top"><span>${c.name}</span><strong>${euro(c.sum)}</strong></div><div class="bar ${c.color}"><span style="width:${pct}%"></span></div></div>`}).join("");
  $("breakdownTotal").textContent=euro(out);
  renderHistory(allExpenses,allPayments,month);renderMovements(month);
  $("lastUpdated").textContent=`Aggiornato: ${new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}`;
}
function renderHistory(allExpenses,allPayments,currentMonth){
  const totals={};const ensure=(m)=>totals[m]||(totals[m]={income:0,out:0});
  allExpenses.forEach(r=>{const m=r.spent_on.slice(0,7);ensure(m).out+=Number(r.amount||0)});
  allPayments.forEach(r=>{const m=r.paid_on.slice(0,7);ensure(m).income+=Number(r.amount||0)});
  ensure(currentMonth);const months=Object.keys(totals).sort().reverse().slice(0,6);
  $("monthlyHistory").innerHTML=months.map(m=>{const t=totals[m],b=t.income-t.out;return `<div class="history-row"><div><div class="history-month">${esc(monthLabel(m))}</div><div class="history-sub">Entrate ${euro(t.income)} · Spese ${euro(t.out)}</div></div><div class="history-amount ${b<0?"negative":"positive"}">${euro(b)}</div></div>`}).join("")||`<div class="empty-state">Lo storico comparirà dopo i primi movimenti.</div>`;
}
function renderMovements(month){
  const rows=[
    ...payments.map(p=>({id:p.id,table:"payments",date:p.paid_on,type:"Quota",category:p.members?.name||"Collega",note:p.note||"",amount:Number(p.amount),direction:"in"})),
    ...expenses.map(e=>({id:e.id,table:"expenses",date:e.spent_on,type:e.product,category:e.category,note:e.note||"",amount:Number(e.amount),direction:"out"}))
  ].sort((a,b)=>b.date.localeCompare(a.date));
  $("movementsBody").innerHTML=rows.length?rows.map(r=>`<tr><td>${new Date(`${r.date}T12:00:00`).toLocaleDateString("it-IT")}</td><td><span class="type-pill ${r.direction==="out"?"expense":""}">${esc(r.type)}</span></td><td>${esc(r.category)}</td><td>${esc(r.note||"—")}</td><td class="align-right ${r.direction==="in"?"amount-in":"amount-out"}">${r.direction==="in"?"+":"−"} ${euro(r.amount)}</td><td><button class="delete-movement" title="Elimina movimento" aria-label="Elimina movimento" data-table="${r.table}" data-id="${r.id}">×</button></td></tr>`).join(""):`<tr><td colspan="6" class="empty-state">Nessun movimento per ${esc(monthLabel(month))}.</td></tr>`;
}
function switchTab(tab){activeTab=tab;$("expenseForm").classList.toggle("hidden",tab!=="expense");$("paymentForm").classList.toggle("hidden",tab!=="payment");document.querySelectorAll(".tab").forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active))});message("actionMessage","")}
async function handleLogin(e){e.preventDefault();if(!supabase)return;message("loginMessage","Invio del link in corso…");const email=$("emailInput").value.trim();const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});if(error){message("loginMessage",error.message,true);return}message("loginMessage","Se l'indirizzo è autorizzato, riceverai un link di accesso via email. Controlla anche la cartella spam.")}
async function handleExpense(e){e.preventDefault();const product=$("expenseProduct").value,category=$("expenseCategory").value,qty=Number($("expenseQty").value),unit=Number($("expensePrice").value);if(!qty||qty<1||unit<0){message("actionMessage","Controlla quantità e prezzo.",true);return}const payload={spent_on:$("expenseDate").value,category,product,quantity:qty,unit_price:unit,amount:Math.round(qty*unit*100)/100,note:$("expenseNote").value.trim(),created_by:currentUser.id};const {error}=await supabase.from("expenses").insert(payload);if(error){message("actionMessage",error.message,true);return}e.target.reset();$("expenseDate").value=dateISO();$("expenseQty").value=1;$("expenseProduct").value="Caffè";$("expenseCategory").value="Bevande";$("expensePrice").value=PRICE["Caffè"].toFixed(2);$("expenseTotal").textContent=euro(PRICE["Caffè"]);message("actionMessage","Spesa registrata correttamente.");await loadData();toast("Spesa aggiunta alla cassa")}
async function handlePayment(e){e.preventDefault();const amount=Number($("paymentAmount").value);if(amount<=0){message("actionMessage","Inserisci un importo valido.",true);return}const payload={paid_on:$("paymentDate").value,week_start:$("paymentWeek").value,member_id:$("paymentMember").value,amount,note:$("paymentNote").value.trim(),created_by:currentUser.id};const {error}=await supabase.from("payments").insert(payload);if(error){message("actionMessage",error.message,true);return}e.target.reset();$("paymentDate").value=dateISO();$("paymentWeek").value=weekStartISO();$("paymentAmount").value=WEEKLY_QUOTA.toFixed(2);message("actionMessage","Versamento registrato correttamente.");await loadData();toast("Quota registrata")}
function weekStartISO(){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return dateISO(d)}
async function deleteMovement(table,id){if(!confirm("Vuoi eliminare questo movimento? L'operazione non può essere annullata."))return;const {error}=await supabase.from(table).delete().eq("id",id);if(error){toast("Errore: "+error.message,true);return}await loadData();toast("Movimento eliminato")}
function exportCSV(){const rows=[["Data","Tipo","Categoria/collega","Nota","Entrata","Uscita"],...payments.map(p=>[p.paid_on,"Quota",p.members?.name||"",p.note||"",Number(p.amount).toFixed(2),""]),...expenses.map(e=>[e.spent_on,e.product,e.category,e.note||"","",Number(e.amount).toFixed(2)])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`fondo-bar-${$("monthPicker").value}.csv`;a.click();URL.revokeObjectURL(a.href)}
async function showApp(user){currentUser=user;$("userEmail").textContent=user.email||"";setView("app");try{await loadMembers();await loadData()}catch(err){toast("Errore caricamento dati: "+err.message,true)}}
async function boot(){
  setTodayDefaults();setupProductUI();
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  $("loginForm").addEventListener("submit",handleLogin);$("expenseForm").addEventListener("submit",handleExpense);$("paymentForm").addEventListener("submit",handlePayment);
  $("monthPicker").addEventListener("change",()=>loadData().catch(e=>toast(e.message,true)));
  $("exportBtn").addEventListener("click",exportCSV);
  $("movementsBody").addEventListener("click",e=>{const b=e.target.closest("[data-table]");if(b)deleteMovement(b.dataset.table,b.dataset.id)});
  $("logoutBtn").addEventListener("click",async()=>{await supabase.auth.signOut();setView("login")});
  if(!configReady()){$("setupNotice").classList.remove("hidden");setView("login");$("loginForm").querySelector("button").disabled=true;$("loginForm").querySelector("button").textContent="Completa prima la configurazione";return}
  supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{session}}=await supabase.auth.getSession();
  if(session)await showApp(session.user);else setView("login");
  supabase.auth.onAuthStateChange(async(_event,session)=>{if(session)await showApp(session.user);else{currentUser=null;setView("login")}});
}
document.addEventListener("DOMContentLoaded",boot);
