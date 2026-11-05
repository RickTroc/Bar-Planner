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
let sb = null, currentUser = null, myMemberId = null, needsPassword = false, members = [], expenses = [], payments = [], activeTab = "expense";
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
async function loadMembers(){const {data,error}=await sb.from("members").select("id,name").order("name");if(error)throw error;members=data||[];const {data:mine}=await sb.rpc("my_member_id");myMemberId=mine||null;renderMembers();if(myMemberId)$("paymentMember").value=myMemberId}
async function loadData(){const month=$("monthPicker").value;const start=monthStart(month),end=monthEnd(month);const [e,p,allE,allP]=await Promise.all([
  sb.from("expenses").select("*").gte("spent_on",start).lte("spent_on",end).order("spent_on",{ascending:false}).order("created_at",{ascending:false}),
  sb.from("payments").select("*, members(name)").gte("paid_on",start).lte("paid_on",end).order("paid_on",{ascending:false}).order("created_at",{ascending:false}),
  sb.from("expenses").select("spent_on,amount"),
  sb.from("payments").select("paid_on,amount,member_id,week_start")
]);for(const x of [e,p,allE,allP])if(x.error)throw x.error;expenses=e.data||[];payments=p.data||[];renderDashboard(allE.data||[],allP.data||[])}
function monthTotal(rows){return rows.reduce((s,r)=>s+Number(r.amount||0),0)}
function renderDashboard(allExpenses,allPayments){
  const month=$("monthPicker").value;const income=monthTotal(payments),out=monthTotal(expenses),balance=income-out;
  $("monthBalance").textContent=euro(balance);$("monthBalanceNote").textContent=balance<0?"Le spese superano le quote nel periodo":"Entrate meno spese nel mese selezionato";
  $("monthIncome").textContent=euro(income);$("incomeCount").textContent=`${payments.length} versament${payments.length===1?"o":"i"} registrat${payments.length===1?"o":"i"}`;
  const end=monthEnd(month),cashIn=monthTotal(allPayments.filter(r=>r.paid_on<=end)),cashOut=monthTotal(allExpenses.filter(r=>r.spent_on<=end)),cash=cashIn-cashOut;
  $("totalCash").textContent=euro(cash);$("totalCash").classList.toggle("negative",cash<0);$("totalCashNote").textContent=`Quote ${euro(cashIn)} − spese ${euro(cashOut)} fino a ${monthLabel(month)}`;
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
  renderHistory(allExpenses,allPayments,month);renderMovements(month);renderGame(allExpenses,allPayments,month);
  $("lastUpdated").textContent=`Aggiornato: ${new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"})}`;
}
const LEVELS=[
  {name:"Caffè Singolo",icon:"☕",min:0},{name:"Doppio Espresso",icon:"⚡",min:50},{name:"Cappuccino Maestro",icon:"🥛",min:150},
  {name:"Barista Pro",icon:"🧑‍🍳",min:350},{name:"Maestro Torrefattore",icon:"🔥",min:700},{name:"Leggenda del Bar",icon:"👑",min:1200}
];
const shiftWeek=(iso,n)=>{const d=new Date(`${iso}T12:00:00`);d.setDate(d.getDate()+n*7);return dateISO(d)};
function memberStreak(weeks){
  let w=weekStartISO(),n=0;if(!weeks.has(w))w=shiftWeek(w,-1);
  while(weeks.has(w)){n++;w=shiftWeek(w,-1)}return n;
}
function renderGame(allExpenses,allPayments,month){
  const thisWeek=weekStartISO();
  const total=monthTotal(allPayments);
  let li=0;LEVELS.forEach((l,i)=>{if(total>=l.min)li=i});
  const cur=LEVELS[li],next=LEVELS[li+1];
  $("levelIcon").textContent=cur.icon;$("levelName").textContent=`Livello ${li+1} · ${cur.name}`;
  $("levelXp").textContent=`${euro(total)} versati in totale`;
  $("levelTrack").style.width=`${next?Math.min(100,(total-cur.min)/(next.min-cur.min)*100):100}%`;
  $("levelNote").textContent=next?`Mancano ${euro(next.min-total)} per diventare “${next.name}” ${next.icon}`:"Livello massimo raggiunto: il bar è leggendario!";
  $("gameWeekBadge").textContent=`Settimana dal ${new Date(`${thisWeek}T12:00:00`).toLocaleDateString("it-IT",{day:"numeric",month:"short"})}`;

  const byMember={};members.forEach(m=>byMember[m.id]={id:m.id,name:m.name,month:0,weeks:new Set(),total:0});
  allPayments.forEach(p=>{const r=byMember[p.member_id];if(!r)return;r.total+=Number(p.amount||0);if(p.week_start)r.weeks.add(p.week_start);if(p.paid_on&&p.paid_on.slice(0,7)===month)r.month+=Number(p.amount||0)});
  const rows=Object.values(byMember).map(r=>({...r,streak:memberStreak(r.weeks)})).sort((a,b)=>b.month-a.month||b.streak-a.streak||a.name.localeCompare(b.name));
  const medals=["🥇","🥈","🥉"],max=Math.max(1,...rows.map(r=>r.month));
  $("leaderboard").innerHTML=rows.map((r,i)=>`<div class="lb-row${r.month&&i<3?" top":""}${r.id===myMemberId?" me":""}"><span class="lb-pos">${r.month&&medals[i]?medals[i]:i+1}</span><div class="lb-main"><div class="lb-line"><strong>${esc(r.name)}${r.id===myMemberId?`<span class="me-tag">TU</span>`:""}</strong><span>${euro(r.month)}</span></div><div class="bar"><span style="width:${r.month/max*100}%"></span></div></div><span class="streak${r.streak?"":" off"}" title="Settimane consecutive di quota">🔥 ${r.streak}</span></div>`).join("")||`<div class="empty-state">Nessun collega presente.</div>`;

  const paidNow=rows.filter(r=>r.weeks.has(thisWeek)).length,n=members.length||1,done=paidNow===members.length&&n>0;
  $("weeklyChallenge").innerHTML=`<div class="challenge-top"><strong>${paidNow}/${members.length}</strong><span>${done?"Tutti in regola! 🎉":"colleghi in regola questa settimana"}</span></div><div class="bar"><span style="width:${paidNow/n*100}%"></span></div>`;

  const bestStreak=Math.max(0,...rows.map(r=>r.streak)),monthOut=monthTotal(expenses),monthIn=monthTotal(payments);
  const defs=[
    {icon:"🔥",name:"Serie da 4",desc:"Un collega paga 4 settimane di fila",ok:bestStreak>=4},
    {icon:"🌟",name:"Cassa al completo",desc:"Tutti in regola questa settimana",ok:done},
    {icon:"💚",name:"Mese in attivo",desc:"Entrate superiori alle spese",ok:monthIn>0&&monthIn>=monthOut},
    {icon:"💯",name:"Quota 100",desc:"Più di 100 € versati in un mese",ok:monthIn>=100},
    {icon:"🚀",name:"Primi passi",desc:"Almeno 10 versamenti registrati",ok:allPayments.length>=10}
  ];
  $("badges").innerHTML=defs.map(b=>`<div class="badge${b.ok?" on":""}" title="${esc(b.desc)}"><span>${b.ok?b.icon:"🔒"}</span><small>${esc(b.name)}</small></div>`).join("");
}
function confetti(){
  if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const colors=["#19785b","#e7a36a","#7197d5","#8d6bd1","#f2c14e"];
  for(let i=0;i<36;i++){const s=document.createElement("span");s.className="confetti";s.style.left=`${Math.random()*100}vw`;s.style.background=colors[i%colors.length];s.style.animationDelay=`${Math.random()*.4}s`;s.style.setProperty("--dx",`${(Math.random()-.5)*160}px`);document.body.appendChild(s);setTimeout(()=>s.remove(),2200)}
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
async function handleLogin(e){e.preventDefault();if(!sb)return;message("loginMessage","Accesso in corso…");const {error}=await sb.auth.signInWithPassword({email:$("emailInput").value.trim(),password:$("passwordInput").value});if(error){message("loginMessage",error.message==="Invalid login credentials"?"Email o password non corretti.":error.message,true);return}$("passwordInput").value="";message("loginMessage","")}
async function handleForgot(){const email=$("emailInput").value.trim();if(!email){message("loginMessage","Inserisci prima la tua email.",true);return}const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+window.location.pathname});if(error){message("loginMessage",error.message,true);return}message("loginMessage","Se l'indirizzo è autorizzato, riceverai un link per scegliere una nuova password. Controlla anche lo spam.")}
function showPasswordForm(){$("loginForm").classList.add("hidden");$("passwordForm").classList.remove("hidden");setView("login")}
async function handleSetPassword(e){e.preventDefault();const pw=$("newPasswordInput").value;if(pw.length<8){message("passwordMessage","Usa almeno 8 caratteri.",true);return}if(pw!==$("confirmPasswordInput").value){message("passwordMessage","Le password non coincidono.",true);return}const {data,error}=await sb.auth.updateUser({password:pw});if(error){message("passwordMessage",error.message,true);return}needsPassword=false;$("passwordForm").classList.add("hidden");$("loginForm").classList.remove("hidden");$("newPasswordInput").value=$("confirmPasswordInput").value="";history.replaceState(null,"",window.location.pathname);await showApp(data.user);toast("Password impostata")}
async function handleExpense(e){e.preventDefault();const product=$("expenseProduct").value,category=$("expenseCategory").value,qty=Number($("expenseQty").value),unit=Number($("expensePrice").value);if(!qty||qty<1||unit<0){message("actionMessage","Controlla quantità e prezzo.",true);return}const payload={spent_on:$("expenseDate").value,category,product,quantity:qty,unit_price:unit,amount:Math.round(qty*unit*100)/100,note:$("expenseNote").value.trim(),created_by:currentUser.id};const {error}=await sb.from("expenses").insert(payload);if(error){message("actionMessage",error.message,true);return}e.target.reset();$("expenseDate").value=dateISO();$("expenseQty").value=1;$("expenseProduct").value="Caffè";$("expenseCategory").value="Bevande";$("expensePrice").value=PRICE["Caffè"].toFixed(2);$("expenseTotal").textContent=euro(PRICE["Caffè"]);message("actionMessage","Spesa registrata correttamente.");await loadData();toast("Spesa aggiunta alla cassa")}
async function handlePayment(e){e.preventDefault();const amount=Number($("paymentAmount").value);if(amount<=0){message("actionMessage","Inserisci un importo valido.",true);return}const payload={paid_on:$("paymentDate").value,week_start:$("paymentWeek").value,member_id:$("paymentMember").value,amount,note:$("paymentNote").value.trim(),created_by:currentUser.id};const {error}=await sb.from("payments").insert(payload);if(error){message("actionMessage",error.message,true);return}e.target.reset();$("paymentDate").value=dateISO();$("paymentWeek").value=weekStartISO();$("paymentAmount").value=WEEKLY_QUOTA.toFixed(2);message("actionMessage","Versamento registrato correttamente.");await loadData();confetti();toast("Quota registrata 🎉 +1 per la serie!")}
function weekStartISO(){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return dateISO(d)}
async function deleteMovement(table,id){if(!confirm("Vuoi eliminare questo movimento? L'operazione non può essere annullata."))return;const {error}=await sb.from(table).delete().eq("id",id);if(error){toast("Errore: "+error.message,true);return}await loadData();toast("Movimento eliminato")}
function exportCSV(){const rows=[["Data","Tipo","Categoria/collega","Nota","Entrata","Uscita"],...payments.map(p=>[p.paid_on,"Quota",p.members?.name||"",p.note||"",Number(p.amount).toFixed(2),""]),...expenses.map(e=>[e.spent_on,e.product,e.category,e.note||"","",Number(e.amount).toFixed(2)])];const csv=rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(";")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`fondo-bar-${$("monthPicker").value}.csv`;a.click();URL.revokeObjectURL(a.href)}
async function showApp(user){currentUser=user;$("userEmail").textContent=user.email||"";setView("app");try{await loadMembers();await loadData()}catch(err){toast("Errore caricamento dati: "+err.message,true)}}
async function boot(){
  setTodayDefaults();setupProductUI();
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  $("loginForm").addEventListener("submit",handleLogin);$("forgotBtn").addEventListener("click",handleForgot);$("passwordForm").addEventListener("submit",handleSetPassword);$("expenseForm").addEventListener("submit",handleExpense);$("paymentForm").addEventListener("submit",handlePayment);
  $("monthPicker").addEventListener("change",()=>loadData().catch(e=>toast(e.message,true)));
  $("exportBtn").addEventListener("click",exportCSV);
  $("movementsBody").addEventListener("click",e=>{const b=e.target.closest("[data-table]");if(b)deleteMovement(b.dataset.table,b.dataset.id)});
  $("logoutBtn").addEventListener("click",async()=>{await sb.auth.signOut();setView("login")});
  if(!configReady()){$("setupNotice").classList.remove("hidden");setView("login");$("loginForm").querySelector("button").disabled=true;$("loginForm").querySelector("button").textContent="Completa prima la configurazione";return}
  const hashParams=new URLSearchParams(window.location.hash.replace(/^#+/,""));
  const authError=hashParams.get("error_description");needsPassword=["invite","recovery"].includes(hashParams.get("type"));
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
  const {data:{session}}=await sb.auth.getSession();
  if(authError&&!session){message("loginMessage","Accesso non riuscito: "+authError.replace(/\+/g," ")+". Richiedi un nuovo link con «Password dimenticata?».",true);history.replaceState(null,"",window.location.pathname)}
  if(session&&needsPassword)showPasswordForm();else if(session)await showApp(session.user);else setView("login");
  sb.auth.onAuthStateChange((event,session)=>{if(event==="PASSWORD_RECOVERY")needsPassword=true;setTimeout(async()=>{if(session&&needsPassword)showPasswordForm();else if(session)await showApp(session.user);else{currentUser=null;setView("login")}},0)});
}
document.addEventListener("DOMContentLoaded",boot);
