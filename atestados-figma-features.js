(function initAtestadosFigmaFeatures(){
"use strict";

const TABLE="ete_atestados_justified_absences";
let reportRows=[];
let overviewToken=0;

function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));}
function client(){try{return typeof sb!=="undefined"?sb:null}catch(_){return null}}
function fmt(v){if(!v)return"—";return new Date(v+"T12:00:00").toLocaleDateString("pt-BR")}
function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
function isoToday(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Recife",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const map=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}
function monthKey(){return isoToday().slice(0,7)}
function daysAgoIso(days){const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-days);return d.toISOString().slice(0,10)}
function reasonType(reason){
  const s=String(reason||"").toLowerCase();
  if(/atestado|m[eé]dic|doen|sa[uú]de|gripe|febre/.test(s))return"Atestado médico";
  if(/consulta|exame|dentista/.test(s))return"Consulta";
  if(/fam[ií]l|acompan|respons[aá]vel/.test(s))return"Questões familiares";
  if(/viag|interc[aâ]mbio|projeto|evento|competi/.test(s))return"Projeto / atividade";
  if(/transport|[oô]nibus|locomo/.test(s))return"Transporte";
  return"Outro";
}
function initials(name){return String(name||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("")||"?"}
function navIcon(){return '<span class="at-control-navicon"><svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7"/></svg></span>'}
function icon(name){
  const all={
    calendar:'<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    users:'<svg viewBox="0 0 24 24"><path d="M8 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a2.5 2.5 0 1 0 0-5M3 19c.4-3 2-4.5 5-4.5s4.7 1.5 5 4.5M14 14.8c2.8.1 4.4 1.5 4.8 4.2"/></svg>',
    chart:'<svg viewBox="0 0 24 24"><path d="M5 19V9M12 19V5M19 19v-7"/></svg>',
    clock:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></svg>',
    file:'<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 16h5"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
    arrow:'<svg viewBox="0 0 24 24"><path d="M5 12h14M15 8l4 4-4 4"/></svg>'
  };
  return all[name]||all.file;
}

function addReportTab(module){
  const nav=module.querySelector(".at-nav");
  if(!nav||nav.querySelector("[data-at-report]"))return;
  const b=document.createElement("button");
  b.type="button";
  b.className="at-nav-item";
  b.dataset.atReport="1";
  b.innerHTML=navIcon()+"Relatórios";
  b.addEventListener("click",()=>renderReports(module,b));
  nav.appendChild(b);
}

function topbar(module,title,sub){
  const t=module.querySelector(".at-app-top-title strong");
  const s=module.querySelector(".at-app-top-title small");
  if(t)t.textContent=title;
  if(s)s.textContent=sub;
}

function countBy(rows,keyFn){
  const map={};
  rows.forEach(r=>{const key=keyFn(r)||"Não informado";map[key]=(map[key]||0)+1});
  return Object.entries(map).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),"pt-BR"));
}

function bars(items,total,limit=8){
  const list=items.slice(0,limit);
  if(!list.length)return '<div class="at-school-empty compact"><strong>Sem dados suficientes</strong><span>Os indicadores aparecerão conforme os registros forem cadastrados.</span></div>';
  return '<div class="at-report-bars">'+list.map(([name,count],i)=>'<div class="at-report-row"><div><strong>'+esc(name)+'</strong><small>'+count+' registro'+(count===1?'':'s')+'</small></div><div class="at-report-track"><span style="width:'+Math.max(4,total?count/total*100:0)+'%" data-rank="'+(i+1)+'"></span></div><b>'+Math.round(total?count/total*100:0)+'%</b></div>').join("")+'</div>';
}

function recordCard(r){
  const type=reasonType(r.reason);
  const project=r.project_name?'<span class="at-school-chip project">'+esc(r.project_name)+'</span>':"";
  return '<article class="at-school-record"><div class="at-school-record-avatar">'+esc(initials(r.student_name))+'</div><div class="at-school-record-main"><div class="at-school-record-title"><strong>'+esc(r.student_name)+'</strong><span>'+fmt(r.absence_date)+'</span></div><div class="at-school-record-meta"><span class="at-school-chip class">'+esc(r.class_name||"Sem turma")+'</span><span class="at-school-chip reason">'+esc(type)+'</span>'+project+'</div><p>'+esc(r.reason||"Motivo não informado")+'</p></div><div class="at-school-record-rate"><strong>'+num(r.justified_rate).toFixed(1).replace(".",",")+'%</strong><span>taxa informada</span></div></article>';
}

