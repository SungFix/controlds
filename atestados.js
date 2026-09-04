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

  function shell(){
    return '<section class="ete-atestados">'
      +'<header class="at-module-head">'
      +'<div class="at-module-brand"><span class="at-module-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3.75h8.5L19 7.25v13H7z"/><path d="M15 3.75v4h4"/><path d="M10 12h6M10 15h6"/></svg></span><div><span class="at-eyebrow">Gestão de frequência</span><h1>Atestados</h1><p>Faltas justificadas, acompanhamento por turma e consulta rápida para professores.</p></div></div>'
      +'<div class="at-head-actions"><span class="at-status" id="atStatus">Sincronizando...</span>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new><span>+</span> Novo registro</button>':'')+'</div>'
      +'</header>'
      +'<nav class="at-nav" aria-label="Navegação do módulo"><button class="at-nav-item active" data-at-tab="overview" type="button">Painel</button><button class="at-nav-item" data-at-tab="records" type="button">Faltas justificadas</button>'+(canManage()?'<button class="at-nav-item" data-at-tab="new" type="button">Cadastrar falta</button>':'')+'</nav>'
      +'<div id="atView" class="at-view"></div></section>';
  }

  function filteredRows(){
    const q=String(root?.querySelector("#atSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const cls=String(root?.querySelector("#atClassFilter")?.value||"");
    return rows.filter(r=>{const hay=[r.student_name,r.class_name,r.reason,r.project_name].join(" ").toLocaleLowerCase("pt-BR");return(!q||hay.includes(q))&&(!cls||r.class_name===cls);});
  }

  function renderOverview(){
    const total=rows.length,classList=classes(),today=new Date().toISOString().slice(0,10),todayCount=rows.filter(r=>r.absence_date===today).length,overall=avg(rows);
    const byClass=classList.map(c=>{const list=rows.filter(r=>r.class_name===c);return{c,value:avg(list),count:list.length};}).sort((a,b)=>b.value-a.value);
    const recent=[...rows].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,6);
    const biggest=byClass[0];
    root.querySelector("#atView").innerHTML=''
      +'<section class="at-metrics">'
      +'<article class="at-metric-card"><span class="at-metric-label">Faltas justificadas</span><strong>'+total+'</strong><small>Total registrado</small></article>'
      +'<article class="at-metric-card"><span class="at-metric-label">Turmas</span><strong>'+classList.length+'</strong><small>Com registros</small></article>'
      +'<article class="at-metric-card"><span class="at-metric-label">Taxa média</span><strong>'+overall.toFixed(1).replace(".",",")+'%</strong><small>Média geral</small></article>'
      +'<article class="at-metric-card"><span class="at-metric-label">Hoje</span><strong>'+todayCount+'</strong><small>Justificativas</small></article>'
      +'</section>'
      +'<section class="at-main-grid">'
      +'<article class="at-card at-chart-card"><div class="at-card-head"><div><span class="at-card-kicker">Comparativo</span><strong>Taxa justificada por turma</strong></div><small>'+classList.length+' turma'+(classList.length===1?'':'s')+'</small></div><div class="at-chart-body">'
      +(byClass.length?'<div class="at-bars">'+byClass.map(item=>'<div class="at-bar-row"><div class="at-bar-meta"><strong>'+esc(item.c)+'</strong><small>'+item.count+' registro'+(item.count===1?'':'s')+'</small></div><div class="at-bar-track"><div class="at-bar-fill" style="width:'+Math.max(3,Math.min(100,item.value))+'%"></div></div><span class="at-bar-value">'+item.value.toFixed(1).replace(".",",")+'%</span></div>').join("")+'</div>':'<div class="at-empty-state"><span class="at-empty-icon">▤</span><strong>O gráfico aparecerá aqui</strong><p>Cadastre a primeira falta justificada para começar o acompanhamento por turma.</p>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>Adicionar primeiro registro</button>':'')+'</div>')
      +'</div></article>'
      +'<article class="at-card at-activity-card"><div class="at-card-head"><div><span class="at-card-kicker">Atividade</span><strong>Registros recentes</strong></div><button type="button" data-at-tab="records">Ver todos</button></div><div class="at-recent">'
      +(recent.length?recent.map(r=>'<article class="at-recent-item"><div class="at-recent-avatar">'+esc(String(r.student_name||"?").charAt(0).toUpperCase())+'</div><div><strong>'+esc(r.student_name)+'</strong><span>'+esc(r.class_name)+' · '+esc(r.reason)+'</span><small>'+fmtDate(r.absence_date)+(r.project_name?' · '+esc(r.project_name):'')+'</small></div></article>').join(""):'<div class="at-empty-state"><span class="at-empty-icon">○</span><strong>Nenhum registro recente</strong><p>Os últimos alunos com falta justificada aparecerão aqui.</p></div>')
      +'</div></article>'
      +'</section>'
      +'<section class="at-secondary-grid">'
      +'<article class="at-card at-highlight-card"><span class="at-card-kicker">Turma em destaque</span><strong>'+(biggest?esc(biggest.c):'Sem dados')+'</strong><p>'+(biggest?'Maior taxa média registrada no momento: '+biggest.value.toFixed(1).replace(".",",")+'%.':'A turma com maior taxa média aparecerá aqui quando houver registros.')+'</p></article>'
      +'<article class="at-card at-action-card"><span class="at-card-kicker">Acesso rápido</span><strong>Consultar ou registrar</strong><p>Use a lista para conferir justificativas antes de marcar uma falta não justificada.</p><div class="at-action-row"><button class="at-btn" type="button" data-at-tab="records">Abrir registros</button>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>Novo registro</button>':'')+'</div></article>'
      +'</section>';
  }

  function renderRecords(){
    const opts=classes().map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    root.querySelector("#atView").innerHTML='<section class="at-card at-records-card"><div class="at-records-top"><div><span class="at-card-kicker">Consulta</span><h2>Faltas justificadas</h2><p>Professores podem consultar aqui antes de registrar uma falta não justificada.</p></div>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div><div class="at-toolbar"><label class="at-search-wrap"><span>⌕</span><input id="atSearch" class="at-input" type="search" placeholder="Buscar aluno, motivo ou projeto"></label><select id="atClassFilter" class="at-select"><option value="">Todas as turmas</option>'+opts+'</select></div><div id="atTableWrap"></div></section>';
    root.querySelector("#atSearch")?.addEventListener("input",renderTable);root.querySelector("#atClassFilter")?.addEventListener("change",renderTable);renderTable();
  }

  function renderTable(){
    const wrap=root.querySelector("#atTableWrap");if(!wrap)return;const list=filteredRows();
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Justificativa</th><th>Projeto</th><th>Data</th><th>Taxa</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(r=>'<tr><td><div class="at-student-cell"><span>'+esc(String(r.student_name||"?").charAt(0).toUpperCase())+'</span><strong>'+esc(r.student_name)+'</strong></div></td><td><span class="at-badge">'+esc(r.class_name)+'</span></td><td>'+esc(r.reason)+'</td><td>'+esc(r.project_name||"Nenhum")+'</td><td>'+fmtDate(r.absence_date)+'</td><td><span class="at-rate">'+num(r.justified_rate).toFixed(1).replace(".",",")+'%</span></td>'+(canManage()?'<td><button class="at-icon-danger" title="Excluir" type="button" data-at-delete="'+esc(r.id)+'">×</button></td>':'')+'</tr>').join("")+'</tbody></table></div>':'<div class="at-empty-state compact"><span class="at-empty-icon">⌕</span><strong>Nenhum registro encontrado</strong><p>Ajuste os filtros ou cadastre uma nova falta justificada.</p></div>';
  }

  function roomPicker(){
    return '<div class="at-room-picker"><label>Turma</label><div class="at-room-groups">'+ROOMS.map(group=>'<section class="at-room-group '+(group.group==="GTU"?'gtu':'')+'"><div class="at-room-group-title"><span>'+esc(group.group)+'</span><small>'+esc(group.label)+'</small></div><div class="at-room-options">'+group.rooms.map(room=>'<label class="at-room-option"><input type="radio" name="atClass" value="'+esc(room)+'" required><span>'+esc(room)+'</span></label>').join("")+'</div></section>').join("")+'</div><span class="at-room-help">Selecione uma turma. Não é necessário digitar.</span></div>';
  }

  function renderForm(){
    if(!canManage()){activeTab="records";render();return;}
    root.querySelector("#atView").innerHTML='<section class="at-form-layout"><div class="at-form-intro"><span class="at-card-kicker">Novo registro</span><h2>Cadastrar falta justificada</h2><p>Registre a ausência para que os professores saibam que ela já foi justificada.</p><div class="at-form-note"><strong>Informação visível aos professores</strong><span>Após salvar, o registro aparece imediatamente na consulta do módulo.</span></div></div><div class="at-card at-form-card"><form id="atForm" class="at-form">'
      +'<div class="at-field full"><label>Aluno</label><input class="at-input" id="atStudent" required maxlength="160" placeholder="Nome completo do aluno"></div>'
      +roomPicker()
      +'<div class="at-field"><label>Data da falta</label><input class="at-input" id="atDate" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div>'
      +'<div class="at-field full"><label>Motivo da falta</label><textarea class="at-textarea" id="atReason" required maxlength="500" placeholder="Ex.: Atestado médico, consulta, acompanhamento..."></textarea></div>'
      +'<div class="at-field"><label>Projeto <span>opcional</span></label><input class="at-input" id="atProject" maxlength="160" placeholder="Nenhum ou nome do projeto"></div>'
      +'<div class="at-field"><label>Taxa justificada (%)</label><input class="at-input" id="atRate" type="number" min="0" max="100" step="0.1" required value="0"><span class="at-help">Será automatizada quando as turmas forem cadastradas.</span></div>'
      +'<div class="at-form-actions"><button class="at-btn" type="button" data-at-cancel>Cancelar</button><button class="at-btn primary" type="submit">Salvar falta justificada</button></div></form></div></section>';
    root.querySelector("#atForm")?.addEventListener("submit",saveRecord);
  }

  function render(){if(!root)return;root.querySelectorAll(".at-nav-item").forEach(b=>b.classList.toggle("active",b.dataset.atTab===activeTab));if(activeTab==="overview")renderOverview();else if(activeTab==="records")renderRecords();else renderForm();}
  async function load(){const c=client();if(!c){setStatus("Supabase indisponível",true);return;}setStatus("Sincronizando...");const{data,error}=await c.from(TABLE).select("*").order("absence_date",{ascending:false}).order("created_at",{ascending:false});if(error){console.error("Atestados:",error);setStatus("Falha ao carregar",true);return;}rows=data||[];setStatus("Atualizado");render();}
  async function saveRecord(event){event.preventDefault();if(!canManage())return;const c=client();if(!c)return;const selectedRoom=root.querySelector('input[name="atClass"]:checked');if(!selectedRoom){setStatus("Selecione uma turma",true);return;}const btn=event.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Salvando...";}const payload={student_name:root.querySelector("#atStudent").value.trim(),class_name:selectedRoom.value,reason:root.querySelector("#atReason").value.trim(),project_name:root.querySelector("#atProject").value.trim()||null,absence_date:root.querySelector("#atDate").value,justified_rate:num(root.querySelector("#atRate").value)};const{error}=await c.from(TABLE).insert(payload);if(btn){btn.disabled=false;btn.textContent="Salvar falta justificada";}if(error){console.error("Atestados:",error);setStatus("Não foi possível salvar",true);return;}activeTab="records";await load();}
  async function removeRecord(id){if(!canManage()||!id)return;const c=client();if(!c)return;const{error}=await c.from(TABLE).delete().eq("id",id);if(error){console.error("Atestados:",error);setStatus("Não foi possível excluir",true);return;}await load();}
  function setStatus(text,error){const el=root?.querySelector("#atStatus");if(!el)return;el.textContent=text;el.classList.toggle("error",!!error);}
  function subscribe(){const c=client();if(!c)return;if(channel){try{c.removeChannel(channel);}catch(_){}}channel=c.channel("ete-atestados-"+Math.random().toString(36).slice(2)).on("postgres_changes",{event:"*",schema:"public",table:TABLE},()=>load().catch(()=>{})).subscribe();}
  function bind(){root.addEventListener("click",event=>{const tab=event.target.closest("[data-at-tab]");if(tab){activeTab=tab.dataset.atTab;render();return;}if(event.target.closest("[data-at-new]")){activeTab="new";render();return;}if(event.target.closest("[data-at-cancel]")){activeTab="records";render();return;}const del=event.target.closest("[data-at-delete]");if(del)removeRecord(del.dataset.atDelete);});}
  async function mount(target){root=typeof target==="string"?document.querySelector(target):target;if(!root)return;root.innerHTML=shell();if(root.dataset.atestadosBound!=="1"){bind();root.dataset.atestadosBound="1";}await load();subscribe();}
  function unmount(){const c=client();if(channel&&c){try{c.removeChannel(channel);}catch(_){}}channel=null;root=null;}
  window.ETEAtestados=Object.freeze({mount,unmount,refresh:load});
})();