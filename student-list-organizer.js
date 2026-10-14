(function initStudentListOrganizer(){
  "use strict";

  const PAGE_SIZE=40;
  const state=window.ETEStudentRosterState||{course:"all",year:"all",room:"all",sort:"az",shown:PAGE_SIZE};
  state.course=state.course||"all";
  state.year=state.year||"all";
  state.room=state.room||"all";
  state.sort=state.sort||"az";
  state.shown=Math.max(PAGE_SIZE,Number(state.shown||PAGE_SIZE));
  window.ETEStudentRosterState=state;

  let mounted=false;
  let statusQueued=false;
  let loadMoreObserver=null;

  function filterCount(){
    let count=0;
    if(state.course!=="all")count++;
    if(state.year!=="all")count++;
    if(state.room!=="all")count++;
    if(state.sort!=="az")count++;
    return count;
  }

  function updateFilterBadge(){
    const badge=document.querySelector(".student-filter-badge");
    if(!badge)return;
    const count=filterCount();
    badge.hidden=count===0;
    badge.textContent=String(count);
  }

  function updateStatus(){
    statusQueued=false;
    const rows=document.getElementById("studentRows");
    const count=document.getElementById("studentListCount");
    const more=document.getElementById("studentLoadMore");
    if(!rows)return;

    const visible=Number(rows.dataset.studentRenderedCount||rows.querySelectorAll(".student-card").length||0);
    const filtered=Number(rows.dataset.studentFilteredCount||visible);
    const total=Number(rows.dataset.studentTotalCount||(Array.isArray(students)?students.length:0));
    const hasMore=rows.dataset.studentHasMore==="1";

    if(count){
      count.innerHTML=`Exibindo <strong>${visible}</strong> de <strong>${filtered}</strong> resultado${filtered===1?"":"s"} · ${total} alunos cadastrados`;
    }
    if(more){
      more.hidden=!hasMore;
      const remaining=Math.max(0,filtered-visible);
      more.textContent=remaining>PAGE_SIZE?`Mostrar mais ${PAGE_SIZE}`:`Mostrar mais ${remaining}`;
    }
    updateFilterBadge();
  }

  function queueStatus(){
    if(statusQueued)return;
    statusQueued=true;
    requestAnimationFrame(updateStatus);
  }

  function renderRoster(resetShown){
    if(resetShown)state.shown=PAGE_SIZE;
    try{
      if(typeof renderStudents==="function")renderStudents();
    }finally{
      queueStatus();
    }
  }

  function closePopover(){
    const pop=document.getElementById("studentFilterPopover");
    const button=document.getElementById("studentFilterButton");
    if(pop)pop.classList.remove("is-open");
    if(button)button.setAttribute("aria-expanded","false");
  }

  function togglePopover(){
    const pop=document.getElementById("studentFilterPopover");
    const button=document.getElementById("studentFilterButton");
    if(!pop||!button)return;
    const open=!pop.classList.contains("is-open");
    pop.classList.toggle("is-open",open);
    button.setAttribute("aria-expanded",String(open));
  }

  function resetFilters(){
    Object.assign(state,{course:"all",year:"all",room:"all",sort:"az",shown:PAGE_SIZE});
    document.querySelectorAll("[data-student-filter]").forEach(select=>{
      const key=select.dataset.studentFilter;
      if(key in state)select.value=state[key];
    });
    window.ETECustomSelect?.sync?.();
    renderRoster(false);
  }

  function mountControls(){
    if(mounted)return;
    const toolbar=document.querySelector("#page-students .student-toolbar");
    const search=document.getElementById("studentSearch");
    const rows=document.getElementById("studentRows");
    if(!toolbar||!search||!rows)return;

    ["newStudentBtn","newStudentBtn2","newStudentFromRequest"].forEach(id=>{
      const button=document.getElementById(id);
      if(!button)return;
      button.hidden=true;
      button.classList.add("role-hidden");
      button.setAttribute("aria-hidden","true");
      button.tabIndex=-1;
    });

    const page=document.getElementById("page-students");
    const description=page?.querySelector(".pagehead p");
    if(description)description.textContent="Consulte os alunos por nome, turma ou curso sem carregar toda a listagem de uma vez.";

    const wrap=document.createElement("div");
    wrap.className="student-filter-wrap";
    wrap.innerHTML=`
      <button type="button" class="student-filter-button" id="studentFilterButton" aria-label="Abrir filtros de alunos" title="Filtros de alunos" aria-expanded="false" aria-controls="studentFilterPopover">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
        <span class="student-filter-label">Filtros</span>
        <span class="student-filter-badge" hidden>0</span>
      </button>
      <div class="student-filter-popover" id="studentFilterPopover" role="dialog" aria-label="Filtros de alunos">
        <div class="student-filter-head"><div><strong>Filtrar alunos</strong><small>Os filtros pesquisam toda a listagem, mesmo os alunos que ainda não foram exibidos.</small></div></div>
        <div class="student-filter-grid">
          <label class="student-filter-field">Curso
            <select data-student-filter="course"><option value="all">Todos</option><option value="DS">DS</option><option value="EDF">EDF</option><option value="GTU">GTU</option></select>
          </label>
          <label class="student-filter-field">Turma / ano
            <select data-student-filter="year"><option value="all">Todas</option><option value="1">1º ano</option><option value="2">2º ano</option><option value="3">3º ano</option></select>
          </label>
          <label class="student-filter-field">Sala
            <select data-student-filter="room"><option value="all">Todas</option><option value="A">Sala A</option><option value="B">Sala B</option><option value="GTU">GTU</option></select>
          </label>
          <label class="student-filter-field">Ordem
            <select data-student-filter="sort"><option value="az">A → Z</option><option value="za">Z → A</option><option value="recent">Uso mais recente</option></select>
          </label>
        </div>
        <div class="student-filter-footer"><button type="button" class="student-filter-reset" id="studentFilterReset">Limpar filtros</button><small>40 alunos são exibidos por vez para manter a página leve.</small></div>
      </div>`;
    toolbar.append(wrap);

    const status=document.createElement("div");
    status.className="student-list-status";
    status.innerHTML='<span id="studentListCount"></span><button type="button" class="student-load-more" id="studentLoadMore" hidden>Mostrar mais</button>';
    toolbar.insertAdjacentElement("afterend",status);

    const sentinel=document.createElement("div");
    sentinel.id="studentListSentinel";
    sentinel.className="student-list-sentinel";
    sentinel.setAttribute("aria-hidden","true");
    rows.insertAdjacentElement("afterend",sentinel);

    if("IntersectionObserver" in window){
      loadMoreObserver=new IntersectionObserver(entries=>{
        if(!entries.some(entry=>entry.isIntersecting))return;
        if(rows.dataset.studentHasMore!=="1")return;
        state.shown+=PAGE_SIZE;
        renderRoster(false);
      },{root:null,rootMargin:"500px 0px 500px 0px",threshold:0});
      loadMoreObserver.observe(sentinel);
    }

    document.getElementById("studentFilterButton")?.addEventListener("click",event=>{event.stopPropagation();togglePopover();});
    document.getElementById("studentFilterPopover")?.addEventListener("click",event=>event.stopPropagation());
    document.getElementById("studentFilterReset")?.addEventListener("click",resetFilters);
    document.getElementById("studentLoadMore")?.addEventListener("click",()=>{
      state.shown+=PAGE_SIZE;
      renderRoster(false);
    });

    document.querySelectorAll("[data-student-filter]").forEach(select=>select.addEventListener("change",()=>{
      const key=select.dataset.studentFilter;
      if(key in state)state[key]=select.value;
      renderRoster(true);
    }));

    search.addEventListener("input",()=>{state.shown=PAGE_SIZE;});
    document.addEventListener("click",closePopover);
    document.addEventListener("keydown",event=>{if(event.key==="Escape")closePopover();});

    mounted=true;
    queueStatus();
  }

  function wrapRender(){
    if(typeof renderStudents!=="function"||renderStudents.__studentOrganizerWrapped)return;
    const base=renderStudents;
    const wrapped=function(){
      const result=base.apply(this,arguments);
      queueStatus();
      try{
        const rows=document.getElementById("studentRows");
        window.dispatchEvent(new CustomEvent("student-list-updated",{detail:{
          visible:Number(rows?.dataset.studentRenderedCount||0),
          filtered:Number(rows?.dataset.studentFilteredCount||0)
        }}));
      }catch(_){}
      return result;
    };
    wrapped.__studentOrganizerWrapped=true;
    renderStudents=wrapped;
  }

  function ensureCollapsibleAssets(){
    if(!document.getElementById("controlStudentCollapsibleListStyles")){
      const link=document.createElement("link");
      link.id="controlStudentCollapsibleListStyles";
      link.rel="stylesheet";
      link.href="student-collapsible-list.css?v=5";
      document.head.appendChild(link);
    }
    if(!document.getElementById("controlStudentCollapsibleListScript")){
      const script=document.createElement("script");
      script.id="controlStudentCollapsibleListScript";
      script.src="student-collapsible-list.js?v=3";
      script.async=false;
      script.defer=true;
      document.head.appendChild(script);
    }
  }

  function install(){
    ensureCollapsibleAssets();
    mountControls();
    wrapRender();
    queueStatus();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();

  window.addEventListener("pageshow",queueStatus);
  window.addEventListener("student-roster-rendered",queueStatus);
  window.addEventListener("control-theme-change",queueStatus);
})();
