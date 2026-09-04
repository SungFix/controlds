(function initAtestados(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  let root=null;
  let rows=[];
  let activeTab="overview";
  let channel=null;
  let mounted=false;

  function user(){try{return typeof currentUser!=="undefined"?currentUser:null;}catch(_){return null;}}
  function role(){return String(user()?.role||"").toLowerCase();}
  function canManage(){return ["adm","diretor","vice_diretor"].includes(role());}
  function client(){try{return typeof sb!=="undefined"?sb:null;}catch(_){return null;}}
  function esc(value){return String(value??"").replace(/[&<>"']/g,function(c){return({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c];});}
  function fmtDate(value){if(!value)return"—";const d=new Date(value+"T12:00:00");return d.toLocaleDateString("pt-BR");}
  function num(value){const n=Number(value);return Number.isFinite(n)?n:0;}

  function shell(){
    return '<section class="ete-atestados">'
      +'<div class="at-top"><div class="at-title"><span class="ete-portal-kicker">Gestão de frequência</span><h1>Atestados</h1><p>Registre faltas justificadas e deixe a informação disponível para professores sem misturar dados com o Control Ds.</p></div><div class="at-actions">'
      +(canManage()?'<button class="at-btn primary" type="button" data-at-new>Novo registro</button>':'')
      +'<span class="at-status" id="atStatus">Sincronizando...</span></div></div>'
      +'<div class="at-tabs"><button class="at-tab active" data-at-tab="overview" type="button">Visão geral</button><button class="at-tab" data-at-tab="records" type="button">Registros</button>'
      +(canManage()?'<button class="at-tab" data-at-tab="new" type="button">Cadastrar</button>':'')
      +'</div><div id="atView"></div></section>';
  }

  function filteredRows(){
    const q=String(root?.querySelector("#atSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const cls=String(root?.querySelector("#atClassFilter")?.value||"");
    return rows.filter(r=>{
      const hay=[r.student_name,r.class_name,r.reason,r.project_name].join(" ").toLocaleLowerCase("pt-BR");
      return (!q||hay.includes(q))&&(!cls||r.class_name===cls);
    });
  }

  function classes(){return [...new Set(rows.map(r=>String(r.class_name||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));}
  function avg(list){return list.length?list.reduce((s,r)=>s+num(r.justified_rate),0)/list.length:0;}

  function renderOverview(){
    const total=rows.length;
    const classList=classes();
    const today=new Date().toISOString().slice(0,10);
    const todayCount=rows.filter(r=>r.absence_date===today).length;
    const overall=avg(rows);
    const byClass=classList.map(c=>{const list=rows.filter(r=>r.class_name===c);return{c,value:avg(list),count:list.length};}).sort((a,b)=>b.value-a.value);
    const recent=[...rows].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5);
    root.querySelector("#atView").innerHTML=''
      +'<div class="at-kpis">'
      +'<article class="at-kpi"><small>Registros justificados</small><strong>'+total+'</strong><span>Total cadastrado</span></article>'
      +'<article class="at-kpi"><small>Turmas com registros</small><strong>'+classList.length+'</strong><span>Turmas diferentes</span></article>'
      +'<article class="at-kpi"><small>Taxa média</small><strong>'+overall.toFixed(1).replace(".",",")+'%</strong><span>Média informada</span></article>'
      +'<article class="at-kpi"><small>Hoje</small><strong>'+todayCount+'</strong><span>Faltas justificadas</span></article>'
      +'</div>'
      +'<div class="at-grid">'
      +'<section class="at-panel"><div class="at-panel-head"><strong>Taxa de faltas justificadas por turma</strong><small>Média dos registros cadastrados</small></div><div class="at-panel-body"><div class="at-bars">'
      +(byClass.length?byClass.map(item=>'<div class="at-bar-row"><span class="at-bar-label">'+esc(item.c)+'</span><div class="at-bar-track"><div class="at-bar-fill" style="width:'+Math.max(2,Math.min(100,item.value))+'%"></div></div><span class="at-bar-value">'+item.value.toFixed(1).replace(".",",")+'%</span></div>').join(""):'<div class="at-empty">Nenhum dado para gerar o gráfico ainda.</div>')
      +'</div></div></section>'
      +'<section class="at-panel"><div class="at-panel-head"><strong>Registros recentes</strong><small>Últimas justificativas</small></div><div class="at-panel-body"><div class="at-recent">'
      +(recent.length?recent.map(r=>'<article class="at-recent-item"><strong>'+esc(r.student_name)+'</strong><span>'+esc(r.class_name)+' · '+esc(r.reason)+'</span><small>'+fmtDate(r.absence_date)+(r.project_name?' · Projeto: '+esc(r.project_name):' · Sem projeto')+'</small></article>').join(""):'<div class="at-empty">Nenhuma falta justificada cadastrada.</div>')
      +'</div></div></section></div>';
  }

  function renderRecords(){
    const opts=classes().map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    root.querySelector("#atView").innerHTML=''
      +'<section class="at-panel"><div class="at-panel-head"><strong>Faltas justificadas</strong><small>'+rows.length+' registros</small></div><div class="at-panel-body"><div class="at-toolbar"><input id="atSearch" class="at-input" type="search" placeholder="Buscar aluno, turma, motivo ou projeto"><select id="atClassFilter" class="at-select"><option value="">Todas as turmas</option>'+opts+'</select></div></div><div id="atTableWrap"></div></section>';
    const refresh=()=>renderTable();
    root.querySelector("#atSearch")?.addEventListener("input",refresh);
    root.querySelector("#atClassFilter")?.addEventListener("change",refresh);
    renderTable();
  }

  function renderTable(){
    const wrap=root.querySelector("#atTableWrap");if(!wrap)return;
    const list=filteredRows();
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Motivo</th><th>Projeto</th><th>Data</th><th>Taxa</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'
      +list.map(r=>'<tr><td><strong>'+esc(r.student_name)+'</strong></td><td><span class="at-badge">'+esc(r.class_name)+'</span></td><td>'+esc(r.reason)+'</td><td>'+esc(r.project_name||"Nenhum")+'</td><td>'+fmtDate(r.absence_date)+'</td><td><span class="at-rate">'+num(r.justified_rate).toFixed(1).replace(".",",")+'%</span></td>'+(canManage()?'<td><button class="at-btn danger" type="button" data-at-delete="'+esc(r.id)+'">Excluir</button></td>':'')+'</tr>').join("")
      +'</tbody></table></div>':'<div class="at-empty">Nenhum registro encontrado.</div>';
  }

  function renderForm(){
    if(!canManage()){activeTab="records";render();return;}
    root.querySelector("#atView").innerHTML='<section class="at-panel"><div class="at-panel-head"><strong>Novo registro</strong><small>Gestão</small></div><div class="at-panel-body"><form id="atForm" class="at-form">'
      +'<div class="at-field"><label>Nome do aluno</label><input class="at-input" id="atStudent" required maxlength="160" placeholder="Ex.: João da Silva"></div>'
      +'<div class="at-field"><label>Turma</label><input class="at-input" id="atClass" required maxlength="40" placeholder="Ex.: 2ADS"></div>'
      +'<div class="at-field full"><label>Motivo da falta</label><textarea class="at-textarea" id="atReason" required maxlength="500" placeholder="Ex.: Atestado médico, consulta, acompanhamento..."></textarea></div>'
      +'<div class="at-field"><label>Projeto</label><input class="at-input" id="atProject" maxlength="160" placeholder="Nenhum ou nome do projeto"><span class="at-help">Pode deixar vazio quando o aluno não estiver em projeto.</span></div>'
      +'<div class="at-field"><label>Data da falta</label><input class="at-input" id="atDate" type="date" required value="'+new Date().toISOString().slice(0,10)+'"></div>'
      +'<div class="at-field"><label>Taxa de falta justificada (%)</label><input class="at-input" id="atRate" type="number" min="0" max="100" step="0.1" required value="0"><span class="at-help">Depois poderá ser calculada automaticamente quando as turmas estiverem cadastradas.</span></div>'
      +'<div class="at-form-actions"><button class="at-btn" type="button" data-at-cancel>Cancelar</button><button class="at-btn primary" type="submit">Salvar registro</button></div>'
      +'</form></div></section>';
    root.querySelector("#atForm")?.addEventListener("submit",saveRecord);
  }

  function render(){
    if(!root)return;
    root.querySelectorAll(".at-tab").forEach(b=>b.classList.toggle("active",b.dataset.atTab===activeTab));
    if(activeTab==="overview")renderOverview();else if(activeTab==="records")renderRecords();else renderForm();
  }

  async function load(){
    const c=client();if(!c){setStatus("Supabase indisponível",true);return;}
    setStatus("Sincronizando...");
    const {data,error}=await c.from(TABLE).select("*").order("absence_date",{ascending:false}).order("created_at",{ascending:false});
    if(error){console.error("Atestados:",error);setStatus("Falha ao carregar",true);return;}
    rows=data||[];setStatus("Atualizado");render();
  }

  async function saveRecord(event){
    event.preventDefault();if(!canManage())return;
    const c=client();if(!c)return;
    const btn=event.currentTarget.querySelector('button[type="submit"]');if(btn){btn.disabled=true;btn.textContent="Salvando...";}
    const payload={student_name:root.querySelector("#atStudent").value.trim(),class_name:root.querySelector("#atClass").value.trim().toUpperCase(),reason:root.querySelector("#atReason").value.trim(),project_name:root.querySelector("#atProject").value.trim()||null,absence_date:root.querySelector("#atDate").value,justified_rate:num(root.querySelector("#atRate").value)};
    const {error}=await c.from(TABLE).insert(payload);
    if(btn){btn.disabled=false;btn.textContent="Salvar registro";}
    if(error){console.error("Atestados:",error);setStatus("Não foi possível salvar",true);return;}
    activeTab="records";await load();
  }

  async function removeRecord(id){
    if(!canManage()||!id)return;
    const c=client();if(!c)return;
    const {error}=await c.from(TABLE).delete().eq("id",id);
    if(error){console.error("Atestados:",error);setStatus("Não foi possível excluir",true);return;}
    await load();
  }

  function setStatus(text,error){const el=root?.querySelector("#atStatus");if(!el)return;el.textContent=text;el.classList.toggle("error",!!error);}

  function subscribe(){
    const c=client();if(!c)return;
    if(channel){try{c.removeChannel(channel);}catch(_){}}
    channel=c.channel("ete-atestados-"+Math.random().toString(36).slice(2)).on("postgres_changes",{event:"*",schema:"public",table:TABLE},function(){load().catch(()=>{});}).subscribe();
  }

  function bind(){
    root.addEventListener("click",function(event){
      const tab=event.target.closest("[data-at-tab]");if(tab){activeTab=tab.dataset.atTab;render();return;}
      if(event.target.closest("[data-at-new]")){activeTab="new";render();return;}
      if(event.target.closest("[data-at-cancel]")){activeTab="records";render();return;}
      const del=event.target.closest("[data-at-delete]");if(del){removeRecord(del.dataset.atDelete);}
    });
  }

  async function mount(target){
    root=typeof target==="string"?document.querySelector(target):target;
    if(!root)return;
    root.innerHTML=shell();
    if(!mounted){bind();mounted=true;}
    await load();subscribe();
  }

  function unmount(){const c=client();if(channel&&c){try{c.removeChannel(channel);}catch(_){}}channel=null;root=null;mounted=false;}

  window.ETEAtestados=Object.freeze({mount,unmount,refresh:load});
})();