function quickAction(iconName,title,sub,attr){
  return '<button class="at-school-action" type="button" '+attr+'><span class="at-school-action-icon">'+icon(iconName)+'</span><span><strong>'+title+'</strong><small>'+sub+'</small></span><span class="at-school-action-arrow">'+icon("arrow")+'</span></button>';
}

async function renderProfessionalOverview(module){
  const overviewActive=module.querySelector('.at-nav-item.active[data-at-tab="overview"]');
  const view=module.querySelector("#atView");
  if(!overviewActive||!view||view.querySelector(".at-school-dashboard"))return;

  const token=++overviewToken;
  topbar(module,"Visão geral","Gestão de frequência escolar");
  view.innerHTML='<section class="at-school-loading"><span></span><strong>Organizando dados de frequência...</strong></section>';

  const c=client();
  if(!c){
    view.innerHTML='<section class="at-school-empty"><strong>Dados indisponíveis</strong><span>Não foi possível acessar o Supabase neste momento.</span></section>';
    return;
  }
  const {data,error}=await c.from(TABLE).select("*").order("absence_date",{ascending:false}).order("created_at",{ascending:false});
  if(token!==overviewToken||!module.isConnected)return;
  if(error){
    console.error("Atestados painel escolar:",error);
    view.innerHTML='<section class="at-school-empty"><strong>Não foi possível carregar a visão escolar</strong><span>Os registros continuam disponíveis na aba Registros.</span><button class="at-btn" type="button" data-at-tab="records">Abrir registros</button></section>';
    return;
  }

  const rows=data||[];
  const today=isoToday();
  const last7=daysAgoIso(6);
  const month=monthKey();
  const todayRows=rows.filter(r=>r.absence_date===today);
  const weekRows=rows.filter(r=>r.absence_date&&r.absence_date>=last7&&r.absence_date<=today);
  const monthRows=rows.filter(r=>String(r.absence_date||"").startsWith(month));
  const classItems=countBy(monthRows.length?monthRows:rows,r=>r.class_name);
  const reasonItems=countBy(monthRows.length?monthRows:rows,r=>reasonType(r.reason));
  const affectedClasses=new Set(monthRows.map(r=>r.class_name).filter(Boolean)).size;
  const avgRate=monthRows.length?monthRows.reduce((s,r)=>s+num(r.justified_rate),0)/monthRows.length:0;
  const leader=classItems[0];
  const monthBase=monthRows.length?monthRows.length:rows.length;

  const pageHead=module.querySelector(".at-page-head");
  const heading=pageHead?.querySelector(".at-heading");
  if(heading){
    const h1=heading.querySelector("h1");
    const p=heading.querySelector("p");
    if(h1)h1.textContent="Gestão de Atestados";
    if(p)p.textContent="Acompanhamento de faltas justificadas para direção, secretaria e professores.";
  }

  view.innerHTML=
    '<section class="at-school-dashboard">'
    +'<section class="at-school-hero">'
      +'<div class="at-school-hero-copy"><span class="at-school-eyebrow">CENTRAL DE FREQUÊNCIA</span><h2>Panorama escolar</h2><p>Visão consolidada das ausências justificadas, com foco no que precisa de atenção hoje.</p><div class="at-school-hero-meta"><span>'+fmt(today)+'</span><span>Dados em tempo real</span></div></div>'
      +'<div class="at-school-hero-actions">'
        +(module.querySelector('[data-at-tab="new"]')?'<button class="at-school-primary" type="button" data-at-new>'+icon("plus")+'<span>Novo registro</span></button>':"")
        +'<button class="at-school-secondary" type="button" data-at-tab="records">'+icon("search")+'<span>Consultar</span></button>'
      +'</div>'
    +'</section>'

    +'<section class="at-school-kpis">'
      +'<article><span class="at-school-kpi-icon">'+icon("calendar")+'</span><div><small>Hoje</small><strong>'+todayRows.length+'</strong><p>faltas justificadas</p></div></article>'
      +'<article><span class="at-school-kpi-icon">'+icon("clock")+'</span><div><small>Últimos 7 dias</small><strong>'+weekRows.length+'</strong><p>registros no período</p></div></article>'
      +'<article><span class="at-school-kpi-icon">'+icon("users")+'</span><div><small>Turmas no mês</small><strong>'+affectedClasses+'</strong><p>com ocorrências</p></div></article>'
      +'<article><span class="at-school-kpi-icon">'+icon("chart")+'</span><div><small>Taxa média informada</small><strong>'+avgRate.toFixed(1).replace(".",",")+'%</strong><p>nos registros do mês</p></div></article>'
    +'</section>'

    +'<section class="at-school-grid">'
      +'<article class="at-school-panel at-school-recent">'
        +'<header><div><span class="at-school-section-label">MOVIMENTAÇÃO RECENTE</span><h3>Últimos registros</h3><p>Ausências justificadas adicionadas mais recentemente.</p></div><button type="button" data-at-tab="records">Ver todos</button></header>'
        +(rows.length?'<div class="at-school-records">'+rows.slice(0,5).map(recordCard).join("")+'</div>':'<div class="at-school-empty compact"><strong>Nenhum registro cadastrado</strong><span>Quando uma falta for justificada, ela aparecerá aqui.</span></div>')
      +'</article>'

      +'<aside class="at-school-column">'
        +'<article class="at-school-panel at-school-actions"><header><div><span class="at-school-section-label">ATALHOS</span><h3>Ações da gestão</h3></div></header><div class="at-school-action-list">'
          +(module.querySelector('[data-at-tab="new"]')?quickAction("plus","Registrar ausência","Cadastrar uma falta justificada","data-at-new"):"")
          +quickAction("search","Consultar registros","Localizar aluno, turma ou motivo",'data-at-tab="records"')
          +quickAction("chart","Abrir relatórios","Analisar turmas e motivos","data-at-open-report")
        +'</div></article>'
        +'<article class="at-school-panel at-school-attention"><header><div><span class="at-school-section-label">LEITURA RÁPIDA</span><h3>Situação do mês</h3></div></header><div class="at-school-attention-body">'
          +'<div class="at-school-attention-main"><span>Turma com mais registros</span><strong>'+(leader?esc(leader[0]):"Sem dados")+'</strong><small>'+(leader?leader[1]+" ocorrência"+(leader[1]===1?"":"s")+" no período":"Cadastre registros para gerar o indicador")+'</small></div>'
          +'<div class="at-school-attention-stats"><div><strong>'+monthRows.length+'</strong><span>registros no mês</span></div><div><strong>'+affectedClasses+'</strong><span>turmas afetadas</span></div></div>'
        +'</div></article>'
      +'</aside>'
    +'</section>'

    +'<section class="at-school-insights">'
      +'<article class="at-school-panel"><header><div><span class="at-school-section-label">POR TURMA</span><h3>Concentração de ocorrências</h3><p>Distribuição dos registros no período atual.</p></div></header>'+bars(classItems,monthBase,7)+'</article>'
      +'<article class="at-school-panel"><header><div><span class="at-school-section-label">POR MOTIVO</span><h3>Tipos de justificativa</h3><p>Classificação automática a partir do motivo informado.</p></div></header>'+bars(reasonItems,monthBase,6)+'</article>'
    +'</section>'
    +'</section>';

  view.querySelector("[data-at-open-report]")?.addEventListener("click",()=>module.querySelector("[data-at-report]")?.click());
}

