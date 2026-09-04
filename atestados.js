(function initAtestados(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  const ROOMS=[
    {group:"DS",label:"Desenvolvimento de Sistemas",rooms:["1º DS A","1º DS B","2º DS A","2º DS B"]},
    {group:"EDF",label:"Edificações",rooms:["1º EDF A","1º EDF B","2º EDF A","2º EDF B","3º EDF A","3º EDF B"]},
    {group:"GTU",label:"GTU",rooms:["3º GTU"]}
  ];
  let root=null,rows=[],activeTab="overview",channel=null;

  function user(){try{return typeof currentUser!=="undefined"?currentUser:null;}catch(_){return null;}}
  function role(){return String(user()?.role||"").toLowerCase();}
  function canManage(){return ["adm","diretor","vice_diretor"].includes(role());}
  function client(){try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}}
  function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);}
  function fmtDate(value){if(!value)return"—";return new Date(value+"T12:00:00").toLocaleDateString("pt-BR");}
  function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}
  function classes(){return [...new Set(rows.map(r=>String(r.class_name||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));}
  function avg(list){return list.length?list.reduce((s,r)=>s+num(r.justified_rate),0)/list.length:0;}
  function initials(name){return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x.charAt(0).toUpperCase()).join("")||"?";}
  function icon(name){
    const icons={doc:'<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15h5"/></svg>',users:'<svg viewBox="0 0 24 24"><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.5 2.5 0 1 0 0-5M3 19c.3-3 2-4.5 5-4.5s4.7 1.5 5 4.5M14 14.8c2.8.1 4.4 1.5 4.8 4.2"/></svg>',rate:'<svg viewBox="0 0 24 24"><path d="M5 18 18 5M7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>',today:'<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3"/></svg>',search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',info:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 10v6M12 7.5h.01"/></svg>'};
    return icons[name]||icons.doc;
  }

  function shell(){
    return '<section class="ete-atestados">'
      +'<header class="at-page-head"><div><span class="at-eyebrow">Gestão de frequência</span><h1>Atestados</h1><p>Consulte e registre faltas justificadas dos alunos.</p></div><div class="at-head-actions"><span class="at-status" id="atStatus">Sincronizando...</span>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new><span>+</span> Novo registro</button>':'')+'</div></header>'
      +'<nav class="at-nav" aria-label="Navegação do módulo"><button class="at-nav-item active" data-at-tab="overview" type="button">Visão geral</button><button class="at-nav-item" data-at-tab="records" type="button">Registros</button>'+(canManage()?'<button class="at-nav-item" data-at-tab="new" type="button">Cadastrar</button>':'')+'</nav>'
      +'<div id="atView" class="at-view"></div></section>';
  }

  function filteredRows(){
    const q=String(root?.querySelector("#atSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const cls=String(root?.querySelector("#atClassFilter")?.value||"");
    const mode=String(root?.querySelector("[data-at-filter].active")?.dataset.atFilter||"all");
    const today=new Date().toISOString().slice(0,10);
    return rows.filter(r=>{
      const hay=[r.student_name,r.class_name,r.reason,r.project_name].join(" ").toLocaleLowerCase("pt-BR");
      const modeOk=mode==="all"||(mode==="today"&&r.absence_date===today)||(mode==="project"&&r.project_name)||(mode==="none"&&!r.project_name);
      return(!q||hay.includes(q))&&(!cls||r.class_name===cls)&&modeOk;
    });
  }

  function metric(label,value,sub,kind){return '<article class="at-metric"><span class="at-metric-icon">'+icon(kind)+'</span><div><strong>'+value+'</strong><span>'+label+'</span><small>'+sub+'</small></div></article>';}

  function renderOverview(){
    const total=rows.length,classList=classes(),today=new Date().toISOString().slice(0,10),todayCount=rows.filter(r=>r.absence_date===today).length,overall=avg(rows);
    const recent=[...rows].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5);
    const byClass=classList.map(c=>{const list=rows.filter(r=>r.class_name===c);return{c,value:avg(list),count:list.length};}).sort((a,b)=>b.value-a.value).slice(0,6);
    root.querySelector("#atView").innerHTML=''
      +'<section class="at-metrics">'
      +metric("Faltas justificadas",total,"Total registrado","doc")
      +metric("Turmas com registros",classList.length,"Turmas diferentes","users")
      +metric("Taxa média",overall.toFixed(1).replace(".",",")+"%","Média informada","rate")
      +metric("Justificadas hoje",todayCount,"Registros de hoje","today")
      +'</section>'
      +'<section class="at-card at-overview-table"><div class="at-overview-toolbar"><div class="at-filter-tabs"><button class="active" type="button" data-at-filter="all">Todos <span>'+total+'</span></button><button type="button" data-at-filter="today">Hoje <span>'+todayCount+'</span></button><button type="button" data-at-filter="project">Com projeto</button><button type="button" data-at-filter="none">Sem projeto</button></div><button class="at-btn ghost" type="button" data-at-tab="records">Ver registros</button></div><div class="at-inline-search"><label><span>'+icon("search")+'</span><input id="atSearch" class="at-input" type="search" placeholder="Pesquisar aluno, turma, motivo ou projeto"></label><select id="atClassFilter" class="at-select"><option value="">Todas as turmas</option>'+classList.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("")+'</select></div><div id="atTableWrap"></div></section>'
      +'<section class="at-bottom-grid"><article class="at-card at-recent-panel"><div class="at-card-head"><div><span class="at-card-kicker">Atividade</span><strong>Registros recentes</strong></div><button type="button" data-at-tab="records">Ver todos</button></div><div class="at-recent">'+(recent.length?recent.map(r=>'<div class="at-recent-row"><span class="at-avatar">'+esc(initials(r.student_name))+'</span><div><strong>'+esc(r.student_name)+'</strong><small>'+esc(r.class_name)+' · '+fmtDate(r.absence_date)+'</small></div><span class="at-rate">'+num(r.justified_rate).toFixed(1).replace(".",",")+'%</span></div>').join(""):'<div class="at-empty-state compact">Nenhum registro recente.</div>')+'</div></article>'
      +'<article class="at-card at-guide-panel"><div class="at-card-head"><div><span class="at-card-kicker">Orientação</span><strong>Antes de marcar falta</strong></div><span class="at-guide-icon">'+icon("info")+'</span></div><div class="at-guide-list"><p><span>1</span>Consulte o nome do aluno nesta área.</p><p><span>2</span>Confira a data e o motivo informado pela gestão.</p><p><span>3</span>Se houver registro, considere a ausência como justificada.</p><p><span>4</span>Em caso de dúvida, confirme com a gestão.</p></div></article></section>';
    root.querySelectorAll("[data-at-filter]").forEach(b=>b.addEventListener("click",()=>{root.querySelectorAll("[data-at-filter]").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderOverviewTable();}));
    root.querySelector("#atSearch")?.addEventListener("input",renderOverviewTable);root.querySelector("#atClassFilter")?.addEventListener("change",renderOverviewTable);renderOverviewTable();
  }

  function renderOverviewTable(){
    const wrap=root.querySelector("#atTableWrap");if(!wrap)return;const list=filteredRows().slice(0,7);
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Motivo</th><th>Projeto</th><th>Taxa</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(r=>rowHtml(r)).join("")+'</tbody></table></div>':'<div class="at-empty-state"><strong>Nenhum registro encontrado</strong><span>Os registros de faltas justificadas aparecerão aqui.</span></div>';
  }

  function rowHtml(r){return '<tr><td><div class="at-student-cell"><span class="at-avatar">'+esc(initials(r.student_name))+'</span><strong>'+esc(r.student_name)+'</strong></div></td><td><span class="at-badge">'+esc(r.class_name)+'</span></td><td>'+fmtDate(r.absence_date)+'</td><td class="at-reason">'+esc(r.reason)+'</td><td>'+esc(r.project_name||"Nenhum")+'</td><td><span class="at-rate">'+num(r.justified_rate).toFixed(1).replace(".",",")+'%</span></td>'+(canManage()?'<td><button class="at-icon-danger" title="Excluir" type="button" data-at-delete="'+esc(r.id)+'">×</button></td>':'')+'</tr>';}

  function renderRecords(){
    const opts=classes().map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    root.querySelector("#atView").innerHTML='<section class="at-card at-records-card"><div class="at-records-top"><div><span class="at-card-kicker">Consulta completa</span><h2>Faltas justificadas</h2><p>Consulte aluno, turma, motivo, projeto e data.</p></div>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div><div class="at-toolbar"><label class="at-search-wrap"><span>'+icon("search")+'</span><input id="atSearch" class="at-input" type="search" placeholder="Buscar aluno, motivo ou projeto"></label><select id="atClassFilter" class="at-select"><option value="">Todas as turmas</option>'+opts+'</select></div><div id="atTableWrap"></div></section>';
    root.querySelector("#atSearch")?.addEventListener("input",renderTable);root.querySelector("#atClassFilter")?.addEventListener("change",renderTable);renderTable();
  }

  function renderTable(){const wrap=root.querySelector("#atTableWrap");if(!wrap)return;const list=filteredRows();wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Motivo</th><th>Projeto</th><th>Taxa</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(r=>rowHtml(r)).join("")+'</tbody></table></div>':'<div class="at-empty-state"><strong>Nenhum registro encontrado</strong><span>Ajuste os filtros ou cadastre uma nova falta justificada.</span></div>';}

  function roomPicker(){return '<div class="at-room-picker"><label>Turma</label><div class="at-room-groups">'+ROOMS.map(group=>'<section class="at-room-group '+(group.group==="GTU"?'gtu':'')+'"><div class="at-room-group-title"><span>'+esc(group.group)+'</span><small>'+esc(group.label)+'</small></div><div class="at-room-options">'+group.rooms.map(room=>'<label class="at-room-option"><input type="radio" name="atClass" value="'+esc(room)+'" required><span>'+esc(room)+'</span></label>').join("")+'</div></section>').join("")+'</div><span class="at-room-help">Selecione a turma.</span></div>';}

  function renderForm(){
    if(!canManage()){activeTab="records";render();return;}
    root.querySelector("#atView").innerHTML='<section class="at-form-layout"><div class="at-form-intro"><span class="at-card-kicker">Novo registro</span><h2>Cadastrar falta justificada</h2><p>Registre a ausência para deixá-la disponível imediatamente aos professores.</p><div class="at-form-note"><strong>Visível no módulo</strong><span>Depois de salvar, o registro entra na consulta e nos indicadores.</span></div></div><div class="at-card at-form-card"><form id="atForm" class="at-form"><div class="at-field full"><label>Aluno</label><input class="at-input" id="atStudent" required maxlength="160" placeholder="Nome completo do aluno"></div>'+roomPicker()+'<div class="at-field"><label>Data da falta</label><input class="at-input" id="atDate" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div><div class="at-field full"><label>Motivo da falta</label><textarea class="at-textarea" id="atReason" required maxlength="500" placeholder="Ex.: Atestado médico, consulta, acompanhamento..."></textarea></div><div class="at-field"><label>Projeto <span>opcional</span></label><input class="at-input" id="atProject" maxlength="160" placeholder="Nenhum ou nome do projeto"></div><div class="at-field"><label>Taxa justificada (%)</label><input class="at-input" id="atRate" type="number" min="0" max="100" step="0.1" required value="0"><span class="at-help">Será automatizada quando as turmas forem cadastradas.</span></div><div class="at-form-actions"><button class="at-btn" type="button" data-at-cancel>Cancelar</button><button class="at-btn primary" type="submit">Salvar falta justificada</button></div></form></div></section>';
    root.querySelector("#atForm")?.addEventListener("submit",saveRecord);
  }

  function render(){if(!root)return;root.querySelectorAll(".at-nav-item").forEach(b=>b.classList.toggle("active",b.dataset.atTab===activeTab));if(activeTab==="overview")renderOverview();else if(activeTab==="records")renderRecords();else renderForm();}
  function setStatus(text,error){const node=root?.querySelector("#atStatus");if(node){node.textContent=text;node.classList.toggle("error",!!error);}}
  async function load(){const c=client();if(!c){setStatus("Supabase indisponível",true);return;}setStatus("Sincronizando...");const{data,error}=await c.from(TABLE).select("*").order("absence_date",{ascending:false}).order("created_at",{ascending:false});if(error){console.error("Atestados:",error);setStatus("Falha ao carregar",true);return;}rows=data||[];setStatus("Atualizado");render();}
  async function saveRecord(event){event.preventDefault();if(!canManage())return;const c=client();if(!c)return;const selectedRoom=root.querySelector('input[name="atClass"]:checked');if(!selectedRoom){setStatus("Selecione uma turma",true);return;}const btn=event.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Salvando...";}const payload={student_name:root.querySelector("#atStudent").value.trim(),class_name:selectedRoom.value,reason:root.querySelector("#atReason").value.trim(),project_name:root.querySelector("#atProject").value.trim()||null,absence_date:root.querySelector("#atDate").value,justified_rate:num(root.querySelector("#atRate").value)};const{error}=await c.from(TABLE).insert(payload);if(btn){btn.disabled=false;btn.textContent="Salvar falta justificada";}if(error){console.error("Atestados:",error);setStatus("Não foi possível salvar",true);return;}activeTab="records";await load();}
  async function removeRecord(id){if(!canManage()||!id)return;const c=client();if(!c)return;const{error}=await c.from(TABLE).delete().eq("id",id);if(error){console.error("Atestados:",error);setStatus("Não foi possível excluir",true);return;}await load();}
  function handleClick(event){const tab=event.target.closest("[data-at-tab]");if(tab){activeTab=tab.dataset.atTab;render();return;}if(event.target.closest("[data-at-new]")){activeTab="new";render();return;}if(event.target.closest("[data-at-cancel]")){activeTab="records";render();return;}const del=event.target.closest("[data-at-delete]");if(del)removeRecord(del.dataset.atDelete);}
  function subscribe(){const c=client();if(!c||channel)return;try{channel=c.channel("ete-atestados-realtime").on("postgres_changes",{event:"*",schema:"public",table:TABLE},()=>load()).subscribe();}catch(err){console.warn("Atestados realtime:",err);}}
  function mount(target){root=typeof target==="string"?document.querySelector(target):target;if(!root)return;root.innerHTML=shell();root.addEventListener("click",handleClick);activeTab="overview";load();subscribe();}
  function unmount(){if(root){root.removeEventListener("click",handleClick);root.innerHTML="";}const c=client();if(channel&&c){try{c.removeChannel(channel);}catch(_){}}channel=null;root=null;}
  window.ETEAtestados=Object.freeze({mount,unmount,reload:load});
})();
