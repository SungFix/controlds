(function initAtestados(){
  "use strict";

  const TABLE="ete_atestados_justified_absences";
  const ROOMS=[
    {group:"DS",rooms:["1º DS A","1º DS B","2º DS A","2º DS B"]},
    {group:"EDF",rooms:["1º EDF A","1º EDF B","2º EDF A","2º EDF B","3º EDF A","3º EDF B"]},
    {group:"GTU",rooms:["3º GTU"]}
  ];
  const REASONS=[
    {code:"doenca",label:"Doença"},
    {code:"obrigacoes_legais",label:"Cumprimento de obrigações legais"},
    {code:"intercambio",label:"Intercâmbio"},
    {code:"outro",label:"Outro motivo justificado",note:true},
    {code:"projeto",label:"Projeto / atividade escolar",project:true}
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
  function fmtDate(v){if(!v)return"—";return new Date(v+"T12:00:00").toLocaleDateString("pt-BR");}
  function fmtTime(v){return v?String(v).slice(0,5):"";}
  function initials(name){return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("")||"?";}
  function classes(list=rows){return [...new Set(list.map(r=>String(r.class_name||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR"));}
  function today(){
    const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return `${map.year}-${map.month}-${map.day}`;
  }
  function monthKey(){return today().slice(0,7);}
  function reasonMeta(code){return REASONS.find(item=>item.code===code)||null;}
  function reasonNames(row){
    const codes=Array.isArray(row?.reason_codes)?row.reason_codes.filter(Boolean):[];
    if(codes.length)return codes.map(code=>reasonMeta(code)?.label||String(code));
    const legacy=String(row?.reason||"").trim();
    return legacy?[legacy]:["Não informado"];
  }
  function reasonDisplay(row){
    const names=reasonNames(row);
    const note=String(row?.reason_note||"").trim();
    if(note&&Array.isArray(row?.reason_codes)&&row.reason_codes.includes("outro")){
      return names.map(name=>name==="Outro motivo justificado"?name+": "+note:name).join(" · ");
    }
    return names.join(" · ");
  }
  function periodText(row){
    if(row?.absence_scope==="partial"){
      const start=fmtTime(row.absence_start_time),end=fmtTime(row.absence_end_time);
      return start&&end?start+"–"+end:"Horário específico";
    }
    return "Dia inteiro";
  }

  function icon(name){
    const icons={
      doc:'<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5M10 15h5"/></svg>',
      users:'<svg viewBox="0 0 24 24"><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.5 2.5 0 1 0 0-5M3 19c.3-3 2-4.5 5-4.5s4.7 1.5 5 4.5M14 14.8c2.8.1 4.4 1.5 4.8 4.2"/></svg>',
      today:'<svg viewBox="0 0 24 24"><rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3"/></svg>',
      project:'<svg viewBox="0 0 24 24"><path d="M4 7.5h6l2 2h8v10H4z"/><path d="M4 7.5V5h6l2 2"/></svg>',
      search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>'
    };
    return icons[name]||icons.doc;
  }

  function shell(){
    return '<section class="ete-atestados">'
      +'<header class="at-page-head"><div class="at-heading"><h1>Atestados</h1><p>Faltas justificadas para consulta da equipe escolar.</p></div><div class="at-head-actions"><span class="at-status" id="atStatus" role="status" aria-live="polite">Sincronizando...</span>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div></header>'
      +'<nav class="at-nav" aria-label="Navegação do módulo"><button class="at-nav-item active" data-at-tab="overview" type="button">Visão geral</button><button class="at-nav-item" data-at-tab="records" type="button">Registros</button><button class="at-nav-item" data-at-tab="reports" type="button">Relatórios</button>'+(canManage()?'<button class="at-nav-item" data-at-tab="new" type="button">Cadastrar</button>':'')+'</nav>'
      +'<div id="atView" class="at-view"></div></section>';
  }

  function metric(label,value,sub,kind){return '<article class="at-metric"><span class="at-metric-icon">'+icon(kind)+'</span><div><strong>'+value+'</strong><span>'+label+'</span><small>'+sub+'</small></div></article>';}

  function rowHtml(r){
    return '<tr><td><div class="at-student-cell"><span class="at-avatar">'+esc(initials(r.student_name))+'</span><div><strong>'+esc(r.student_name)+'</strong><small>'+esc(reasonDisplay(r))+'</small></div></div></td><td><span class="at-badge">'+esc(r.class_name||"—")+'</span></td><td>'+fmtDate(r.absence_date)+'</td><td><span class="at-period-badge">'+esc(periodText(r))+'</span></td><td>'+esc(r.project_name||"Nenhum")+'</td>'+(canManage()?'<td><button class="at-icon-danger" aria-label="Excluir registro de '+esc(r.student_name)+'" title="Excluir registro" type="button" data-at-delete="'+esc(r.id)+'">×</button></td>':'')+'</tr>';
  }

  function filteredRows(){
    const q=String(root?.querySelector("#atSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const cls=String(root?.querySelector("#atClassFilter")?.value||"");
    const mode=String(root?.querySelector("[data-at-filter].active")?.dataset.atFilter||"all");
    return rows.filter(r=>{
      const hay=[r.student_name,r.class_name,reasonDisplay(r),r.project_name,periodText(r)].join(" ").toLocaleLowerCase("pt-BR");
      const modeOk=mode==="all"||(mode==="today"&&r.absence_date===today());
      return (!q||hay.includes(q))&&(!cls||r.class_name===cls)&&modeOk;
    });
  }

  function countBy(list,keyFn){
    const map=new Map();
    list.forEach(item=>{const key=String(keyFn(item)||"Não informado");map.set(key,(map.get(key)||0)+1);});
    return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR"));
  }

  function reasonCounts(list){
    const map=new Map();
    list.forEach(row=>reasonNames(row).forEach(name=>map.set(name,(map.get(name)||0)+1)));
    return [...map.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"pt-BR"));
  }

  function bars(items){
    if(!items.length)return '<div class="at-empty-state compact" role="status"><strong>Sem dados</strong><span>Os indicadores aparecerão após os primeiros registros.</span></div>';
    const max=Math.max(...items.map(item=>item[1]),1);
    return '<div class="at-class-chart">'+items.map(([name,count])=>'<div class="at-class-chart-row"><div><strong>'+esc(name)+'</strong><small>'+count+' registro'+(count===1?'':'s')+'</small></div><div class="at-class-chart-track"><span style="width:'+Math.max(4,Math.round(count/max*100))+'%"></span></div><b>'+count+'</b></div>').join("")+'</div>';
  }

  function renderOverview(){
    const cls=classes();
    const todayRows=rows.filter(r=>r.absence_date===today());
    const projectRows=rows.filter(r=>String(r.project_name||"").trim());
    const view=root.querySelector("#atView");
    if(!view)return;
    view.innerHTML=''
      +'<section class="at-metrics">'+metric("Faltas justificadas",rows.length,"Total registrado","doc")+metric("Turmas ativas",cls.length,"Com registros","users")+metric("Hoje",todayRows.length,"Faltas justificadas","today")+metric("Projetos",projectRows.length,"Registros vinculados","project")+'</section>'
      +'<section class="at-dashboard-grid">'
      +'<article class="at-card at-main-records"><div class="at-card-head at-main-head"><div><strong>Faltas justificadas</strong><small>Registros mais recentes</small></div><button type="button" data-at-tab="records">Ver todos</button></div><div class="at-overview-toolbar"><div class="at-filter-tabs"><button class="active" type="button" data-at-filter="all">Todos <span>'+rows.length+'</span></button><button type="button" data-at-filter="today">Hoje <span>'+todayRows.length+'</span></button></div></div><div class="at-inline-search"><label><span>'+icon("search")+'</span><input id="atSearch" class="at-input" type="search" aria-label="Pesquisar registros" placeholder="Pesquisar aluno, turma, justificativa ou projeto"></label><select id="atClassFilter" class="at-select" aria-label="Filtrar por turma"><option value="">Todas as turmas</option>'+cls.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("")+'</select></div><div id="atTableWrap"></div></article>'
      +'<aside class="at-side-stack"><article class="at-card at-class-chart-card"><div class="at-card-head"><div><strong>Registros por turma</strong><small>Quantidade de faltas justificadas</small></div></div>'+bars(countBy(rows,r=>r.class_name))+'</article></aside>'
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
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Período</th><th>Projeto</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(rowHtml).join("")+'</tbody></table></div>':'<div class="at-empty-state" role="status"><strong>Nenhum registro encontrado</strong><span>Ajuste os filtros ou cadastre uma falta justificada.</span>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div>';
  }

  function renderRecords(){
    const opts=classes().map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    const view=root.querySelector("#atView");
    if(!view)return;
    view.innerHTML='<section class="at-card at-records-card"><div class="at-records-top"><div><h2>Todos os registros</h2><p>Consulte por aluno, turma, justificativa, período ou projeto.</p></div>'+(canManage()?'<button class="at-btn primary" type="button" data-at-new>+ Novo registro</button>':'')+'</div><div class="at-toolbar"><label class="at-search-wrap"><span>'+icon("search")+'</span><input id="atSearch" class="at-input" type="search" aria-label="Buscar registros" placeholder="Buscar aluno, justificativa ou projeto"></label><select id="atClassFilter" class="at-select" aria-label="Filtrar registros por turma"><option value="">Todas as turmas</option>'+opts+'</select></div><div id="atTableWrap"></div></section>';
    root.querySelector("#atSearch")?.addEventListener("input",renderTable);
    root.querySelector("#atClassFilter")?.addEventListener("change",renderTable);
    renderTable();
  }

  function renderTable(){
    const wrap=root?.querySelector("#atTableWrap");
    if(!wrap)return;
    const list=filteredRows();
    wrap.innerHTML=list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Período</th><th>Projeto</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(rowHtml).join("")+'</tbody></table></div>':'<div class="at-empty-state" role="status"><strong>Nenhum registro encontrado</strong><span>Ajuste a busca ou o filtro de turma.</span></div>';
  }

  function reportFilteredRows(){
    const q=String(root?.querySelector("#atReportSearch")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const cls=String(root?.querySelector("#atReportClass")?.value||"");
    return rows.filter(r=>{
      const hay=[r.student_name,r.class_name,reasonDisplay(r),r.project_name,periodText(r)].join(" ").toLocaleLowerCase("pt-BR");
      return (!q||hay.includes(q))&&(!cls||r.class_name===cls);
    });
  }

  function renderReports(){
    const view=root.querySelector("#atView");
    if(!view)return;
    const opts=classes().map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join("");
    view.innerHTML='<section class="at-card at-records-card"><div class="at-records-top"><div><h2>Relatórios</h2><p>Filtre por nome do aluno ou turma e exporte apenas o resultado exibido.</p></div><button class="at-btn" type="button" data-at-export>Exportar CSV</button></div><div class="at-report-filterbar"><label class="at-search-wrap"><span>'+icon("search")+'</span><input id="atReportSearch" class="at-input" type="search" aria-label="Filtrar relatório por aluno" placeholder="Nome do aluno"></label><select id="atReportClass" class="at-select" aria-label="Filtrar relatório por turma"><option value="">Todas as turmas</option>'+opts+'</select></div><div id="atReportResults"></div></section>';
    root.querySelector("#atReportSearch")?.addEventListener("input",renderReportResults);
    root.querySelector("#atReportClass")?.addEventListener("change",renderReportResults);
    root.querySelector("[data-at-export]")?.addEventListener("click",exportCsv);
    renderReportResults();
  }

  function renderReportResults(){
    const target=root?.querySelector("#atReportResults");
    if(!target)return;
    const list=reportFilteredRows();
    const currentMonth=monthKey();
    const monthRows=list.filter(r=>String(r.absence_date||"").startsWith(currentMonth));
    const todayRows=list.filter(r=>r.absence_date===today());
    const projects=list.filter(r=>String(r.project_name||"").trim());
    const byClass=countBy(list,r=>r.class_name);
    const byReason=reasonCounts(list);
    target.innerHTML='<section class="at-metrics at-report-metrics-clean">'+metric("Total",list.length,"No filtro atual","doc")+metric("Mês atual",monthRows.length,"Registros no mês","today")+metric("Hoje",todayRows.length,"Ocorrências","today")+metric("Projetos",projects.length,"Vinculados ao filtro","project")+'</section><section class="at-report-grid-clean"><article class="at-card"><div class="at-card-head"><div><strong>Por turma</strong><small>Quantidade de registros</small></div></div>'+bars(byClass)+'</article><article class="at-card"><div class="at-card-head"><div><strong>Por justificativa</strong><small>Motivos selecionados</small></div></div>'+bars(byReason)+'</article></section><section class="at-report-table-card"><div class="at-card-head"><div><strong>Registros do filtro</strong><small>'+list.length+' resultado'+(list.length===1?'':'s')+'</small></div></div>'+(list.length?'<div class="at-table-wrap"><table class="at-table"><thead><tr><th>Aluno</th><th>Turma</th><th>Data</th><th>Período</th><th>Projeto</th>'+(canManage()?'<th></th>':'')+'</tr></thead><tbody>'+list.map(rowHtml).join("")+'</tbody></table></div>':'<div class="at-empty-state compact"><strong>Nenhum resultado</strong><span>Altere o nome ou a turma selecionada.</span></div>')+'</section>';
  }

  function exportCsv(){
    const list=reportFilteredRows();
    const head=["Aluno","Turma","Data","Período","Início","Fim","Justificativas","Detalhe","Projeto"];
    const lines=[head,...list.map(r=>[r.student_name,r.class_name,fmtDate(r.absence_date),r.absence_scope==="partial"?"Horário específico":"Dia inteiro",fmtTime(r.absence_start_time),fmtTime(r.absence_end_time),reasonNames(r).join(" | "),r.reason_note||"",r.project_name||""])].map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";"));
    const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download="relatorio-atestados.csv";
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),500);
  }

  function roomPicker(){
    return '<div class="at-room-picker"><label>Turma</label><div class="at-room-groups">'+ROOMS.map(group=>'<section class="at-room-group"><div class="at-room-group-title"><span>'+esc(group.group)+'</span></div><div class="at-room-options">'+group.rooms.map(room=>'<label class="at-room-option"><input type="radio" name="atClass" value="'+esc(room)+'" required><span>'+esc(room)+'</span></label>').join("")+'</div></section>').join("")+'</div><span class="at-room-help">Selecione a turma.</span></div>';
  }

  function reasonPicker(){
    return '<div class="at-field full"><label>Justificativas tabeladas</label><div class="at-reason-list">'+REASONS.map(item=>'<label class="at-reason-option"><input type="checkbox" name="atReason" value="'+esc(item.code)+'"><span><strong>'+esc(item.label)+'</strong><small>'+(item.project?'Marque para vincular o nome do projeto.':item.note?'Use o campo de detalhe para especificar o motivo.':'Motivo de falta justificada.')+'</small></span></label>').join("")+'</div><small class="at-field-help">Selecione uma ou mais opções. A lista pode ser ampliada conforme o cadastro usado pela escola no SIEPE.</small></div>';
  }

  function renderForm(){
    if(!canManage()){activeTab="records";render();return;}
    const view=root.querySelector("#atView");
    if(!view)return;
    view.innerHTML='<section class="at-form-layout"><aside class="at-form-intro"><span class="at-eyebrow">NOVO REGISTRO</span><h2>Falta justificada</h2><p>Registre quem faltou, quando ocorreu e qual justificativa foi utilizada.</p><div class="at-form-steps"><div><b>1</b><span>Identifique aluno e turma</span></div><div><b>2</b><span>Informe a data e o período</span></div><div><b>3</b><span>Marque a justificativa</span></div><div><b>4</b><span>Adicione projeto ou detalhe, se necessário</span></div></div><div class="at-form-note"><strong>Taxa removida</strong><span>A porcentagem de justificativa não é mais solicitada nem exibida.</span></div></aside><div class="at-card at-form-card"><form id="atForm" class="at-form"><div class="at-field full"><label for="atStudent">Nome do aluno</label><input class="at-input" id="atStudent" required maxlength="160" placeholder="Nome completo do aluno"></div>'+roomPicker()+'<div class="at-field"><label for="atDate">Data da falta</label><input class="at-input" id="atDate" type="date" required value="'+today()+'"></div><div class="at-field"><label>Período da falta</label><div class="at-choice-grid"><label class="at-choice-card"><input type="radio" name="atAbsenceScope" value="full_day" checked><span><strong>Dia inteiro</strong><small>Ausência durante todo o dia</small></span></label><label class="at-choice-card"><input type="radio" name="atAbsenceScope" value="partial"><span><strong>Horário específico</strong><small>Informe início e fim</small></span></label></div></div><div class="at-time-grid full" id="atTimeFields" hidden><div class="at-field"><label for="atStartTime">Início</label><input class="at-input" id="atStartTime" type="time"></div><div class="at-field"><label for="atEndTime">Fim</label><input class="at-input" id="atEndTime" type="time"></div></div>'+reasonPicker()+'<div class="at-field full at-dependent-field" id="atReasonNoteField" hidden><label for="atReasonNote">Detalhe do outro motivo</label><input class="at-input" id="atReasonNote" maxlength="240" placeholder="Informe o motivo cadastrado no SIEPE"></div><div class="at-field full at-dependent-field" id="atProjectField" hidden><label for="atProject">Nome do projeto</label><input class="at-input" id="atProject" maxlength="160" placeholder="Nome do projeto ou atividade"></div><div class="at-form-actions"><button class="at-btn" type="button" data-at-cancel>Cancelar</button><button class="at-btn primary" type="submit">Salvar falta justificada</button></div></form></div></section>';
    root.querySelector("#atForm")?.addEventListener("submit",saveRecord);
    root.querySelectorAll('input[name="atAbsenceScope"]').forEach(input=>input.addEventListener("change",syncScopeFields));
    root.querySelectorAll('input[name="atReason"]').forEach(input=>input.addEventListener("change",syncReasonFields));
    syncScopeFields();
    syncReasonFields();
  }

  function syncScopeFields(){
    const partial=root?.querySelector('input[name="atAbsenceScope"]:checked')?.value==="partial";
    const wrap=root?.querySelector("#atTimeFields"),start=root?.querySelector("#atStartTime"),end=root?.querySelector("#atEndTime");
    if(wrap)wrap.hidden=!partial;
    if(start){start.required=partial;if(!partial)start.value="";}
    if(end){end.required=partial;if(!partial)end.value="";}
  }

  function syncReasonFields(){
    const codes=[...root?.querySelectorAll('input[name="atReason"]:checked')||[]].map(input=>input.value);
    const project=codes.includes("projeto"),other=codes.includes("outro");
    const projectField=root?.querySelector("#atProjectField"),projectInput=root?.querySelector("#atProject");
    const noteField=root?.querySelector("#atReasonNoteField"),noteInput=root?.querySelector("#atReasonNote");
    if(projectField)projectField.hidden=!project;
    if(projectInput){projectInput.required=project;if(!project)projectInput.value="";}
    if(noteField)noteField.hidden=!other;
    if(noteInput){noteInput.required=other;if(!other)noteInput.value="";}
  }

  function render(){
    if(!root)return;
    root.querySelectorAll(".at-nav-item").forEach(button=>button.classList.toggle("active",button.dataset.atTab===activeTab));
    if(activeTab==="overview")renderOverview();
    else if(activeTab==="records")renderRecords();
    else if(activeTab==="reports")renderReports();
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
    const selectedClass=root.querySelector('input[name="atClass"]:checked');
    if(!selectedClass){setStatus("Selecione uma turma",true);return;}
    const reasonCodes=[...root.querySelectorAll('input[name="atReason"]:checked')].map(input=>input.value);
    if(!reasonCodes.length){setStatus("Selecione uma justificativa",true);return;}
    const scope=root.querySelector('input[name="atAbsenceScope"]:checked')?.value||"full_day";
    const start=scope==="partial"?root.querySelector("#atStartTime")?.value||"":null;
    const end=scope==="partial"?root.querySelector("#atEndTime")?.value||"":null;
    if(scope==="partial"&&(!start||!end||end<=start)){setStatus("Confira o horário da falta",true);return;}
    const projectName=reasonCodes.includes("projeto")?root.querySelector("#atProject")?.value.trim()||"":null;
    if(reasonCodes.includes("projeto")&&!projectName){setStatus("Informe o nome do projeto",true);return;}
    const reasonNote=reasonCodes.includes("outro")?root.querySelector("#atReasonNote")?.value.trim()||"":null;
    if(reasonCodes.includes("outro")&&!reasonNote){setStatus("Detalhe o outro motivo",true);return;}
    const labels=reasonCodes.map(code=>reasonMeta(code)?.label||code);
    const readable=labels.map(label=>label==="Outro motivo justificado"&&reasonNote?label+": "+reasonNote:label).join(" · ");
    const button=event.currentTarget.querySelector('button[type="submit"]');
    if(button){button.disabled=true;button.setAttribute("aria-busy","true");button.textContent="Salvando...";}
    try{
      const payload={
        student_name:root.querySelector("#atStudent").value.trim(),
        class_name:selectedClass.value,
        reason:readable,
        reason_codes:reasonCodes,
        reason_note:reasonNote||null,
        project_name:projectName||null,
        absence_date:root.querySelector("#atDate").value,
        absence_scope:scope,
        absence_start_time:start||null,
        absence_end_time:end||null
      };
      const {error}=await c.from(TABLE).insert(payload);
      if(error){console.error("Atestados:",error);setStatus("Não foi possível salvar",true);return;}
      activeTab="records";
      await load();
    }catch(error){
      console.error("Atestados:",error);
      setStatus("Não foi possível salvar",true);
    }finally{
      if(button){button.disabled=false;button.removeAttribute("aria-busy");button.textContent="Salvar falta justificada";}
    }
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