async function renderReports(module,button){
  overviewToken++;
  module.querySelectorAll(".at-nav-item").forEach(x=>x.classList.remove("active"));
  button.classList.add("active");
  topbar(module,"Relatórios","Indicadores de frequência e ausências");
  const view=module.querySelector("#atView");
  if(!view)return;
  view.innerHTML='<section class="at-report-loading">Carregando indicadores escolares...</section>';
  const c=client();
  if(!c){view.innerHTML='<div class="at-school-empty"><strong>Supabase indisponível</strong></div>';return}
  const {data,error}=await c.from(TABLE).select("*").order("absence_date",{ascending:false});
  if(error){view.innerHTML='<div class="at-school-empty"><strong>Não foi possível carregar os relatórios</strong></div>';return}
  reportRows=data||[];

  const byClass=countBy(reportRows,r=>r.class_name);
  const byType=countBy(reportRows,r=>reasonType(r.reason));
  const month=monthKey();
  const monthRows=reportRows.filter(r=>String(r.absence_date||"").startsWith(month));
  const todayRows=reportRows.filter(r=>r.absence_date===isoToday());
  const avgRate=monthRows.length?monthRows.reduce((s,r)=>s+num(r.justified_rate),0)/monthRows.length:0;

  view.innerHTML=
    '<section class="at-report-head"><div><span class="at-school-section-label">RELATÓRIOS ESCOLARES</span><h2>Indicadores de frequência</h2><p>Consolidação dos atestados registrados no sistema.</p></div><button class="at-btn" type="button" data-at-export>Exportar CSV</button></section>'
    +'<section class="at-report-metrics"><article><small>Total acumulado</small><strong>'+reportRows.length+'</strong><span>faltas justificadas</span></article><article><small>Mês atual</small><strong>'+monthRows.length+'</strong><span>registros</span></article><article><small>Hoje</small><strong>'+todayRows.length+'</strong><span>ocorrências</span></article><article><small>Taxa média informada</small><strong>'+avgRate.toFixed(1).replace(".",",")+'%</strong><span>no mês</span></article></section>'
    +'<section class="at-report-grid"><article class="at-school-panel"><header><div><span class="at-school-section-label">TURMAS</span><h3>Faltas justificadas por turma</h3></div></header>'+bars(byClass,reportRows.length,12)+'</article><article class="at-school-panel"><header><div><span class="at-school-section-label">JUSTIFICATIVAS</span><h3>Distribuição por motivo</h3></div></header>'+bars(byType,reportRows.length,8)+'</article></section>';

  view.querySelector("[data-at-export]")?.addEventListener("click",exportCsv);
}

