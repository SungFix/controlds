(function initAtestados(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  const ROOMS=[
    {group:"DS",rooms:["1º DS A","1º DS B","2º DS A","2º DS B"]},
    {group:"EDF",rooms:["1º EDF A","1º EDF B","2º EDF A","2º EDF B","3º EDF A","3º EDF B"]},
    {group:"GTU",rooms:["3º GTU"]}
  ];

  let root=null;
  let rows=[];
  let activeTab="overview";
  let channel=null;

  function user(){try{return typeof currentUser!=="undefined"?currentUser:null;}catch(_){return null;}}
  function role(){return String(user()?.role||"").toLowerCase();}
  function canManage(){return ["adm","diretor","vice_diretor"].includes(role());}
  function client(){try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}}
  function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}
  function fmtDate(v){if(!v)return"—";return new Date(v+"T12:00:00").toLocaleDateString("pt-BR");}
  function initials(name){return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("")||"?";}
  function classes(){return [...new Set(rows.map(r=>String(r.class_name||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));}
  function avg(list){return list.length?list.reduce((s,r)=>s+num(r.justified_rate),0)/list.length:0;}
  function today(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }

  function icon(name){
    const icons={
      doc:'<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15h5"/></svg>',
      users:'<svg viewBox="0 0 24 24"><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.5 2.5 0 1 0 0-5M3 19c.3-3 2-4.5 5-4.5s4.7 1.5 5 4.5M14 14.8c2.8.1 4.4 1.5 4.8 4.2"/></svg>',
      rate:'<svg viewBox="0 0 24 24"><path d="M5 18 18 5M7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',
      today:'<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3"/></svg>',
      search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>'
    };
    return icons[name]||icons.doc;
  }

  function shell(){
    return '<section class="ete-atestados">'
      +'<header class="at-page-head"><div class="at-heading"><h1>Atestados</h1><p>Faltas justificadas para consulta da equipe escolar.</p></div><div class="at-head-actions"><span class="at-status" id="atStatus" role="status" aria-live="polite">Sincronizando...</span>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div></header>'
      +'<nav class="at-nav" aria-label="Navegação do módulo"><button class="at-nav-item active" data-at-tab="overview" type="button">Visão geral</button><button class="at-nav-item" data-at-tab="records" type="button">Registros</button>'+(canManage()?'<button class="at-nav-item" data-at-tab="new" type="button">Cadastrar</button>':'')+'</nav>'
      +'<div id="atView" class="at-view"></div></section>';
  }

  function metric(label,value,sub,kind){return '<article class="at-metric"><span class="at-metric-icon">'+icon(kind)+'</span><div><strong>'+value+'</strong><span>'+label+'</span><small>'+sub+'</small></div></article>';}

  function rowHtml(r){
    return '<tr><td><div class="at-student-cell"><span class="at-avatar">'+esc(initials(r.student_name))+'</span><div><strong>'+esc(r.student_name)+'</strong><small>'+esc(r.reason)+'</small></div></div></td><td><span class="at-badge">'+esc(r.class_name)+'</span></td><td>'+fmtDate(r.absence_date)+'</td><td>'+esc(r.project_name||"Nenhum")+'</td><td><span class="at-rate">'+num(r.justified_rate).toFixed(1).replace(".",",")+'%</span></td>'+(canManage()?'<td><button class="at-icon-danger" aria-label="Excluir registro de '+esc(r.student_name)+'" title="Excluir registro" type="button" data-at-delete="'+esc(r.id)+'">×</button></td>':'')+'</tr>';
  }

  function filteredRows(){
    const q=String(root?.querySelector("#atSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const cls=String(root?.querySelector("#atClassFilter")?.value||"");
    const mode=String(root?.querySelector("[data-at-filter].active")?.dataset.atFilter||"all");
    return rows.filter(r=>{
      const hay=[r.student_name,r.class_name,r.reason,r.project_name].join(" ").toLocaleLowerCase("pt-BR");
      const modeOk=mode==="all"||(mode==="today"&&r.absence_date===today());
      return (!q||hay.includes(q))&&(!cls||r.class_name===cls)&&modeOk;
    });
  }

  function classChart(){
    const data=classes().map(name=>{const list=rows.filter(r=>r.class_name===name);return{name,rate:avg(list),count:list.length};}).sort((a,b)=>b.rate-a.rate||b.count-a.count);
    if(!data.length)return '<div class="at-empty-state compact" role="status"><strong>Sem dados por turma</strong><span>O gráfico aparecerá após os primeiros registros.</span></div>';
    return '<div class="at-class-chart">'+data.map(item=>'<div class="at-class-chart-row"><div><strong>'+esc(item.name)+'</strong><small>'+item.count+' registro'+(item.count===1?'':'s')+'</small></div><div class="at-class-chart-track"><span style="width:'+Math.max(2,Math.min(100,item.rate))+'%"></span></div><b>'+item.rate.toFixed(1).replace(".",",")+'%</b></div>').join("")+'</div>';
  }

  function renderOverview(){
    const cls=classes();
    const todayRows=rows.filter(r=>r.absence_date===today());
    const total=rows.length;
    const overall=avg(rows);
    const view=root.querySelector("#atView");
    if(!view)return;
    view.innerHTML=''
      +'<section class="at-metrics">'+metric("Faltas justificadas",total,"Total registrado","doc")+metric("Turmas ativas",cls.length,"Com registros","users")+metric("Taxa média",overall.toFixed(1).replace(".",",")+"%","Média informada","rate")+metric("Hoje",todayRows.length,"Faltas justificadas","today")+'</section>'
      +'<section class="at-dashboard-grid">'
      +'<article class="at-card at-main-records"><div class="at-card-head at-main-head"><div><strong>Faltas justificadas</strong></div><button type="button" data-at-tab="records">Ver todos</button></div><div class="at-overview-toolbar"><div class="at-filter-tabs"><button class="active" type="button" data-at-filter="all">Todos <span>'+total+'</span></button><button type="button" data-at-filter="today">Hoje <span>'+todayRows.length+'</span></button></div></div><div class="at-inline-search"><label><span>'+icon("search")+'</span><input id="atSearch" class="at-input" type="search" aria-label="Pesquisar registros" placeholder="Pesquisar aluno, turma, motivo ou projeto"></label><select id="atClassFilter" class="at-select" aria-label="Filtrar por turma"><option value="">Todas as turmas</option>'+cls.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("")+'</select></div><div id="atTableWrap"></div></article>'
      +'<aside class="at-side-stack"><article class="at-card at-class-chart-card"><div class="at-card-head"><div><strong>Taxa justificada por turma</strong><small>Média dos registros</small></div></div>'+classChart()+'</article></aside>'
      +'</section>';
    root.querySelectorAll("[data-at-filter]").forEach(button=>button.addEventListener("click",()=>{root.querySelectorAll("[data-at-filter]").forEach(x=>x.classList.remove("active"));button.classList.add("active");renderOverviewTable();}));
    root.querySelector("#atSearch")?.addEventListener("input",renderOverviewTable);
    root.querySelector("#atClassFilter")?.addEventListener("change",renderOverviewTable);
    renderOverviewTable();
  }

  function renderOverviewTable(){
    const wrap=root?.querySelector("#atTableWrap");
    if(!wrap)return;
    const list=filteredRows().slice(0,6);
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Projeto</th><th>Taxa</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(rowHtml).join("")+'</tbody></table></div>':'<div class="at-empty-state" role="status"><strong>Nenhum registro encontrado</strong><span>Ajuste os filtros ou cadastre uma falta justificada.</span>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div>';
  }

  function renderRecords(){
    const opts=classes().map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    const view=root.querySelector("#atView");
    if(!view)return;
    view.innerHTML='<section class="at-card at-records-card"><div class="at-records-top"><div><h2>Todos os registros</h2><p>Consulte por aluno, turma, motivo ou projeto.</p></div>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div><div class="at-toolbar"><label class="at-search-wrap"><span>'+icon("search")+'</span><input id="atSearch" class="at-input" type="search" aria-label="Buscar registros" placeholder="Buscar aluno, motivo ou projeto"></label><select id="atClassFilter" class="at-select" aria-label="Filtrar registros por turma"><option value="">Todas as turmas</option>'+opts+'</select></div><div id="atTableWrap"></div></section>';
    root.querySelector("#atSearch")?.addEventListener("input",renderTable);
    root.querySelector("#atClassFilter")?.addEventListener("change",renderTable);
    renderTable();
  }

  function renderTable(){
    const wrap=root?.querySelector("#atTableWrap");
    if(!wrap)return;
    const list=filteredRows();
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Projeto</th><th>Taxa</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(rowHtml).join("")+'</tbody></table></div>':'<div class="at-empty-state" role="status"><strong>Nenhum registro encontrado</strong><span>Ajuste a busca ou o filtro de turma.</span></div>';
  }

  function roomPicker(){
    return '<div class="at-room-picker"><label>Turma</label><div class="at-room-groups">'+ROOMS.map(group=>'<section class="at-room-group"><div class="at-room-group-title"><span>'+esc(group.group)+'</span></div><div class="at-room-options">'+group.rooms.map(room=>'<label class="at-room-option"><input type="radio" name="atClass" value="'+esc(room)+'" required><span>'+esc(room)+'</span></label>').join("")+'</div></section>').join("")+'</div><span class="at-room-help">Selecione a turma.</span></div>';
  }

  function renderForm(){
    if(!canManage()){activeTab="records";render();return;}
    const view=root.querySelector("#atView");
    if(!view)return;
    view.innerHTML='<section class="at-form-layout"><div class="at-card at-form-card"><form id="atForm" class="at-form"><div class="at-field full"><label for="atStudent">Nome do aluno</label><input class="at-input" id="atStudent" required maxlength="160" placeholder="Nome completo do aluno"></div>'+roomPicker()+'<div class="at-field"><label for="atDate">Data da falta</label><input class="at-input" id="atDate" type="date" required value="'+today()+'"></div><div class="at-field"><label for="atProject">Projeto <span>opcional</span></label><input class="at-input" id="atProject" maxlength="160" placeholder="Nenhum ou nome do projeto"></div><div class="at-field full"><label for="atReason">Motivo da falta</label><textarea class="at-textarea" id="atReason" required maxlength="500" placeholder="Atestado médico, consulta, acompanhamento..."></textarea></div><div class="at-field"><label for="atRate">Taxa justificada (%)</label><input class="at-input" id="atRate" type="number" min="0" max="100" step="0.1" required value="0"></div><div class="at-form-actions"><button class="at-btn" type="button" data-at-cancel>Cancelar</button><button class="at-btn primary" type="submit">Salvar falta justificada</button></div></form></div></section>';
    root.querySelector("#atForm")?.addEventListener("submit",saveRecord);
  }

  function render(){
    if(!root)return;
    root.querySelectorAll(".at-nav-item").forEach(button=>button.classList.toggle("active",button.dataset.atTab===activeTab));
    if(activeTab==="overview")renderOverview();
    else if(activeTab==="records")renderRecords();
    else renderForm();
  }

  function setStatus(text,error){
    const status=root?.querySelector("#atStatus");
    if(!status)return;
    status.textContent=text;
    status.classList.toggle("error",!!error);
    status.dataset.state=error?"error":(text==="Atualizado"?"ok":"loading");
  }

  async function load(){
    const c=client();
    if(!c){setStatus("Supabase indisponível",true);return;}
    setStatus("Sincronizando...");
    const {data,error}=await c.from(TABLE).select("*").order("absence_date",{ascending:false}).order("created_at",{ascending:false});
    if(error){console.error("Atestados:",error);setStatus("Falha ao carregar",true);return;}
    rows=data||[];
    setStatus("Atualizado",false);
    render();
  }

  async function saveRecord(event){
    event.preventDefault();
    if(!canManage())return;
    const c=client();
    if(!c){setStatus("Supabase indisponível",true);return;}
    const selected=root.querySelector('input[name="atClass"]:checked');
    if(!selected){setStatus("Selecione uma turma",true);return;}
    const button=event.currentTarget.querySelector('button[type="submit"]');
    if(button){button.disabled=true;button.setAttribute("aria-busy","true");button.textContent="Salvando...";}
    const payload={student_name:root.querySelector("#atStudent").value.trim(),class_name:selected.value,reason:root.querySelector("#atReason").value.trim(),project_name:root.querySelector("#atProject").value.trim()||null,absence_date:root.querySelector("#atDate").value,justified_rate:num(root.querySelector("#atRate").value)};
    const {error}=await c.from(TABLE).insert(payload);
    if(button){button.disabled=false;button.removeAttribute("aria-busy");button.textContent="Salvar falta justificada";}
    if(error){console.error("Atestados:",error);setStatus("Não foi possível salvar",true);return;}
    activeTab="records";
    await load();
  }

  async function removeRecord(id){
    if(!canManage()||!id)return;
    if(!confirm("Excluir este registro de falta justificada?"))return;
    const c=client();
    if(!c){setStatus("Supabase indisponível",true);return;}
    const {error}=await c.from(TABLE).delete().eq("id",id);
    if(error){console.error("Atestados:",error);setStatus("Não foi possível excluir",true);return;}
    await load();
  }

  function bind(){
    if(!root||root.dataset.atBound==="1")return;
    root.dataset.atBound="1";
    root.addEventListener("click",event=>{
      const tab=event.target.closest("[data-at-tab]");
      if(tab){activeTab=tab.dataset.atTab;render();return;}
      if(event.target.closest("[data-at-new]")){activeTab="new";render();return;}
      if(event.target.closest("[data-at-cancel]")){activeTab="overview";render();return;}
      const del=event.target.closest("[data-at-delete]");
      if(del)removeRecord(del.dataset.atDelete);
    });
  }

  function subscribe(){
    const c=client();
    if(!c?.channel)return;
    try{if(channel)c.removeChannel(channel);}catch(_){}
    channel=c.channel("ete-atestados-live").on("postgres_changes",{event:"*",schema:"public",table:TABLE},()=>load()).subscribe(status=>{
      if(status==="CHANNEL_ERROR"||status==="TIMED_OUT")setStatus("Realtime indisponível",true);
    });
  }

  function mount(selector){
    const target=typeof selector==="string"?document.querySelector(selector):selector;
    if(!target)return;
    if(root&&root!==target)unmount();
    root=target;
    root.innerHTML=shell();
    bind();
    render();
    load();
    subscribe();
  }

  function unmount(){
    try{const c=client();if(channel&&c)c.removeChannel(channel);}catch(_){}
    channel=null;
    if(root)root.innerHTML="";
    root=null;
    rows=[];
    activeTab="overview";
  }

  window.ETEAtestados={mount,unmount};
})();