function exportCsv(){
  const head=["Aluno","Turma","Data","Motivo","Projeto","Taxa justificada"];
  const lines=[head,...reportRows.map(r=>[r.student_name,r.class_name,fmt(r.absence_date),r.reason,r.project_name||"",r.justified_rate])]
    .map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(";"));
  const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="relatorio-atestados.csv";
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),500);
}

function enhanceFilters(module){
  const card=module.querySelector(".at-records-card");
  const toolbar=card?.querySelector(".at-toolbar");
  if(!toolbar||toolbar.dataset.figmaFilters==="1")return;
  toolbar.dataset.figmaFilters="1";

  const date=document.createElement("input");
  date.type="date";
  date.className="at-input at-date-filter";
  date.setAttribute("aria-label","Filtrar por data");
  toolbar.appendChild(date);

  const advanced=document.createElement("button");
  advanced.type="button";
  advanced.className="at-btn at-advanced-toggle";
  advanced.textContent="Filtros avançados";
  toolbar.appendChild(advanced);

  const panel=document.createElement("div");
  panel.className="at-advanced-filters";
  panel.hidden=true;
  panel.innerHTML='<input class="at-input" data-at-reason-filter placeholder="Motivo da ausência"><input class="at-input" data-at-project-filter placeholder="Projeto">';
  toolbar.after(panel);

  function apply(){
    const d=date.value;
    const reason=String(panel.querySelector("[data-at-reason-filter]").value||"").toLowerCase();
    const project=String(panel.querySelector("[data-at-project-filter]").value||"").toLowerCase();
    card.querySelectorAll("tbody tr").forEach(tr=>{
      const text=tr.textContent.toLowerCase();
      const cells=tr.querySelectorAll("td");
      const rowDate=cells[2]?.textContent||"";
      const expected=d?new Date(d+"T12:00:00").toLocaleDateString("pt-BR"):"";
      tr.hidden=!!((expected&&rowDate!==expected)||(reason&&!text.includes(reason))||(project&&!text.includes(project)));
    });
  }
  date.addEventListener("change",apply);
  panel.addEventListener("input",apply);
  advanced.addEventListener("click",()=>{panel.hidden=!panel.hidden;advanced.classList.toggle("active",!panel.hidden)});
}

function scan(){
  document.querySelectorAll(".ete-atestados").forEach(module=>{
    addReportTab(module);
    enhanceFilters(module);
    renderProfessionalOverview(module);
  });
}

const observer=new MutationObserver(scan);
function start(){scan();if(document.body)observer.observe(document.body,{childList:true,subtree:true})}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
})();
